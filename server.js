import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 1000;

app.use(cors());
app.use(express.json());

// ========== ВАШИ КОНТАКТЫ (ВСЁ УЖЕ ВСТАВЛЕНО) ==========
const CONFIG = {
    telegram: {
        botToken: '8579385459:AAGn8kEygF8riMTeqnDtTpxsim87sstH5Ew',
        chatId: '787419978', // Замените после получения chat_id
        botUsername: '@AlloraLeadsBot'
    },
    
    contacts: {
        name: 'Анна',
        telegram: '@AlloraLeadsBot',
        email: 'allora7307@gmail.com',
        phone: '+79995367307',
        whatsapp: 'https://wa.me/79995367307',
        company: 'Allora'
    },
    
    chat: {
        leadAfterMessages: 2,
        companyName: 'Allora',
        welcomeMessage: 'Добро пожаловать в AI помощник Allora!'
    }
};

const userSessions = new Map();
const leadsDB = [];

// ========== ОТПРАВКА В TELEGRAM ==========
async function sendToTelegram(lead) {
    try {
        const message = `
🤖 *НОВЫЙ ЛИД ALLORA* 🚀

👤 *Клиент:*
• Имя: ${lead.name}
• Телефон: \`${lead.phone}\`
• Услуга: ${lead.service}
• Время: ${lead.timestamp}

📊 *Детали:*
• Вопросов задано: ${lead.questionCount}
• Темы интереса: ${lead.interests?.join(', ') || 'не указаны'}

📞 *Контакты ${CONFIG.contacts.name}:*
• Telegram: ${CONFIG.contacts.telegram}
• WhatsApp: ${CONFIG.contacts.whatsapp}
• Телефон: ${CONFIG.contacts.phone}

_Свяжитесь в течение 10 минут!_
        `.trim();

        const url = `https://api.telegram.org/bot${CONFIG.telegram.botToken}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CONFIG.telegram.chatId,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '📞 Позвонить клиенту',
                                url: `tel:${lead.phone}`
                            },
                            {
                                text: '💬 WhatsApp клиенту',
                                url: `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`
                            }
                        ],
                        [
                            {
                                text: `📱 ${CONFIG.contacts.name} (Telegram)`,
                                url: `https://t.me/AlloraLeadsBot`
                            },
                            {
                                text: '📧 Написать email',
                                url: `mailto:allora7307@gmail.com?subject=Лид от ${lead.name}`
                            }
                        ]
                    ]
                }
            })
        });

        const result = await response.json();
        
        if (result.ok) {
            console.log(`✅ Telegram: Уведомление отправлено ${CONFIG.contacts.name}`);
            return { success: true, messageId: result.result.message_id };
        } else {
            console.log('❌ Telegram ошибка:', result.description);
            return { success: false, error: result.description };
        }
    } catch (error) {
        console.error('❌ Ошибка Telegram:', error.message);
        return { success: false, error: error.message };
    }
}

// ========== БАЗА ЗНАНИЙ ==========
const knowledgeBase = {
    "что такое allora": {
        answer: `🎯 *Allora* — консалтинговая компания полного цикла для физических и юридических лиц.\n\nМы берём на себя организацию и реализацию любых задач. Вы ставите задачу — мы реализуем её на высоком уровне.\n\n💼 *Руководитель:* Анна\n📞 *Контакты:* +79995367307`,
        keywords: ["allora", "компания", "консалтинг"],
        category: "общее"
    },
    
    "услуги для физических лиц": {
        answer: `👤 *Для физических лиц Allora предоставляет:*\n• Ремонт и строительство\n• Налоговые услуги\n• Юридические услуги\n• Риелторские услуги\n• Страховые услуги\n\n📞 *Связь:* Анна - +79995367307`,
        keywords: ["физические", "частные", "физлица"],
        category: "физические лица"
    },
    
    "ремонт и строительство": {
        answer: `🏗️ *Ремонт и строительство от Allora:*\n• Просчёт стоимости ремонта\n• Дизайн-проект интерьера\n• Капитальный ремонт\n• Строительство домов\n• Электромонтажные работы\n\n🎯 *Консультация:* Анна\n📱 +79995367307`,
        keywords: ["ремонт", "строительство", "квартира", "дом"],
        category: "физические лица"
    },
    
    "контакты": {
        answer: `📞 *Контакты Allora:*\n• Руководитель: *Анна*\n• Телефон: *+79995367307*\n• WhatsApp: https://wa.me/79995367307\n• Telegram: @AlloraLeadsBot\n• Email: allora7307@gmail.com\n• График: ежедневно 9:00-21:00\n\n✨ *Первая консультация бесплатно!*`,
        keywords: ["контакты", "адрес", "телефон", "email"],
        category: "общее"
    }
};

// ========== API ==========
app.get('/health', (req, res) => res.send('OK'));

