import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const LEADS_FILE = 'leads.json';
const userSessions = new Map();

// ПРОСТОЙ РАБОЧИЙ AI
function getAIResponse(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('пушкин')) {
        return { text: 'Александр Пушкин — великий русский поэт.', type: 'ai_generated' };
    }
    if (lower.includes('стул')) {
        return { text: 'Стул — мебель для сидения.', type: 'ai_generated' };
    }
    if (lower.includes('allora') || lower.includes('аллора')) {
        return { text: 'Allora — консалтинговая компания.', type: 'company_info' };
    }
    if (lower.includes('цена') || lower.includes('стоимость')) {
        return { text: 'Стоимость рассчитывается индивидуально.', type: 'services_info' };
    }
    
    return { text: `Вы: "${message}"\n\nЯ AI-помощник Allora.`, type: 'general' };
}

// API
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        version: 'v6.0 — ФИКС requiresLeadForm',
        mode: 'requiresLeadForm ВСЕГДА работает',
        message: 'Сервер работает'
    });
});

app.get('/health', (req, res) => {
    res.send('OK');
});

// ГЛАВНЫЙ ЧАТ — ФИКСИРУЕМ requiresLeadForm
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'guest_' + Date.now() } = req.body;
        
        // Инициализация
        if (!userSessions.has(sessionId)) {
            userSessions.set(sessionId, { messageCount: 0, leadCollected: false });
        }
        
        const session = userSessions.get(sessionId);
        session.messageCount += 1;
        
        // ВАЖНО: requiresLeadForm ДОЛЖЕН БЫТЬ true/false
        let requiresLeadForm = false; // по умолчанию false
        
        // После 2-го сообщения → true
        if (!session.leadCollected && session.messageCount >= 2) {
            requiresLeadForm = true;
        }
        
        // Вопрос про цену → true
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('цена') || lowerMessage.includes('стоимость')) {
            requiresLeadForm = true;
        }
        
        // AI ответ
        const aiResponse = getAIResponse(message);
        
        // Добавляем фразу
        let reply = aiResponse.text;
        if (requiresLeadForm && !session.leadCollected) {
            reply = `${reply}\n\n**🎯 ДАВАЙТЕ ПОЗНАКОМИМСЯ ПОБЛИЖЕ!**`;
        }
        
        // ОТПРАВЛЯЕМ С requiresLeadForm: true/false
        res.json({
            success: true,
            reply: reply,
            requiresLeadForm: requiresLeadForm, // ← ТЕПЕРЬ ВСЕГДА будет true/false
            type: aiResponse.type,
            sessionId: sessionId,
            messageCount: session.messageCount,
            leadCollected: session.leadCollected || false
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ 
            success: false, 
            reply: 'Ошибка сервера',
            requiresLeadForm: false 
        });
    }
});

// СОХРАНЕНИЕ КОНТАКТОВ
app.post('/api/lead', async (req, res) => {
    try {
        const { name, email, phone, sessionId } = req.body;
        
        // Обновляем сессию
        if (sessionId && userSessions.has(sessionId)) {
            userSessions.get(sessionId).leadCollected = true;
        }
        
        // Сохраняем
        const lead = { id: Date.now(), name, email, phone, sessionId, date: new Date().toISOString() };
        
        let leads = [];
        try {
            const data = await fs.readFile(LEADS_FILE, 'utf8');
            leads = JSON.parse(data);
        } catch (e) {
            leads = [];
        }
        
        leads.push(lead);
        await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
        
        res.json({
            success: true,
            message: '✅ Отлично! Продолжаем общение.',
            authorized: true
        });
        
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

// Запуск
app.listen(PORT, () => {
    console.log('🚀 Allora AI v6.0 ЗАПУЩЕН!');
    console.log('📍 Порт:', PORT);
    console.log('✅ requiresLeadForm: ФИКСИРОВАН — всегда true/false');
});
