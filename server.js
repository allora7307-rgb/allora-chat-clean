import express from 'express';
const app = express();
const PORT = process.env.PORT || 1000; // Render использует 1000

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', '*');
    next();
});

// ========== ХРАНЕНИЕ ==========
const sessions = {};
const leads = [];

// ========== БАЗА ЗНАНИЙ ALLORA ==========
const knowledge = {
    "что такое allora": "Allora — консалтинговая компания полного цикла для физических и юридических лиц. Мы берём на себя организацию и реализацию любых задач. Вы ставите задачу — мы реализуем её на высоком уровне.",
    
    "услуги для физических лиц": "👤 Для физических лиц:\n• Ремонт и строительство\n• Налоговые услуги\n• Юридические услуги\n• Риелторские услуги\n• Страховые услуги\n• Участие в госзакупках для ИП\n• Финансовые услуги",
    
    "услуги для юридических лиц": "🏢 Для юридических лиц:\n• Бухгалтерские услуги\n• Налоговые услуги\n• Ремонт и строительство офисов\n• Коммерческая недвижимость\n• Госзакупки\n• Юридические услуги\n• Страховые услуги",
    
    "ремонт и строительство": "🏗️ Ремонт и строительство:\n• Просчёт стоимости ремонта\n• Дизайн-проект интерьера\n• Капитальный ремонт\n• Строительство домов\n• Электромонтажные работы\n• Сантехнические работы",
    
    "налоговые услуги": "📊 Налоговые услуги:\n• Подача деклараций за вас\n• Помощь в оплате налогов\n• Оформление налоговых вычетов\n• Консультации по налогам",
    
    "бухгалтерские услуги": "📈 Бухгалтерские услуги:\n• Ведение бухгалтерского учёта\n• Сдача отчётности\n• Расчёт заработной платы\n• Восстановление учёта",
    
    "юридические услуги": "⚖️ Юридические услуги:\n• Семейные споры\n• Наследство\n• Составление договоров\n• Представительство в судах",
    
    "госзакупки": "🏛️ Участие в госзакупках:\n• Полное сопровождение участия\n• Подготовка документации\n• Мониторинг тендеров\n• Исполнение контрактов",
    
    "контакты": "📞 Контакты Allora:\n• Email: allora7307@gmail.com\n• Телефон: +7 (XXX) XXX-XX-XX\n• Адрес: [указать адрес]\n• Работаем: 9:00-21:00",
    
    "привет": "👋 Здравствуйте! Я AI-помощник компании Allora. Чем могу помочь?",
    "помощь": "Я могу рассказать про:\n• Что такое Allora\n• Услуги для физлиц и юрлиц\n• Конкретные услуги\n• Контакты\n\nЧто вас интересует?",
    "спасибо": "Пожалуйста! Обращайтесь, если нужна помощь! 😊",
    "пока": "До свидания! 👋"
};

// ========== ПОИСК ОТВЕТА ==========
function findAnswer(question) {
    const lowerQ = question.toLowerCase();
    
    // Ищем точное совпадение
    for (const [key, answer] of Object.entries(knowledge)) {
        if (lowerQ.includes(key)) {
            // Получаем подсказки (следующие темы)
            const allKeys = Object.keys(knowledge);
            const currentIndex = allKeys.indexOf(key);
            const suggestions = allKeys
                .filter((k, i) => i !== currentIndex && Math.abs(i - currentIndex) <= 3)
                .slice(0, 4);
            
            return {
                answer: answer,
                suggestions: suggestions
            };
        }
    }
    
    // Если не нашли
    return {
        answer: "🤔 Я AI-помощник компании Allora. Спросите про:\n• Что такое Allora\n• Услуги компании\n• Конкретные направления\n• Контакты\n\nИли выберите тему из подсказок 👇",
        suggestions: ["что такое allora", "услуги для физических лиц", "ремонт и строительство", "контакты"]
    };
}

// ========== API ==========

// 1. Чат
app.post('/api/chat', (req, res) => {
    try {
        const { sessionId, message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Нет сообщения' });
        }
        
        // Создаем сессию
        if (!sessions[sessionId]) {
            sessions[sessionId] = {
                questions: [],
                interests: [],
                createdAt: Date.now(),
                leadCollected: false
            };
        }
        
        const session = sessions[sessionId];
        
        // Сохраняем вопрос
        session.questions.push(message);
        
        // Получаем ответ
        const result = findAnswer(message);
        
        // Определяем тему интереса
        const questionLower = message.toLowerCase();
        for (const topic of Object.keys(knowledge)) {
            if (questionLower.includes(topic) && !session.interests.includes(topic)) {
                session.interests.push(topic);
            }
        }
        
        // Проверяем, нужно ли собирать лид (после 2-го вопроса)
        let requiresLeadForm = false;
        if (session.questions.length === 2 && !session.leadCollected) {
            requiresLeadForm = true;
        }
        
        res.json({
            success: true,
            reply: result.answer,
            suggestions: result.suggestions,
            requiresLeadForm: requiresLeadForm,
            type: 'knowledge_based',
            sessionId: sessionId,
            messageCount: session.questions.length,
            leadCollected: session.leadCollected || false
        });
        
    } catch (error) {
        console.error('Ошибка в /api/chat:', error);
        res.status(500).json({ 
            success: false, 
            reply: 'Ошибка сервера',
            requiresLeadForm: false 
        });
    }
});

