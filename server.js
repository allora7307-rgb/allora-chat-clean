import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 1000;

app.use(cors());
app.use(express.json());

const userSessions = new Map();

// ========== БАЗА ЗНАНИЙ ==========
const knowledge = {
    "что такое allora": "Allora — консалтинговая компания полного цикла для физических и юридических лиц. Мы берём на себя организацию и реализацию любых задач. Вы ставите задачу — мы реализуем её на высоком уровне.",
    
    "услуги для физических лиц": "👤 Для физических лиц:\n• Ремонт и строительство\n• Налоговые услуги\n• Юридические услуги\n• Риелторские услуги\n• Страховые услуги\n• Участие в госзакупках для ИП\n• Финансовые услуги",
    
    "услуги для юридических лиц": "🏢 Для юридических лиц:\n• Бухгалтерские услуги\n• Налоговые услуги\n• Ремонт и строительство офисов\n• Коммерческая недвижимость\n• Госзакупки\n• Юридические услуги\n• Страховые услуги",
    
    "ремонт и строительство": "🏗️ Ремонт и строительство:\n• Просчёт стоимости ремонта\n• Дизайн-проект интерьера\n• Капитальный ремонт\n• Строительство домов\n• Электромонтажные работы\n• Сантехнические работы",
    
    "налоговые услуги": "📊 Налоговые услуги:\n• Подача деклараций за вас\n• Помощь в оплате налогов\n• Оформление налоговых вычетов\n• Консультации по налогам",
    
    "бухгалтерские услуги": "📈 Бухгалтерские услуги:\n• Ведение бухгалтерского учёта\n• Сдача отчётности\n• Расчёт заработной плата\n• Восстановление учёта",
    
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
    
    for (const [key, answer] of Object.entries(knowledge)) {
        if (lowerQ.includes(key)) {
            return {
                answer: answer,
                suggestions: getSuggestions(key)
            };
        }
    }
    
    return {
        answer: "🤔 Я AI-помощник компании Allora. Спросите про:\n• Что такое Allora\n• Услуги компании\n• Конкретные направления\n• Контакты",
        suggestions: ["что такое allora", "услуги для физических лиц", "ремонт и строительство", "контакты"]
    };
}

function getSuggestions(currentKey) {
    const allKeys = Object.keys(knowledge);
    const currentIndex = allKeys.indexOf(currentKey);
    return allKeys
        .filter((k, i) => i !== currentIndex && Math.abs(i - currentIndex) <= 3)
        .slice(0, 4);
}

// ========== API ==========
app.get('/health', (req, res) => res.send('OK'));

app.get('/api/info', (req, res) => {
    res.json({
        status: 'OK',
        version: 'v3.0 — ПОЛНОЦЕННЫЙ ЧАТ',
        knowledgeSize: Object.keys(knowledge).length,
        activeSessions: userSessions.size,
        message: 'Откройте эту страницу в браузере — увидите чат!'
    });
});

app.post('/api/chat', (req, res) => {
    try {
        const { message, sessionId = 'guest_' + Date.now() } = req.body;
        
        if (!userSessions.has(sessionId)) {
            userSessions.set(sessionId, { messageCount: 0, leadCollected: false });
        }
        
        const session = userSessions.get(sessionId);
        session.messageCount += 1;
        
        let requiresLeadForm = false;
        if (!session.leadCollected && session.messageCount >= 2) {
            requiresLeadForm = true;
        }
        
        const result = findAnswer(message);
        
        res.json({
            success: true,
            reply: result.answer,
            requiresLeadForm: requiresLeadForm,
            type: 'knowledge',
            sessionId: sessionId,
            messageCount: session.messageCount,
            leadCollected: session.leadCollected || false
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            reply: 'Ошибка сервера',
            requiresLeadForm: false 
        });
    }
});

app.post('/api/lead', (req, res) => {
    res.json({
        success: true,
        message: '✅ Отлично! Продолжаем общение.',
        authorized: true
    });
});

