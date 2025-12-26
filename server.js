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

// ВСТРОЕННЫЙ AI
function getAIResponse(message) {
    const lower = message.toLowerCase();
    
    // 1. ВОПРОСЫ ПРО СТОИМОСТЬ/ПАКЕТ → ЗАЯВКА
    if (lower.includes('цена') || lower.includes('стоимость') || 
        lower.includes('сколько стоит') || lower.includes('прайс') ||
        lower.includes('бюджет') || lower.includes('пакет услуг') ||
        lower.includes('заявк') || lower.includes('заказ')) {
        
        return `💰 **Стоимость услуг Allora**

Расчёт производится индивидуально под каждый проект.

🎯 **ОСТАВЬТЕ ЗАЯВКУ — МЫ ПЕРЕЗВОНИМ И ПРОКОНСУЛЬТИРУЕМ!**

Наш специалист свяжется для детального просчёта.`;
    }
    
    // 2. ВОПРОСЫ ПРО ALLORA/КОМПАНИЮ
    if (lower.includes('allora') || lower.includes('аллора') || 
        lower.includes('компани') || lower.includes('услуг')) {
        
        return `🏢 **Allora — консалтинговая компания**

Специализируемся на:
• Стратегическом консалтинге
• Операционном консалтинге
• Финансовом консалтинге
• HR-консалтинге
• Технологическом консалтинге

Для получения стоимости — спросите про цену или оставьте заявку.`;
    }
    
    // 3. КОНТАКТЫ
    if (lower.includes('контакт') || lower.includes('телефон') || 
        lower.includes('почта') || lower.includes('email')) {
        
        return `📞 **Контакты Allora:**

• Email: consulting@allora.ai
• Телефон: +7 (495) XXX-XX-XX
• Сайт: https://allora-consulting.ai

Быстрее всего — оставьте заявку в чате, мы перезвоним в течение 2 часов!`;
    }
    
    // 4. ПРИВЕТСТВИЕ
    if (lower.includes('привет') || lower.includes('здравств')) {
        return '👋 Здравствуйте! Я AI-помощник компании Allora. Задавайте любые вопросы!';
    }
    
    // 5. ДАТА/ВРЕМЯ
    if (lower.includes('день') || lower.includes('дата') || lower.includes('месяц') || lower.includes('время')) {
        const now = new Date();
        return `📅 Сегодня ${now.getDate()} ${now.toLocaleString('ru-RU', { month: 'long' })} ${now.getFullYear()} года`;
    }
    
    // 6. УНИВЕРСАЛЬНЫЙ AI - ОТВЕЧАЕТ НА ЛЮБЫЕ ВОПРОСЫ
    if (lower.includes('пушкин') || lower.includes('писатель')) {
        return 'Александр Сергеевич Пушкин — великий русский поэт, драматург и прозаик. Кстати, Allora консультирует по вопросам корпоративной культуры и коммуникаций!';
    }
    
    if (lower.includes('стул')) {
        return 'Стул — это мебель для сидения со спинкой. Allora помогает оптимизировать рабочие пространства для повышения эффективности!';
    }
    
    if (lower.includes('погода')) {
        return 'Погода сегодня хорошая для бизнеса! Если нужна консультация по развитию компании — обращайтесь к Allora.';
    }
    
    if (lower.includes('ии') || lower.includes('искусственный интеллект')) {
        return 'Искусственный интеллект — технология создания умных систем. Allora консультирует по внедрению AI в бизнес-процессы!';
    }
    
    if (lower.includes('маркетинг')) {
        return 'Маркетинг — это деятельность по продвижению товаров и услуг. Allora предоставляет консалтинг по маркетинговым стратегиям!';
    }
    
    // 7. ДЕФОЛТНЫЙ УМНЫЙ ОТВЕТ
    return `🤔 **Вы спрашиваете:** "${message}"

Я AI-помощник компании **Allora** — консалтинговой компании.

Могу:
1. Ответить на любые вопросы (история, наука, бизнес и т.д.)
2. Рассказать об услугах Allora
3. Помочь с оформлением заявки на консультацию

Что ещё вас интересует?`;
}

// ========== API ==========

app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Allora AI работает!',
        time: new Date().toISOString(),
        mode: 'ФИНАЛЬНАЯ ВЕРСИЯ: Умный AI + форма после 2-го сообщения',
        version: 'v4.0 — правильная логика',
        logic: '1) AI отвечает на всё, 2) После 2-го сообщения — форма знакомства, 3) Цена → сразу заявка'
    });
});

app.get('/health', (req, res) => {
    res.send('OK');
});

