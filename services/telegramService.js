// services/telegramService.js
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const logChatId = process.env.TELEGRAM_CHAT_ID_LOGS; // Bildirişlər üçün
const backupChatId = process.env.TELEGRAM_CHAT_ID_BACKUPS; // Yedəkləmələr üçün

let bot;

if (token && logChatId) {
    bot = new TelegramBot(token, { polling: true });
    console.log("✅ Telegram Bot service is active and listening for messages.");
} else {
    console.warn("⚠️ Telegram Bot service is not active because bot token or log chat ID is not configured in .env file.");
}

/**
 * Log mesajını standart formata salır.
 * @param {object} user - Sessiyadakı istifadəçi obyekti.
 * @param {string} action - İstifadəçinin etdiyi hərəkətin təsviri.
 * @returns {string} - HTML formatında hazırlanmış mesaj.
 */
const formatLog = (user, action) => {
    const now = new Date();
    const date = now.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    return `
❗Diqqət:
🚹 İstifadəçi: ${user.displayName} (${user.role})
⏳ Tarix: ${date}
⏳ Saat: ${time}
📝 Hərəkət: ${action}
    `;
};

/**
 * Formatlanmış log mesajını Telegram-a göndərir.
 * @param {string} message - `formatLog` funksiyasından qayıdan mesaj.
 */
const sendLog = (message) => {
    if (!bot || !logChatId) return;
    bot.sendMessage(logChatId, message, { parse_mode: 'HTML' }).catch(error => {
        console.error("Error sending log to Telegram:", error.code, error.response?.body);
    });
};

/**
 * Sadə, formatlanmış mətni (başlıqsız) Telegram-a göndərir.
 * @param {string} message - Göndəriləcək mesaj.
 */
const sendSimpleMessage = (message) => {
    if (!bot || !logChatId) return;
    bot.sendMessage(logChatId, message, { parse_mode: 'HTML' }).catch(error => {
        console.error("Error sending simple message to Telegram:", error.code, error.response?.body);
    });
};

/**
 * Bota gələn şəkilləri və mesajları dinləyən əsas funksiya.
 */
const initializeBotListeners = () => {
    if (!bot) return;
    // Bot dinləmə məntiqi gələcəkdə bura əlavə edilə bilər
    // Məsələn, interaktiv əmrlər üçün:
    // bot.onText(/\/sifaris_axtar (.+)/, (msg, match) => { /* ... */ });
};

module.exports = {
    bot,
    logChatId,
    backupChatId,
    formatLog,
    sendLog,
    sendSimpleMessage,
    initializeBotListeners
};