// ========== ГЛАВНАЯ СТРАНИЦА ==========
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🤖 AI Allora - Чат с ИИ помощником</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #1a237e 0%, #311b92 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            
            .chat-container {
                width: 100%;
                max-width: 800px;
                height: 85vh;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .header {
                background: linear-gradient(135deg, #1a237e 0%, #311b92 100%);
                color: white;
                padding: 20px;
                text-align: center;
                border-bottom: 1px solid rgba(255,255,255,0.2);
            }
            
            .header h1 {
                font-size: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .status {
                font-size: 14px;
                opacity: 0.9;
                margin-top: 5px;
            }
            
            .chat-window {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .message {
                max-width: 80%;
                padding: 12px 18px;
                border-radius: 18px;
                line-height: 1.5;
                animation: fadeIn 0.3s;
            }
            
            .ai-message {
                background: #f0f4ff;
                align-self: flex-start;
                border-bottom-left-radius: 5px;
                border: 1px solid #e0e0e0;
                white-space: pre-line;
            }
            
            .user-message {
                background: linear-gradient(135deg, #1a237e 0%, #311b92 100%);
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 5px;
            }
            
            .input-area {
                padding: 15px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 10px;
                background: #f9f9f9;
            }
            
            input {
                flex: 1;
                padding: 12px 18px;
                border: 2px solid #ddd;
                border-radius: 25px;
                font-size: 16px;
                outline: none;
            }
            
            input:focus {
                border-color: #1a237e;
            }
            
            button {
                background: linear-gradient(135deg, #1a237e 0%, #311b92 100%);
                color: white;
                border: none;
                padding: 0 25px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            button:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }
            
            .typing {
                color: #666;
                font-style: italic;
                padding: 10px;
                display: none;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @media (max-width: 768px) {
                .chat-container {
                    height: 90vh;
                    border-radius: 15px;
                }
                
                .chat-window {
                    padding: 15px;
                }
                
                .message {
                    max-width: 90%;
                }
            }
        </style>
    </head>
    <body>
        <div class="chat-container" id="chatContainer">
            <div class="header">
                <h1>🤖 AI Allora Assistant</h1>
                <div class="status">База знаний: ${Object.keys(knowledge).length} тем | Задайте вопрос</div>
            </div>
            
            <div class="chat-window" id="chatWindow">
                <div class="message ai-message">
                    👋 Здравствуйте! Я AI-помощник компании Allora.<br><br>
                    Спросите меня про услуги, контакты или конкретные задачи!
                </div>
            </div>
            
            <div class="typing" id="typing">Allora AI печатает...</div>
            
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Напишите ваш вопрос..." autocomplete="off">
                <button onclick="sendMessage()">Отправить</button>
            </div>
        </div>

        <script>
            const sessionId = 'chat_' + Date.now();
            let messageCount = 0;
            
            function sendMessage() {
                const input = document.getElementById('messageInput');
                const message = input.value.trim();
                
                if (!message) return;
                
                // Добавляем сообщение пользователя
                addMessage(message, 'user');
                messageCount++;
                input.value = '';
                
                // Показываем "печатает"
                document.getElementById('typing').style.display = 'block';
                
                // Отправляем на сервер
                fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, message })
                })
                .then(response => response.json())
                .then(data => {
                    document.getElementById('typing').style.display = 'none';
                    addMessage(data.reply, 'ai');
                    
                    // После 2-го вопроса показываем форму для лида
                    if (data.requiresLeadForm && !data.leadCollected) {
                        showLeadForm();
                    }
                })
                .catch(error => {
                    document.getElementById('typing').style.display = 'none';
                    addMessage('⚠️ Ошибка соединения', 'ai');
                });
            }
            
            function addMessage(text, sender) {
                const chatWindow = document.getElementById('chatWindow');
                const messageDiv = document.createElement('div');
                
                messageDiv.className = sender === 'ai' ? 'message ai-message' : 'message user-message';
                messageDiv.innerHTML = text.replace(/\\n/g, '<br>');
                
                chatWindow.appendChild(messageDiv);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
            
            function showLeadForm() {
                const formHTML = \`
                    <div style="background:#e8f5e9; padding:15px; border-radius:10px; margin-top:15px;">
                        <h3 style="color:#2e7d32; margin-bottom:10px;">👋 Давайте познакомимся!</h3>
                        <input type="text" id="leadName" placeholder="Ваше имя" style="width:100%; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #ccc;">
                        <input type="tel" id="leadPhone" placeholder="Ваш телефон" style="width:100%; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #ccc;">
                        <button onclick="saveLead()" style="width:100%; padding:10px; background:#4caf50; color:white; border:none; border-radius:5px; cursor:pointer;">
                            Отправить и продолжить
                        </button>
                    </div>
                \`;
                
                document.getElementById('chatWindow').innerHTML += formHTML;
                document.getElementById('chatWindow').scrollTop = chatWindow.scrollHeight;
            }
            
            function saveLead() {
                const name = document.getElementById('leadName').value.trim();
                const phone = document.getElementById('leadPhone').value.trim();
                
                if (!name || !phone) {
                    alert('Заполните имя и телефон');
                    return;
                }
                
                fetch('/api/lead', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, name, phone, service: 'Консультация' })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const forms = document.querySelectorAll('[style*="background:#e8f5e9"]');
                        forms.forEach(form => form.remove());
                        addMessage('✅ Спасибо! Наш специалист свяжется с вами.', 'ai');
                    }
                })
                .catch(() => alert('Ошибка сохранения'));
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

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Allora AI ЧАТ ЗАПУЩЕН!');
    console.log('📡 Порт:', PORT);
    console.log('🌐 ОТКРОЙТЕ ЧАТ: https://allora-chat-clean.onrender.com');
    console.log('🤖 Полноценный интерфейс чата готов к работе!');
    console.log('='.repeat(60));
});