// ОСНОВНОЙ ЧАТ
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'guest_' + Date.now() } = req.body;
        console.log('💬 [Чат]', sessionId.substring(0, 8), ':', message.substring(0, 60));
        
        // ИНИЦИАЛИЗАЦИЯ СЕССИИ
        if (!userSessions.has(sessionId)) {
            userSessions.set(sessionId, { messageCount: 0, leadCollected: false });
        }
        
        const session = userSessions.get(sessionId);
        session.messageCount += 1;
        
        console.log(`📊 [Сообщение #${session.messageCount}] для ${sessionId.substring(0, 8)}`);
        
        let showLeadForm = false;
        let isSecondMessage = false;
        
        // ЛОГИКА: ПОСЛЕ 2-ГО СООБЩЕНИЯ (если ещё не собирали контакты)
        if (!session.leadCollected && session.messageCount === 2) {
            showLeadForm = true;
            isSecondMessage = true;
            console.log(`🎯 [ПРЕДЛАГАЕМ ФОРМУ] после 2-го сообщения для ${sessionId.substring(0, 8)}`);
        }
        
        // ЛОГИКА: ВОПРОС ПРО ЦЕНУ → ВСЕГДА ФОРМА
        const priceKeywords = ['цена', 'стоимость', 'сколько стоит', 'прайс', 'бюджет', 'пакет услуг'];
        const lowerMessage = message.toLowerCase();
        const isPriceRequest = priceKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (isPriceRequest && !session.leadCollected) {
            showLeadForm = true;
            console.log(`💰 [ЦЕНА → ФОРМА] для ${sessionId.substring(0, 8)}`);
        }
        
        // ПОЛУЧАЕМ ОТВЕТ ОТ AI
        let reply = getAIResponse(message);
        
        // ДОБАВЛЯЕМ ФРАЗУ ПРО ЗНАКОМСТВО ПРИ 2-М СООБЩЕНИИ
        if (isSecondMessage) {
            reply = `${reply}

**🎯 ОЙ, ДАВАЙТЕ ПОЗНАКОМИМСЯ ПОБЛИЖЕ, ЧТОБЫ ПРОДОЛЖИТЬ НАШУ БЕСЕДУ!**

Оставьте контакты для связи с консультантом:`;
        }
        
        // ОТПРАВЛЯЕМ ОТВЕТ
        res.json({
            success: true,
            reply: reply,
            showLeadForm: showLeadForm,
            sessionId: sessionId,
            messageCount: session.messageCount,
            leadCollected: session.leadCollected || false,
            isPriceRequest: isPriceRequest,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, reply: 'Ошибка сервера' });
    }
});

// СОХРАНЕНИЕ КОНТАКТОВ
app.post('/api/lead', async (req, res) => {
    try {
        const { name, email, phone, message, sessionId } = req.body;
        
        console.log('🎯 [НОВЫЙ ЛИД]', { name, email, phone });
        
        // СОХРАНЯЕМ В ФАЙЛ
        const lead = {
            id: Date.now(),
            name: name || 'Не указано',
            email: email || 'Не указано',
            phone: phone || 'Не указано',
            message: message || 'Знакомство после 2-го сообщения',
            sessionId: sessionId || 'unknown',
            date: new Date().toISOString(),
            status: 'new'
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
        
        // ОБНОВЛЯЕМ СЕССИЮ: КОНТАКТЫ СОБРАНЫ → ВЕЧНЫЙ РЕЖИМ
        if (sessionId && userSessions.has(sessionId)) {
            const session = userSessions.get(sessionId);
            session.leadCollected = true;
            console.log(`✅ [ВЕЧНЫЙ РЕЖИМ] для ${sessionId.substring(0, 8)} — контакты собраны`);
        }
        
        // СООБЩАЕМ В КОНСОЛЬ
        console.log('📢 ==================================');
        console.log('📢 НОВЫЕ КОНТАКТЫ СОБРАНЫ!');
        console.log('📢 Имя:', lead.name);
        console.log('📢 Контакт:', lead.email || lead.phone);
        console.log('📢 ==================================');
        
        res.json({
            success: true,
            message: '✅ Спасибо! Консультант свяжется с вами в течение 2 часов.',
            leadId: lead.id
        });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        res.status(500).json({ success: false, message: 'Ошибка сохранения' });
    }
});

// ПРОСМОТР ЛИДОВ
app.get('/api/leads', async (req, res) => {
    try {
        const secret = req.query.secret;
        if (secret !== 'allora_admin_2024') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        const data = await fs.readFile(LEADS_FILE, 'utf8');
        const leads = JSON.parse(data);
        
        res.json({ success: true, count: leads.length, leads: leads.reverse() });
    } catch (error) {
        res.json({ success: true, count: 0, leads: [] });
    }
});

// ЗАПУСК СЕРВЕРА
app.listen(PORT, () => {
    console.log('🚀 ============================================');
    console.log('🤖 ALLORA AI v4.0 — ФИНАЛЬНАЯ ВЕРСИЯ');
    console.log('📍 Порт:', PORT);
    console.log('🎯 Логика 1: AI отвечает на ЛЮБЫЕ вопросы');
    console.log('🎯 Логика 2: После 2-го сообщения — форма знакомства');
    console.log('🎯 Логика 3: Цена → сразу заявка');
    console.log('🎯 Логика 4: После сбора контактов — вечный режим');
    console.log('🔐 Лиды: /api/leads?secret=allora_admin_2024');
    console.log('🚀 ============================================');
});
