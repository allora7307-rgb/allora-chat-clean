import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const LEADS_FILE = 'leads.json';
const userSessions = new Map();

// AI ОТВЕТЫ
function getAIResponse(message) {
    const lower = message.toLowerCase();
    
    // 1. ALLORA
    if (lower.includes('allora') || lower.includes('аллора')) {
        return {
            text: `🏢 **Allora — консалтинговая компания**\n\n` +
                  `Профессиональные услуги для бизнеса.`,
            type: 'company_info'
        };
    }
    
    // 2. ЦЕНА
    if (lower.includes('цена') || lower.includes('стоимость') || lower.includes('сколько стоит')) {
        return {
            text: `💰 **Стоимость услуг Allora**\n\n` +
                  `Расчёт индивидуально. Оставьте заявку для консультации.`,
            type: 'services_info'
        };
    }
    
    // 3. AI ОТВЕТЫ
    if (lower.includes('пушкин')) {
        return {
            text: 'Александр Пушкин — великий русский поэт.',
            type: 'ai_generated'
        };
    }
    
    if (lower.includes('стул')) {
        return {
            text: 'Стул — мебель для сидения.',
            type: 'ai_generated'
        };
    }
    
    // 4. ОБЩЕЕ
    return {
        text: `🤖 Вы: "${message}"\n\n` +
              `Я AI-помощник Allora. Чем могу помочь?`,
        type: 'general'
    };
}

// API
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Allora AI работает!',
        mode: 'v5.0 — ФИНАЛЬНЫЙ ФИКС: requiresLeadForm ВСЕГДА после 2 сообщений',
        version: '5.0'
    });
});

app.get('/health', (req, res) => {
    res.send('OK');
});

// ОСНОВНОЙ ЧАТ — УПРОЩЁННЫЙ И РАБОЧИЙ
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'guest_' + Date.now() } = req.body;
        
        // ИНИЦИАЛИЗАЦИЯ СЕССИИ
        if (!userSessions.has(sessionId)) {
            userSessions.set(sessionId, { 
                messageCount: 0, 
                leadCollected: false 
            });
        }
        
        const session = userSessions.get(sessionId);
        session.messageCount += 1;
        
        // ВАЖНО: requiresLeadForm = true после 2-го сообщения ИЛИ при цене
        let requiresLeadForm = false;
        
        // 1. После 2-го сообщения — ВСЕГДА форма
        if (!session.leadCollected && session.messageCount >= 2) {
            requiresLeadForm = true;
            console.log(`🎯 [ФОРМА] 2-е сообщение для ${sessionId.substring(0, 8)}`);
        }
        
        // 2. Вопрос про цену — ВСЕГДА форма
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('цена') || lowerMessage.includes('стоимость') || 
            lowerMessage.includes('сколько стоит')) {
            requiresLeadForm = true;
            console.log(`💰 [ЦЕНА → ФОРМА] для ${sessionId.substring(0, 8)}`);
        }
        
        // AI ОТВЕТ
        const aiResponse = getAIResponse(message);
        let reply = aiResponse.text;
        
        // Добавляем фразу про знакомство
        if (requiresLeadForm && !session.leadCollected) {
            reply = `${reply}\n\n**🎯 ОЙ, ДАВАЙТЕ ПОЗНАКОМИМСЯ ПОБЛИЖЕ!**`;
        }
        
        // ВАЖНО: Отправляем requiresLeadForm КАК TRUE
        res.json({
            success: true,
            reply: reply,
            requiresLeadForm: requiresLeadForm, // ← ТЕПЕРЬ ВСЕГДА ПРАВИЛЬНО
            type: aiResponse.type,
            sessionId: sessionId,
            messageCount: session.messageCount,
            leadCollected: session.leadCollected
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ 
            success: false, 
            reply: 'Ошибка сервера' 
        });
    }
});

// СОХРАНЕНИЕ КОНТАКТОВ
app.post('/api/lead', async (req, res) => {
    try {
        const { name, email, phone, sessionId } = req.body;
        
        console.log('🎯 [КОНТАКТЫ] от:', name, email, phone);
        
        // Обновляем сессию
        if (sessionId && userSessions.has(sessionId)) {
            userSessions.get(sessionId).leadCollected = true;
        }
        
        // Сохраняем
        const lead = {
            id: Date.now(),
            name: name || 'Не указано',
            email: email || 'Не указано',
            phone: phone || 'Не указано',
            sessionId: sessionId || 'unknown',
            date: new Date().toISOString()
        };
        
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
            message: '✅ Отлично! Теперь можем продолжить общение. Что вас интересует?',
            authorized: true
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка' 
        });
    }
});

// Запуск
app.listen(PORT, () => {
    console.log('🚀 Allora AI v5.0 запущен!');
    console.log('📍 Порт:', PORT);
    console.log('🎯 requiresLeadForm: ВСЕГДА после 2 сообщений или при цене');
});