// 2. Сохранение лида
app.post('/api/lead', (req, res) => {
    try {
        const { sessionId, name, phone, service, message } = req.body;
        
        if (!sessionId || !name || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Необходимы имя и телефон'
            });
        }
        
        if (!sessions[sessionId]) {
            return res.status(404).json({ 
                success: false, 
                message: 'Сессия не найдена'
            });
        }
        
        const session = sessions[sessionId];
        session.leadCollected = true;
        
        // Собираем лид
        const lead = {
            id: Date.now(),
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            name: name,
            phone: phone,
            service: service || 'Не указана',
            message: message || 'Нет сообщения',
            questions: session.questions,
            interests: session.interests
        };
        
        leads.push(lead);
        
        console.log('📝 НОВЫЙ ЛИД:', {
            name: lead.name,
            phone: lead.phone,
            service: lead.service,
            questions: lead.questions.length
        });
        
        res.json({
            success: true,
            message: '✅ Отлично! Продолжаем общение.',
            authorized: true
        });
        
    } catch (error) {
        console.error('Ошибка в /api/lead:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сохранения'
        });
    }
});

// 3. Проверка здоровья
app.get('/health', (req, res) => {
    res.send('OK');
});

// 4. Информация о сервере
app.get('/api/info', (req, res) => {
    res.json({
        status: 'OK',
        version: 'v1.0 — ПОЛНАЯ БАЗА ЗНАНИЙ',
        knowledgeSize: Object.keys(knowledge).length,
        activeSessions: Object.keys(sessions).length,
        totalLeads: leads.length,
        message: 'Allora AI с полной базой знаний работает!'
    });
});

// 5. Главная страница
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Allora AI Assistant</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #0f1e5a 0%, #2d4d9c 100%);
                min-height: 100vh;
            }
            .container {
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 25px 70px rgba(0,0,0,0.5);
            }
            h1 {
                color: #0f1e5a;
                text-align: center;
                margin-bottom: 10px;
            }
            .subtitle {
                text-align: center;
                color: #666;
                margin-bottom: 30px;
            }
            .status {
                background: #e8f5e9;
                color: #2e7d32;
                padding: 10px 15px;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 20px;
                font-weight: bold;
            }
            .features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 25px 0;
            }
            .feature {
                background: #f5f7ff;
                padding: 15px;
                border-radius: 10px;
                border-left: 4px solid #667eea;
            }
            .feature h3 {
                color: #0f1e5a;
                margin-top: 0;
            }
            .cta {
                text-align: center;
                margin-top: 30px;
            }
            .cta a {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 40px;
                border-radius: 25px;
                text-decoration: none;
                font-weight: bold;
                font-size: 18px;
                transition: all 0.3s;
            }
            .cta a:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Allora AI Assistant</h1>
            <div class="subtitle">Ваш помощник по услугам компании Allora</div>
            
            <div class="status">
                ✅ Сервер работает | База знаний: ${Object.keys(knowledge).length} тем
            </div>
            
            <div class="features">
                <div class="feature">
                    <h3>🎯 Для физических лиц</h3>
                    <p>Ремонт, налоги, юридические услуги, страховка</p>
                </div>
                <div class="feature">
                    <h3>🏢 Для юридических лиц</h3>
                    <p>Бухгалтерия, госзакупки, ремонт офисов, консалтинг</p>
                </div>
                <div class="feature">
                    <h3>📊 Сбор лидов</h3>
                    <p>После 2-го вопроса собираем контакты для связи</p>
                </div>
                <div class="feature">
                    <h3>🤖 Умный AI</h3>
                    <p>Отвечает на вопросы из базы знаний Allora</p>
                </div>
            </div>
            
            <div class="cta">
                <a href="https://allora-chat-clean.onrender.com" target="_blank">
                    🤖 Открыть AI чат
                </a>
            </div>
            
            <div style="margin-top: 30px; text-align: center; color: #666;">
                <p>Это серверная часть. Используйте кнопку в WordPress для открытия чата.</p>
                <p><strong>API Endpoints:</strong></p>
                <code>POST /api/chat</code> • 
                <code>POST /api/lead</code> • 
                <code>GET /health</code>
            </div>
        </div>
    </body>
    </html>
    `);
});

// ========== ЗАПУСК ==========
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Allora AI с ПОЛНОЙ базой знаний запущен!');
    console.log('📡 Порт:', PORT);
    console.log('🌐 URL: https://allora-chat-clean.onrender.com');
    console.log('🎯 Сбор лидов: после 2-го вопроса');
    console.log('📊 База знаний:', Object.keys(knowledge).length, 'тем');
    console.log('='.repeat(60));
});
