// server.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
require('dotenv').config();

// Servisləri import edirik
const telegramService = require('./services/telegramService');
const { startBackupSchedule } = require('./services/telegramBackupService');
const fileStore = require('./services/fileStore');

// Controllerləri və marşrutları import edirik
const userController = require('./controllers/userController');
const apiRoutes = require('./routes/api');
const { requireLogin, requireOwnerRole, requireFinanceOrOwner } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Render/Fly.io kimi platformalar üçün proxy ayarı
app.set('trust proxy', 1);

// --- Middleware Tənzimləmələri ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 saat
    }
}));

// --- İlkin Yoxlama Funksiyası ---
const initializeApp = () => {
    const dataDir = path.join(__dirname); 
    const filesToInit = [
        'sifarişlər.txt', 'users.txt', 'permissions.json', 'chat_history.txt', 
        'xərclər.txt', 'inventory.txt', 'audit_log.txt', 'photo.txt', 
        'transport.txt', 'tasks.txt', 'capital.txt',
        'sifarişlər_deleted.txt', 'xərclər_deleted.txt'
    ];
    filesToInit.forEach(file => {
        const filePath = path.join(dataDir, file);
        if (!fs.existsSync(filePath)) {
            let initialContent = '';
            if (file.endsWith('.json')) initialContent = '{}';
            if (file === 'capital.txt') initialContent = '{"amount":0,"currency":"AZN"}';
            
            fs.writeFileSync(filePath, initialContent, 'utf-8');
            console.log(`Yaradıldı: ${file}`);
        }
    });
};

// --- Səhifə Marşrutları ---
app.post('/login', userController.login);
app.get('/logout', userController.logout);

app.get('/', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/users', requireLogin, requireOwnerRole, (req, res) => res.sendFile(path.join(__dirname, 'public', 'users.html')));
app.get('/permissions', requireLogin, requireOwnerRole, (req, res) => res.sendFile(path.join(__dirname, 'public', 'permissions.html')));
app.get('/finance', requireLogin, requireFinanceOrOwner, (req, res) => res.sendFile(path.join(__dirname, 'public', 'finance.html')));
app.get('/finance-reports', requireLogin, requireFinanceOrOwner, (req, res) => res.sendFile(path.join(__dirname, 'public', 'finance-reports.html')));
app.get('/inventory', requireLogin, requireFinanceOrOwner, (req, res) => res.sendFile(path.join(__dirname, 'public', 'inventory.html')));
app.get('/finance-expense-search', requireLogin, requireFinanceOrOwner, (req, res) => res.sendFile(path.join(__dirname, 'public', 'finance-expense-search.html')));
app.get('/transport', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'transport.html')));
app.get('/tasks', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'tasks.html')));

// --- API Marşrutları ---
app.use('/api', apiRoutes);

// --- Serverin və WebSocket-in Başladılması ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    const chatHistory = fileStore.getChatHistory();
    if (chatHistory && chatHistory.length > 0) {
        ws.send(JSON.stringify({ type: 'history', data: chatHistory }));
    }

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        const chatEntry = {
            id: Date.now().toString(),
            sender: "User", // Bu hissə gələcəkdə istifadəçi sessiyası ilə əlaqələndirilməlidir
            text: parsedMessage.text,
            timestamp: new Date().toISOString()
        };
        fileStore.appendToChatHistory(chatEntry);
        
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'message', data: chatEntry }));
            }
        });
    });
});

// --- Render Oyaq Saxlama Məntiqi ---
// Bu kod yalnız server mühitində (NODE_ENV=production) işləyəcək
if (process.env.NODE_ENV === 'production') {
    const PING_INTERVAL = 14 * 60 * 1000; // 14 dəqiqə
    const selfPingUrl = process.env.RENDER_EXTERNAL_URL;

    if (selfPingUrl) {
        setInterval(() => {
            console.log(`Pinging server at ${selfPingUrl} to keep it awake...`);
            http.get(selfPingUrl, (res) => {
                if (res.statusCode === 200) {
                    console.log('Ping successful.');
                } else {
                    console.error(`Ping failed with status code: ${res.statusCode}`);
                }
            }).on('error', (err) => {
                console.error('Ping error:', err.message);
            });
        }, PING_INTERVAL);
    } else {
        console.warn('RENDER_EXTERNAL_URL not set. Self-pinging is disabled.');
    }
}

server.listen(PORT, () => {
    initializeApp();
    startBackupSchedule(2); // Hər 2 dəqiqədən bir yedəkləmə
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});
