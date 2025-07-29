// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const session = require('express-session');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // DÜZƏLİŞ BURADADIR
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
// ... (digər səhifə marşrutları) ...

// --- API Marşrutları ---
app.use('/api', apiRoutes);

app.post('/api/upload', requireLogin, upload.single('file'), async (req, res) => {
    // ... (mövcud upload məntiqi) ...
});

// --- İlkin Yoxlama Funksiyası ---
const initializeApp = () => {
    // ... (mövcud initializeApp məntiqi) ...
};

const server = http.createServer(app);

// --- WebSocket Server ---
const wss = new WebSocket.Server({ noServer: true });
const clients = new Map();

wss.on('connection', (ws, request) => {
    const user = request.session.user;
    if (!user) { ws.close(); return; }

    const clientId = uuidv4();
    clients.set(clientId, { ws, user });
    console.log(`${user.displayName} chat-a qoşuldu.`);
    
    const history = fileStore.getChatHistory().slice(-50);
    ws.send(JSON.stringify({ type: 'history', data: history }));

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

// --- Serverin İşə Salınması və Servislər ---
server.listen(PORT, () => {
    initializeApp();
    initializeBotListeners();
    startBackupSchedule(2);
    startAllTasks();
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});

const PING_URL = process.env.RENDER_EXTERNAL_URL;
if (PING_URL) {
    setInterval(() => {
        console.log("Pinging self to prevent sleep...");
        const protocol = PING_URL.startsWith('https') ? https : http;
        protocol.get(PING_URL, (res) => {
            console.log(`Ping status: ${res.statusCode}`);
        }).on('error', (err) => {
            console.error("Ping error:", err.message);
        });
    }, 14 * 60 * 1000);
}
