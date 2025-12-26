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
const userSessions = new Map(); // {sessionId: {messageCount: number, leadCollected: boolean}}

// AI ОТВЕТЫ
function getAIResponse(message, isSecondMessage = false) {
    const lower = message.toLowerCase();
    
    // 1. ALLORA / УСЛУГИ
    if (lower.includes('allora') || lower.includes('аллора') || 
        lower.includes('услуг') || lower.includes('компани')) {
        return {
            text: `🏢 **Allora — консалтинговая компания**\n\n` +
                  `Предоставляем профессиональные услуги:\n` +
                  `• Стратегический консалтинг\n` +
                  `• Операционный консалтинг\n` +
                  `• Финансовый консалтинг\n` +
                  `• HR-консалтинг\n` +
                  `• Технологический консалтинг\n\n` +
                  `Для получения стоимости спросите про цену.`,
            type: 'company_info'
        };
    }
    
    // 2. ЦЕНА / СТОИМОСТЬ
    if (lower.includes('цена') || lower.includes('стоимость') || 
        lower.includes('сколько стоит') || lower.includes('прайс') ||
        lower.includes('бюджет') || lower.includes('пакет')) {
        return {
            text: `💰 **Стоимость услуг Allora**\n\n` +
                  `Расчёт производится индивидуально под ваш проект.\n\n` +
                  `Для точного расчёта оставьте заявку — специалист свяжется с вами.`,
            type: 'services_info'
        };
    }
    
    // 3. ПРИВЕТСТВИЕ
    if (lower.includes('привет') || lower.includes('здравств') || lower.includes('добр')) {
        return {
            text: '👋 **Привет! Я AI Allora — ваш умный помощник!**\n\n' +
                  'Могу ответить на любые ваши вопросы, а также рассказать всё о компании Allora.',
            type: 'general'
        };
    }
    
    // 4. УМНЫЕ ОТВЕТЫ (AI)
    if (lower.includes('пушкин')) {
        return {
            text: 'Александр Сергеевич Пушкин — великий русский поэт, драматург и прозаик.',
            type: 'ai_generated'
        };
    }
    
    if (lower.includes('стул')) {
        return {
            text: 'Стул — это мебель для сидения со спинкой.',
            type: 'ai_generated'
        };
    }
    
    if (lower.includes('налог') || lower.includes('декларац')) {
        return {
            text: 'Налоговая декларация — документ для отчёта о доходах. Allora предоставляет консалтинг по налоговому планированию.',
            type: 'ai_generated'
        };
    }
    
    if (lower.includes('ремонт') || lower.includes('квартир')) {
        return {
            text: 'Ремонт квартиры включает отделочные работы. Allora консультирует по управлению строительными проектами.',
            type: 'ai_generated'
        };
    }
    
    // 5. ДЕФОЛТНЫЙ ОТВЕТ
    return {
        text: `🤔 **Вы спрашиваете:** "${message}"\n\n` +
              `Я AI-помощник компании Allora. Могу ответить на различные вопросы или рассказать о наших услугах.\n\n` +
              `Что именно вас интересует?`,
        type: 'general'
    };
}

// API ЭНДПОИНТЫ
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Allora AI работает с модальным окном',
        time: new Date().toISOString(),
        mode: 'ФИНАЛЬНАЯ v4.2 — с модальным окном',
        sessions: userSessions.size
    });
});

app.get('/health', (req, res) => {
    res.send('OK');
});

