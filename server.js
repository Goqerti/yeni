// server.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// Servisləri import edirik
const { startBackupSchedule } = require('./services/telegramBackupService');
const { startAllTasks } = require('./services/scheduledTasksService');
const { initializeBotListeners } = require('./services/telegramService');
const fileStore = require('./services/fileStore');

// Controllerləri və marşrutları import edirik
const userController = require('./controllers/userController');
const apiRoutes = require('./routes/api');
const { requireLogin, requireOwnerRole, requireFinanceOrOwner } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// --- Session Middleware ---
const sessionParser = session({
    secret: process.env.SESSION_SECRET || 'super-gizli-ve-unikal-acar-sozunuzu-bura-yazin-mutləq-dəyişin!',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
});

// --- General Middleware ---
app.use(sessionParser);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Fayl Yükləmə Üçün Multer Konfiqurasiyası ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

app.post('/api/upload', requireLogin, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Heç bir fayl yüklənmədi.' });
    }
    if (!process.env.FREEIMAGE_API_KEY) {
        return res.status(500).json({ message: 'FreeImage API açarı .env faylında təyin edilməyib.' });
    }
    try {
        const form = new FormData();
        form.append('key', process.env.FREEIMAGE_API_KEY);
        form.append('action', 'upload');
        form.append('source', req.file.buffer.toString('base64'));
        form.append('format', 'json');

        const response = await axios.post('https://freeimage.host/api/1/upload', form, {
            headers: { ...form.getHeaders() },
        });

        if (response.data.status_code !== 200 || !response.data.image || !response.data.image.url) {
            console.error("FreeImage API cavabı:", response.data);
            throw new Error(`FreeImage API xətası: ${response.data.status_txt || 'Bilinməyən xəta'}`);
        }
        const imageUrl = response.data.image.url;
        fileStore.appendToPhotoTxt({ timestamp: new Date().toISOString(), path: imageUrl, uploadedBy: req.session.user.displayName });
        res.json({ filePath: imageUrl });
    } catch (error) {
        console.error("FreeImage API xətası:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Fayl xarici servisə yüklənərkən xəta baş verdi.' });
    }
});

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

// --- Serverin və WebSocket-in Başladılması ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    sessionParser(request, {}, () => {
        if (!request.session.user) {
            socket.destroy();
            return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
});

wss.on('connection', (ws, request) => {
    const user = request.session.user;
    const clientId = uuidv4();
    clients.set(clientId, { ws, user });
    console.log(`${user.displayName} chat-a qoşuldu.`);
    
    ws.send(JSON.stringify({ type: 'history', data: fileStore.getChatHistory().slice(-50) }));

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            const messageData = {
                id: uuidv4(),
                sender: user.displayName,
                role: user.role,
                text: parsedMessage.text,
                timestamp: new Date().toISOString()
            };
            fileStore.appendToChatHistory(messageData);
            for (const client of clients.values()) {
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(JSON.stringify({ type: 'message', data: messageData }));
                }
            }
        } catch (e) {
            console.error("Gələn mesaj parse edilə bilmədi:", message);
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`${user.displayName} chat-dan ayrıldı.`);
    });
});

server.listen(PORT, () => {
    initializeApp();
    initializeBotListeners();
    startBackupSchedule(2);
    startAllTasks();
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});

// Render-i oyaq saxlamaq üçün ən yaxşı üsul xarici cron job servisidir.
// Əgər daxili həll mütləqdirsə, bu kodu aktivləşdirin.
if (process.env.NODE_ENV === 'production') {
    const PING_INTERVAL = 14 * 60 * 1000;
    const selfPingUrl = process.env.RENDER_EXTERNAL_URL;

    if (selfPingUrl) {
        setInterval(() => {
            console.log(`Pinging server at ${selfPingUrl} to keep it awake...`);
            const protocol = selfPingUrl.startsWith('https') ? https : http;
            protocol.get(selfPingUrl, (res) => {
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