app.post('/api/chat', (req, res) => {
    const { message, sessionId = 'guest_' + Date.now() } = req.body;
    
    if (!userSessions.has(sessionId)) {
        userSessions.set(sessionId, { 
            messageCount: 0, 
            leadCollected: false 
        });
    }
    
    const session = userSessions.get(sessionId);
    session.messageCount += 1;
    
    let answer = "🤔 Задайте вопрос про услуги Allora";
    for (const [topic, data] of Object.entries(knowledgeBase)) {
        if (message.toLowerCase().includes(topic)) {
            answer = data.answer;
            break;
        }
    }
    
    let requiresLeadForm = false;
    if (!session.leadCollected && session.messageCount >= 2) {
        requiresLeadForm = true;
    }
    
    res.json({
        success: true,
        reply: answer,
        requiresLeadForm,
        sessionId,
        messageCount: session.messageCount
    });
});

app.post('/api/lead', async (req, res) => {
    const { sessionId, name, phone, service } = req.body;
    
    if (!name || !phone) {
        return res.status(400).json({ 
            success: false, 
            message: 'Пожалуйста, укажите имя и телефон' 
        });
    }
    
    const lead = {
        id: Date.now(),
        name,
        phone,
        service: service || 'Не указана',
        timestamp: new Date().toLocaleString('ru-RU'),
        sessionId
    };
    
    leadsDB.push(lead);
    
    // Отправляем в Telegram если настроен chat_id
    let telegramResult = { success: false, error: 'chat_id не настроен' };
    if (CONFIG.telegram.chatId !== 'НУЖНО_УЗНАТЬ') {
        telegramResult = await sendToTelegram(lead);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🤖 ЛИД ДЛЯ АННЫ');
    console.log('👤 Клиент:', name);
    console.log('📞 Телефон:', phone);
    console.log('📱 Telegram:', telegramResult.success ? '✅ Отправлено' : '❌ Не отправлено');
    console.log('='.repeat(60));
    
    if (userSessions.has(sessionId)) {
        userSessions.get(sessionId).leadCollected = true;
    }
    
    res.json({
        success: true,
        message: '✅ Спасибо! Анна свяжется с вами в течение 10 минут.',
        telegramSent: telegramResult.success,
        leadId: lead.id
    });
});

app.get('/api/leads', (req, res) => {
    res.json({
        total: leadsDB.length,
        manager: 'Анна',
        phone: '+79995367307',
        lastLeads: leadsDB.slice(-10).reverse()
    });
});

// ГЛАВНАЯ СТРАНИЦА
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>🤖 Allora AI</title>
    <style>
        body { font-family: Arial; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px; }
        .chat { border: 1px solid #ddd; padding: 15px; height: 300px; overflow-y: auto; margin: 15px 0; }
        .message { margin: 10px 0; padding: 10px; border-radius: 10px; }
        .ai { background: #f0f0f0; }
        .user { background: #667eea; color: white; text-align: right; }
        input, button { padding: 10px; margin: 5px; }
    </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 Allora AI Assistant</h1>
                <p>Менеджер: Анна 📞 +79995367307</p>
            </div>
            <div class="chat" id="chat">
                <div class="message ai">👋 Привет! Я AI-помощник Allora. Анна (+79995367307) поможет с любыми вопросами.</div>
            </div>
            <input type="text" id="input" placeholder="Ваш вопрос..." style="width: 70%;">
            <button onclick="send()">Отправить</button>
        </div>
        <script>
            let sessionId = 'sess_' + Date.now();
            async function send() {
                const input = document.getElementById('input');
                const msg = input.value;
                if (!msg) return;
                
                const chat = document.getElementById('chat');
                chat.innerHTML += '<div class="message user">' + msg + '</div>';
                input.value = '';
                
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({sessionId, message:msg})
                });
                const data = await res.json();
                chat.innerHTML += '<div class="message ai">' + data.reply + '</div>';
                
                if (data.requiresLeadForm) {
                    chat.innerHTML += \`
                        <div class="message ai">
                            <strong>👋 Оставьте контакты для Анны:</strong><br>
                            <input id="name" placeholder="Ваше имя"><br>
                            <input id="phone" placeholder="Ваш телефон"><br>
                            <button onclick="saveLead()">Отправить Анне</button>
                        </div>
                    \`;
                }
            }
            async function saveLead() {
                const name = document.getElementById('name').value;
                const phone = document.getElementById('phone').value;
                await fetch('/api/lead', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({sessionId, name, phone})
                });
                alert('✅ Анна получила ваши контакты!');
            }
            document.getElementById('input').onkeypress = e => e.key === 'Enter' && send();
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 ALLORA AI ЗАПУЩЕН ДЛЯ АННЫ!');
    console.log('📞 Телефон Анны: +79995367307');
    console.log('📧 Email: allora7307@gmail.com');
    console.log('🤖 Telegram бот: @AlloraLeadsBot');
    console.log('🔗 Чат: https://allora-chat-clean.onrender.com');
    console.log('='.repeat(70));
    console.log('\n⚠️ ДЛЯ НАСТРОЙКИ TELEGRAM:');
    console.log('1. Напишите боту @AlloraLeadsBot в Telegram');
    console.log('2. Получите chat_id командой:');
    console.log('   curl -s "https://api.telegram.org/bot8579385459:AAGn8kEygF8riMTeqnDtTpxsim87sstH5Ew/getUpdates" | jq ".result[0].message.chat.id"');
    console.log('3. Обновите chatId в коде');
    console.log('='.repeat(70));
});
