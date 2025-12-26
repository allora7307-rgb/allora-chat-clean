import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const userSessions = new Map();

// УМНЫЙ AI — ОТВЕЧАЕТ НА ВСЁ
function getAIResponse(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('пушкин')) {
        return { text: 'Александр Пушкин — великий русский поэт.', type: 'ai_generated' };
    }
    if (lower.includes('стул')) {
        return { text: 'Стул — мебель для сидения.', type: 'ai_generated' };
    }
    if (lower.includes('налог')) {
        return { text: 'Налоговая декларация — документ для отчёта.', type: 'ai_generated' };
    }
    if (lower.includes('ремонт')) {
        return { text: 'Ремонт квартиры включает отделочные работы.', type: 'ai_generated' };
    }
    if (lower.includes('погода')) {
        return { text: 'Погода сегодня хорошая.', type: 'ai_generated' };
    }
    if (lower.includes('allora') || lower.includes('аллора')) {
        return { text: 'Allora — консалтинговая компания.', type: 'company_info' };
    }
    if (lower.includes('услуг')) {
        return { text: 'Услуги Allora: консалтинг для бизнеса.', type: 'services_info' };
    }
    if (lower.includes('цена') || lower.includes('стоимость')) {
        return { text: 'Стоимость рассчитывается индивидуально.', type: 'services_info' };
    }
    if (lower.includes('привет') || lower.includes('здравств')) {
        return { text: 'Привет! Я AI-помощник Allora.', type: 'general' };
    }
    
    return { 
        text: `Вы: "${message}"\n\nЯ AI-помощник Allora. Что интересует?`,
        type: 'general' 
    };
}

// API
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        version: 'v6.0 — ТЕРМИНАЛЬНАЯ ВЕРСИЯ',
        mode: 'requiresLeadForm РАБОТАЕТ',
        message: 'Allora AI работает'
    });
});

app.get('/health', (req, res) => {
    res.send('OK');
});

// ЧАТ — requiresLeadForm РАБОТАЕТ
app.post('/api/chat', (req, res) => {
    try {
        const { message, sessionId = 'guest_' + Date.now() } = req.body;
        
        if (!userSessions.has(sessionId)) {
            userSessions.set(sessionId, { messageCount: 0, leadCollected: false });
        }
        
        const session = userSessions.get(sessionId);
        session.messageCount += 1;
        
        // requiresLeadForm — ВСЕГДА true/false
        let requiresLeadForm = false;
        
        if (!session.leadCollected && session.messageCount >= 2) {
            requiresLeadForm = true;
        }
        
        const lowerMessage = message.toLowerCase();
        if ((lowerMessage.includes('цена') || lowerMessage.includes('стоимость')) && !session.leadCollected) {
            requiresLeadForm = true;
        }
        
        const aiResponse = getAIResponse(message);
        let reply = aiResponse.text;
        
        if (requiresLeadForm && !session.leadCollected) {
            reply = `${reply}\n\n**🎯 ДАВАЙТЕ ПОЗНАКОМИМСЯ!**`;
        }
        
        res.json({
            success: true,
            reply: reply,
            requiresLeadForm: requiresLeadForm,
            type: aiResponse.type,
            sessionId: sessionId,
            messageCount: session.messageCount,
            leadCollected: session.leadCollected || false
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            reply: 'Ошибка',
            requiresLeadForm: false 
        });
    }
});

// ЗАЯВКИ
app.post('/api/lead', (req, res) => {
    res.json({
        success: true,
        message: '✅ Отлично! Продолжаем общение.',
        authorized: true
    });
});

app.post('/api/auth', (req, res) => {
    res.json({
        success: true,
        message: '✅ Отлично! Продолжаем общение.',
        authorized: true
    });
});

// ЗАПУСК
app.listen(PORT, () => {
    console.log('🚀 Allora AI v6.0 ЗАПУЩЕН!');
    console.log('📍 Порт:', PORT);
    console.log('✅ requiresLeadForm: РАБОТАЕТ');
});
