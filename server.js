const express = require('express');
const app = express();
const PORT = 5000;

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

// ========== СБОР ЛИДОВ ==========
function collectLead(sessionId, name, phone) {
    const session = sessions[sessionId];
    if (!session) return;
    
    const lead = {
        id: Date.now(),
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        name: name || 'Аноним',
        phone: phone || 'Не указан',
        questions: session.questions,
        interests: session.interests
    };
    
    leads.push(lead);
    
    // Просто логируем в консоль (можно добавить email позже)
    console.log('📝 НОВЫЙ ЛИД:', {
        name: lead.name,
        phone: lead.phone,
        questions: lead.questions.length,
        interests: lead.interests
    });
    
    return lead;
}

// ========== API ==========

// 1. Чат
app.post('/chat', (req, res) => {
    try {
        const { sessionId, message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Нет сообщения' });
        }
        
        // Создаем сессия
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
        let leadPrompt = null;
        if (session.questions.length === 2 && !session.leadCollected) {
            leadPrompt = "👋 Давайте познакомимся для продолжения беседы! Как вас зовут и какой у вас телефон?";
        }
        
        res.json({
            reply: result.answer,
            suggestions: result.suggestions,
            leadPrompt: leadPrompt,
            questionCount: session.questions.length
        });
        
    } catch (error) {
        console.error('Ошибка в /chat:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 2. Сохранение лида
app.post('/save-lead', (req, res) => {
    try {
        const { sessionId, name, phone } = req.body;
        
        if (!sessionId || !name || !phone) {
            return res.status(400).json({ error: 'Нет данных' });
        }
        
        if (!sessions[sessionId]) {
            return res.status(404).json({ error: 'Сессия не найдена' });
        }
        
        const session = sessions[sessionId];
        session.leadCollected = true;
        
        // Собираем лид
        const lead = collectLead(sessionId, name, phone);
        
        res.json({
            success: true,
            message: '✅ Спасибо! Наш специалист свяжется с вами. Чем ещё могу помочь?',
            leadId: lead.id
        });
        
    } catch (error) {
        console.error('Ошибка в /save-lead:', error);
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// 3. Главная страница
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Allora AI Chat</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 10px;
            }
            .subtitle {
                text-align: center;
                color: #666;
                margin-bottom: 30px;
            }
            .chat-window {
                height: 400px;
                overflow-y: auto;
                border: 1px solid #e0e0e0;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                background: #f9f9f9;
            }
            .message {
                margin: 15px 0;
                padding: 12px 18px;
                border-radius: 18px;
                max-width: 85%;
                word-wrap: break-word;
                line-height: 1.5;
            }
            .user {
                background: #667eea;
                color: white;
                margin-left: auto;
                border-bottom-right-radius: 5px;
            }
            .ai {
                background: #f1f3ff;
                color: #333;
                margin-right: auto;
                border: 1px solid #e0e0e0;
                border-bottom-left-radius: 5px;
            }
            .ai strong {
                color: #667eea;
                display: block;
                margin-bottom: 5px;
            }
            .suggestions {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 15px;
            }
            .suggestion {
                padding: 8px 16px;
                background: #e3f2fd;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
                border: 1px solid #bbdefb;
                transition: all 0.3s;
            }
            .suggestion:hover {
                background: #bbdefb;
                transform: translateY(-2px);
            }
            .input-area {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            input {
                flex: 1;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 25px;
                font-size: 16px;
                outline: none;
            }
            input:focus {
                border-color: #667eea;
            }
            button {
                padding: 12px 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                transition: all 0.3s;
            }
            button:hover {
                opacity: 0.9;
                transform: translateY(-2px);
            }
            .lead-form {
                background: #e8f5e9;
                padding: 20px;
                border-radius: 12px;
                margin-top: 20px;
                border: 1px solid #c8e6c9;
                display: none;
            }
            .lead-form h3 {
                color: #2e7d32;
                margin-bottom: 15px;
            }
            .form-group {
                margin-bottom: 15px;
            }
            .form-group input {
                width: 100%;
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 8px;
            }
            .status {
                text-align: center;
                padding: 10px;
                color: #28a745;
                font-weight: bold;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Allora AI Assistant</h1>
            <div class="subtitle">Ваш помощник по услугам компании Allora</div>
            
            <div class="status">✅ Сервер работает | Задайте вопрос</div>
            
            <div class="chat-window" id="chatWindow">
                <div class="message ai">
                    <strong>Allora AI:</strong> Здравствуйте! Я AI-помощник компании Allora. 
                    Мы предоставляем полный спектр услуг для физических и юридических лиц.
                    Спросите меня про услуги, контакты или конкретные задачи!
                </div>
            </div>
            
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Задайте вопрос про услуги Allora..." autocomplete="off">
                <button onclick="sendMessage()">Отправить</button>
            </div>
            
            <div class="suggestions" id="suggestions">
                <div class="suggestion" onclick="ask('что такое allora')">Что такое Allora?</div>
                <div class="suggestion" onclick="ask('услуги для физических лиц')">Услуги для физлиц</div>
                <div class="suggestion" onclick="ask('ремонт и строительство')">Ремонт и строительство</div>
                <div class="suggestion" onclick="ask('контакты')">Контакты</div>
            </div>
            
            <div class="lead-form" id="leadForm">
                <h3>👋 Давайте познакомимся для продолжения беседы!</h3>
                <div class="form-group">
                    <input type="text" id="leadName" placeholder="Ваше имя">
                </div>
                <div class="form-group">
                    <input type="tel" id="leadPhone" placeholder="Ваш телефон">
                </div>
                <button onclick="saveLead()">Продолжить общение</button>
            </div>
        </div>

        <script>
            const sessionId = 'session_' + Date.now();
            let questionCount = 0;
            
            async function sendMessage() {
                const input = document.getElementById('messageInput');
                const message = input.value.trim();
                
                if (!message) return;
                
                // Добавляем сообщение пользователя
                addMessage(message, 'user');
                questionCount++;
                input.value = '';
                
                try {
                    const response = await fetch('/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId, message })
                    });
                    
                    const data = await response.json();
                    addMessage(data.reply, 'ai');
                    
                    // Показываем подсказки
                    if (data.suggestions && data.suggestions.length > 0) {
                        showSuggestions(data.suggestions);
                    }
                    
                    // Показываем форму для лида после 2-го вопроса
                    if (data.leadPrompt && questionCount >= 2) {
                        showLeadForm(data.leadPrompt);
                    }
                    
                } catch (error) {
                    addMessage('⚠️ Ошибка соединения', 'ai');
                }
            }
            
            function ask(text) {
                document.getElementById('messageInput').value = text;
                sendMessage();
            }
            
            function addMessage(text, sender) {
                const chatWindow = document.getElementById('chatWindow');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + sender;
                
                if (sender === 'ai') {
                    messageDiv.innerHTML = '<strong>Allora AI:</strong> ' + text.replace(/\\n/g, '<br>');
                } else {
                    messageDiv.textContent = text;
                }
                
                chatWindow.appendChild(messageDiv);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
            
            function showSuggestions(suggestions) {
                const container = document.getElementById('suggestions');
                container.innerHTML = '';
                
                suggestions.forEach(text => {
                    const div = document.createElement('div');
                    div.className = 'suggestion';
                    div.textContent = text;
                    div.onclick = () => ask(text);
                    container.appendChild(div);
                });
            }
            
            function showLeadForm(message) {
                document.getElementById('leadForm').style.display = 'block';
                document.getElementById('leadForm').scrollIntoView({ behavior: 'smooth' });
            }
            
            async function saveLead() {
                const name = document.getElementById('leadName').value.trim();
                const phone = document.getElementById('leadPhone').value.trim();
                
                if (!name || !phone) {
                    alert('Пожалуйста, заполните имя и телефон');
                    return;
                }
                
                try {
                    const response = await fetch('/save-lead', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId, name, phone })
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        document.getElementById('leadForm').style.display = 'none';
                        addMessage(data.message, 'ai');
                    }
                } catch (error) {
                    alert('Ошибка сохранения');
                }
            }
            
            // Enter для отправки
            document.getElementById('messageInput').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
            
            // Фокус на поле ввода
            document.getElementById('messageInput').focus();
        </script>
    </body>
    </html>
    `);
});

// ========== ЗАПУСК ==========
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Allora AI Chat запущен!');
    console.log('📡 Порт: ' + PORT);
    console.log('🌐 URL: http://localhost:' + PORT);
    console.log('🎯 Сбор лидов: после 2-го вопроса');
    console.log('📊 База знаний: ' + Object.keys(knowledge).length + ' тем');
    console.log('='.repeat(50));
    console.log('\n✅ Откройте: http://localhost:5000');
    console.log('✅ Кнопка в WordPress откроет этот адрес');
    console.log('');
});
