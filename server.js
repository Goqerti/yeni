// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const fileStore = require('./services/fileStore');
const apiRoutes = require('./routes/api');
const userController = require('./controllers/userController');
const { requireLogin, requireOwnerRole, requireFinanceOrOwner } = require('./middleware/authMiddleware');
const { startBackupSchedule } = require('./services/telegramBackupService');
const { startAllTasks } = require('./services/scheduledTasksService');
const { initializeBotListeners } = require('./services/telegramService');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Session Middleware ---
const sessionParser = session({
    secret: process.env.SESSION_SECRET || 'super-gizli-ve-unikal-acar-sozunuzu-bura-yazin-mutləq-dəyişin!',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
});

// --- General Middleware ---
app.use(sessionParser);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Fayl Yükləmə Üçün Multer Konfiqurasiyası (Yaddaşda saxlama) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Səhifə Marşrutları ---
app.post('/login', userController.login);
app.get('/logout', userController.logout);

app.get('/', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/users', requireLogin, requireOwnerRole, (req, res) => res.sendFile(path.join(__dirname, 'public', 'users.html')));
app.get('/finance', requireLogin, requireFinanceOrOwner, (req, res) => res.sendFile(path.join(__dirname, 'public', 'finance.html')));
app.get('/finance-reports', requireLogin, requireFinanceOrOwner, (req, res) => res.sendFile(path.join(__dirname, 'public', 'finance-reports.html')));
app.get('/inventory', requireLogin, requireFinanceOrOwner, (req, res) => res.sendFile(path.join(__dirname, 'public', 'inventory.html')));
app.get('/finance-expense-search', requireLogin, requireFinanceOrOwner, (req, res) => res.sendFile(path.join(__dirname, 'public', 'finance-expense-search.html')));

// --- API Marşrutları ---
app.use('/api', apiRoutes);

// Fayl Yükləmə üçün Xüsusi API Endpoint (freeimage.host ilə)
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
            headers: form.getHeaders(),
        });

        if (response.data.status_code !== 200 || !response.data.image || !response.data.image.url) {
            console.error("FreeImage API-dan gələn cavabda problem var:", response.data);
            throw new Error(`FreeImage API xətası: ${response.data.status_txt || 'Bilinməyən xəta'}`);
        }

        const imageUrl = response.data.image.url;

        const logEntry = {
            timestamp: new Date().toISOString(),
            path: imageUrl,
            uploadedBy: req.session.user.displayName
        };
        fileStore.appendToPhotoTxt(logEntry);

        res.json({ filePath: imageUrl });

    } catch (error) {
        console.error("FreeImage API xətası:", error);
        res.status(500).json({ message: 'Fayl xarici servisə yüklənərkən xəta baş verdi.' });
    }
});


// --- Serverin Başladılması ---
const initializeApp = () => {
    const filesToInit = ['sifarişlər.txt', 'users.txt', 'permissions.json', 'chat_history.txt', 'xərclər.txt', 'inventory.txt', 'audit_log.txt', 'photo.txt'];
    filesToInit.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, file.endsWith('.json') ? '{}' : '', 'utf-8');
            console.log(`Yaradıldı: ${file}`);
        }
    });
};

const server = app.listen(PORT, () => {
    initializeApp();
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});

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

// --- Servislərin İşə Salınması ---
const PING_URL = process.env.RENDER_EXTERNAL_URL;
if (PING_URL) {
    setInterval(() => {
        console.log("Pinging self to prevent sleep...");
        fetch(PING_URL).catch(err => console.error("Ping error:", err));
    }, 14 * 60 * 1000);
}
startBackupSchedule(2);
startAllTasks();
initializeBotListeners();
