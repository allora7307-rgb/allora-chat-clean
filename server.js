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

// ВСТРОЕННАЯ AI ЛОГИКА
function getAIResponse(message) {
    const lower = message.toLowerCase();
    
    // 1. ВОПРОСЫ ПРО СТОИМОСТЬ → ЗАЯВКА
    if (lower.includes('цена') || lower.includes('стоимость') || 
        lower.includes('сколько стоит') || lower.includes('прайс')) {
        return `💰 **Расчёт стоимости услуг Allora**

Стоимость консалтинга рассчитывается индивидуально.

🎯 **ОСТАВЬТЕ ЗАЯВКУ — МЫ ПЕРЕЗВОНИМ И ПРОКОНСУЛЬТИРУЕМ!**

Наш ассистент свяжется в течение 2 часов.`;
    }
    
    // 2. ВОПРОСЫ ПРО ALLORA
    if (lower.includes('allora') || lower.includes('аллора')) {
        return '🏢 Allora — консалтинговая компания. Предоставляем стратегический, операционный, финансовый консалтинг.';
    }
    
    // 3. ПРИВЕТ
    if (lower.includes('привет') || lower.includes('здравств')) {
        return '👋 Здравствуйте! Я консультант Allora. Могу рассказать об услугах или помочь с заявкой.';
    }
    
    // 4. ДАТА
    if (lower.includes('день') || lower.includes('дата')) {
        const now = new Date();
        return `📅 Сегодня ${now.getDate()} ${now.toLocaleString('ru-RU', { month: 'long' })} ${now.getFullYear()}`;
    }
    
    // 5. СТУЛ/ОБЩИЕ ВОПРОСЫ
    if (lower.includes('стул')) {
        return 'Стул — мебель для сидения. Кстати, Allora консультирует по оптимизации рабочих пространств!';
    }
    
    if (lower.includes('погода')) {
        return 'Погода хорошая для бизнеса! Нужна консультация по развитию компании?';
    }
    
    // 6. ОСТАЛЬНОЕ
    return `🤔 Вы спрашиваете: "${message}"

Я консультант компании Allora. Для расчёта стоимости спросите про цену или оставьте заявку!`;
}

// API endpoints
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Allora AI работает!',
        time: new Date().toISOString(),
        mode: 'ЦЕНА → ЗАЯВКА (простая версия)',
        version: 'v3.0'
    });
});

app.get('/health', (req, res) => {
    res.send('OK');
});

app.post('/api/chat', (req, res) => {
    try {
        const { message } = req.body;
        console.log('💬 Чат:', message.substring(0, 50));
        
        // Определяем нужна ли форма
        const lower = message.toLowerCase();
        const needsForm = lower.includes('цена') || lower.includes('стоимость') || 
                         lower.includes('сколько стоит') || lower.includes('прайс');
        
        const reply = getAIResponse(message);
        
        res.json({
            success: true,
            reply: reply,
            showLeadForm: needsForm,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, reply: 'Ошибка' });
    }
});

app.post('/api/lead', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        console.log('🎯 Заявка от:', name, email);
        
        const lead = {
            id: Date.now(),
            name: name || 'Не указано',
            email: email || 'Не указано',
            phone: phone || 'Не указано',
            message: message || 'Запрос',
            date: new Date().toISOString(),
            status: 'new'
        };
        
        // Сохраняем
        let leads = [];
        try {
            const data = await fs.readFile('leads.json', 'utf8');
            leads = JSON.parse(data);
        } catch (e) {
            leads = [];
        }
        
        leads.push(lead);
        await fs.writeFile('leads.json', JSON.stringify(leads, null, 2));
        
        res.json({
            success: true,
            message: '✅ Заявка принята! Мы перезвоним в течение 2 часов.'
        });
        
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

app.get('/api/leads', async (req, res) => {
    try {
        const secret = req.query.secret;
        if (secret !== 'allora_admin_2024') {
            return res.status(403).json({ error: 'Нет доступа' });
        }
        
        const data = await fs.readFile('leads.json', 'utf8');
        const leads = JSON.parse(data);
        
        res.json({ success: true, count: leads.length, leads: leads.reverse() });
    } catch (error) {
        res.json({ success: true, count: 0, leads: [] });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log('🚀 Allora AI запущен!');
    console.log('📍 Порт:', PORT);
    console.log('🎯 Логика: Цена → Заявка');
    console.log('🔗 Тест: http://localhost:' + PORT + '/test');
});