// ЧАТ API (ГЛАВНЫЙ!)
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'guest_' + Date.now() } = req.body;
        console.log('💬 [Чат]', sessionId.substring(0, 8), ':', message.substring(0, 50));
        
        // ИНИЦИАЛИЗАЦИЯ СЕССИИ
        if (!userSessions.has(sessionId)) {
            userSessions.set(sessionId, { 
                messageCount: 0, 
                leadCollected: false,
                lastActivity: new Date()
            });
            console.log(`🆕 [НОВАЯ СЕССИЯ] ${sessionId.substring(0, 8)}`);
        }
        
        const session = userSessions.get(sessionId);
        session.messageCount += 1;
        session.lastActivity = new Date();
        
        console.log(`📊 [Сообщение #${session.messageCount}] для ${sessionId.substring(0, 8)}`);
        
        // ЛОГИКА: ПОСЛЕ 2-ГО СООБЩЕНИЯ ПОКАЗЫВАЕМ ФОРМУ
        let requiresLeadForm = false;
        let isSecondMessage = false;
        
        if (!session.leadCollected && session.messageCount >= 2) {
            requiresLeadForm = true;
            isSecondMessage = true;
            console.log(`🎯 [МОДАЛЬНОЕ ОКНО] для ${sessionId.substring(0, 8)} (2+ сообщений)`);
        }
        
        // ЛОГИКА: ВОПРОС ПРО ЦЕНУ → СРАЗУ ФОРМА
        const priceKeywords = ['цена', 'стоимость', 'сколько стоит', 'прайс', 'бюджет', 'тариф'];
        const lowerMessage = message.toLowerCase();
        const isPriceRequest = priceKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (isPriceRequest && !session.leadCollected) {
            requiresLeadForm = true;
            console.log(`💰 [ЦЕНА → МОДАЛЬНОЕ ОКНО] для ${sessionId.substring(0, 8)}`);
        }
        
        // ПОЛУЧАЕМ ОТВЕТ AI
        const aiResponse = getAIResponse(message, isSecondMessage);
        
        // ДОБАВЛЯЕМ ФРАЗУ ПРО ЗНАКОМСТВО ПРИ 2-М СООБЩЕНИИ
        let finalText = aiResponse.text;
        if (isSecondMessage && !session.leadCollected) {
            finalText = `${finalText}\n\n**🎯 Отлично! Давайте познакомимся поближе для продолжения нашей беседы!**`;
        }
        
        // ОТПРАВЛЯЕМ ОТВЕТ
        res.json({
            success: true,
            reply: finalText,
            requiresLeadForm: requiresLeadForm,
            type: aiResponse.type,
            sessionId: sessionId,
            messageCount: session.messageCount,
            leadCollected: session.leadCollected,
            debug: {
                sessionIdShort: sessionId.substring(0, 8),
                needsForm: requiresLeadForm,
                collected: session.leadCollected
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка в чате:', error);
        res.status(500).json({ 
            success: false, 
            reply: 'Произошла техническая ошибка. Пожалуйста, попробуйте еще раз.' 
        });
    }
});

// СОХРАНЕНИЕ КОНТАКТОВ (работает и с /api/auth и с /api/lead)
app.post('/api/lead', async (req, res) => {
    await handleLead(req, res);
});

app.post('/api/auth', async (req, res) => {
    await handleLead(req, res);
});

async function handleLead(req, res) {
    try {
        const { name, email, phone, message, sessionId } = req.body;
        
        console.log('🎯 [НОВЫЕ КОНТАКТЫ]', { 
            name, 
            email: email ? 'есть' : 'нет', 
            phone: phone ? 'есть' : 'нет',
            sessionId: sessionId?.substring(0, 8) 
        });
        
        // ОБНОВЛЯЕМ СЕССИЮ
        if (sessionId && userSessions.has(sessionId)) {
            const session = userSessions.get(sessionId);
            session.leadCollected = true;
            console.log(`✅ [ВЕЧНЫЙ РЕЖИМ] Активирован для ${sessionId.substring(0, 8)}`);
        }
        
        // СОХРАНЯЕМ В ФАЙЛ
        const lead = {
            id: Date.now(),
            name: name || 'Не указано',
            email: email || 'Не указано',
            phone: phone || 'Не указано',
            message: message || 'Заявка через модальное окно',
            sessionId: sessionId || 'unknown',
            date: new Date().toISOString(),
            source: 'modal_form'
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
        
        // ЛОГ В КОНСОЛЬ
        console.log('📢 ==================================');
        console.log('📢 НОВЫЕ КОНТАКТЫ ЧЕРЕЗ МОДАЛЬНОЕ ОКНО!');
        console.log('📢 Имя:', lead.name);
        console.log('📢 Контакт:', lead.email || lead.phone);
        console.log('📢 Сессия:', sessionId?.substring(0, 8) || 'unknown');
        console.log('📢 ==================================');
        
        res.json({
            success: true,
            message: '✅ Отлично! Спасибо за предоставленные данные. Теперь я могу помогать вам ещё лучше. Что ещё вас интересует?',
            sessionUpdated: true,
            authorized: true,
            leadId: lead.id
        });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения контактов:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при сохранении данных. Пожалуйста, попробуйте еще раз.' 
        });
    }
}

// ЗАПУСК СЕРВЕРА
app.listen(PORT, () => {
    console.log('🚀 ============================================');
    console.log('🤖 ALLORA AI v4.2 ЗАПУЩЕН');
    console.log('📍 Порт:', PORT);
    console.log('🎯 Режим: Модальное окно для контактов');
    console.log('🎯 Логика: После 2-го сообщения → модальное окно');
    console.log('🎯 Логика: Цена → сразу модальное окно');
    console.log('🎯 Формы: /api/lead и /api/auth');
    console.log('🔗 Тест: http://localhost:' + PORT);
    console.log('🚀 ============================================');
});
