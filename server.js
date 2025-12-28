import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 1000;

app.use(cors());
app.use(express.json());

const userSessions = new Map();

// ========== ДИНАМИЧЕСКАЯ БАЗА ЗНАНИЙ (можно расширять через JSON) ==========
const knowledgeBase = {
    "что такое allora": {
        answer: "🎯 <strong>Allora — консалтинговая компания полного цикла</strong> для физических и юридических лиц.<br><br>Мы берём на себя <strong>организацию и реализацию любых задач</strong>. Вы ставите задачу — мы реализуем её на высоком уровне.",
        keywords: ["allora", "компания", "консалтинг", "фирма", "о компании", "что это"],
        category: "общее",
        priority: 10
    },
    
    "услуги для физических лиц": {
        answer: "👤 <strong>Для физических лиц Allora предоставляет:</strong><br>• <strong>Ремонт и строительство</strong> — от дизайна до сдачи объекта<br>• <strong>Налоговые услуги</strong> — декларации, вычеты, консультации<br>• <strong>Юридические услуги</strong> — семейное право, наследство, договоры<br>• <strong>Риелторские услуги</strong> — покупка, продажа, аренда недвижимости<br>• <strong>Страховые услуги</strong> — полное страхование жизни и имущества<br>• <strong>Участие в госзакупках для ИП</strong> — полное сопровождение<br>• <strong>Финансовые услуги</strong> — инвестиции, кредиты, планирование",
        keywords: ["физические лица", "частные лица", "для себя", "личные услуги", "физлица", "частникам"],
        category: "физические лица",
        priority: 9
    },
    
    "услуги для юридических лиц": {
        answer: "🏢 <strong>Для юридических лиц Allora предлагает:</strong><br>• <strong>Бухгалтерские услуги</strong> — полное ведение учёта, отчётность<br>• <strong>Налоговые услуги</strong> — оптимизация, сопровождение проверок<br>• <strong>Ремонт и строительство офисов</strong> — под ключ<br>• <strong>Коммерческая недвижимость</strong> — подбор, оформление сделок<br>• <strong>Госзакупки</strong> — участие и сопровождение тендеров<br>• <strong>Юридические услуги</strong> — корпоративное право, арбитраж<br>• <strong>Страховые услуги</strong> — страхование бизнеса, сотрудников",
        keywords: ["юридические лица", "компаниям", "бизнесу", "организациям", "юрлица", "для бизнеса"],
        category: "юридические лица",
        priority: 9
    },
    
    "ремонт и строительство": {
        answer: "🏗️ <strong>Ремонт и строительство от Allora:</strong><br>• <strong>Просчёт стоимости ремонта</strong> — точная смета за 24 часа<br>• <strong>Дизайн-проект интерьера</strong> — 3D визуализация, подбор материалов<br>• <strong>Капитальный ремонт</strong> — квартир, домов, офисов<br>• <strong>Строительство домов</strong> — от фундамента до кровли<br>• <strong>Электромонтажные работы</strong> — полная замена проводки<br>• <strong>Сантехнические работы</strong> — современное оборудование<br>• <strong>Отделочные работы</strong> — качественные материалы, гарантия 3 года",
        keywords: ["ремонт", "строительство", "квартира", "дом", "офис", "дизайн", "отделка", "сантехника", "электрика"],
        category: "физические лица",
        priority: 8
    },
    
    "налоговые услуги": {
        answer: "📊 <strong>Налоговые услуги Allora:</strong><br>• <strong>Подача деклараций за вас</strong> — 3-НДФЛ, УСН, ЕНВД<br>• <strong>Помощь в оплате налогов</strong> — расчёт, сроки, льготы<br>• <strong>Оформление налоговых вычетов</strong> — ипотека, лечение, обучение<br>• <strong>Консультации по налогам</strong> — онлайн и офлайн<br>• <strong>Налоговое планирование</strong> — легальная оптимизация<br>• <strong>Сопровождение проверок</strong> — ФНС, ПФР, ФСС",
        keywords: ["налоги", "налоговая", "декларация", "3-ндфл", "вычет", "фнс", "упрощёнка"],
        category: "общее",
        priority: 7
    },
    
    "бухгалтерские услуги": {
        answer: "📈 <strong>Бухгалтерские услуги Allora:</strong><br>• <strong>Ведение бухгалтерского учёта</strong> — полный цикл<br>• <strong>Сдача отчётности</strong> — вовремя и без ошибок<br>• <strong>Расчёт заработной платы</strong> — начисление, налоги, отчёты<br>• <strong>Восстановление учёта</strong> — исправление ошибок прошлых периодов<br>• <strong>Кадровый учёт</strong> — трудовые договоры, отпуска, больничные<br>• <strong>Консультации по бухучёту</strong> — сложные ситуации",
        keywords: ["бухгалтерия", "бухучёт", "отчётность", "зарплата", "кадра", "1с", "финансы"],
        category: "юридические лица",
        priority: 7
    },
    
    "юридические услуги": {
        answer: "⚖️ <strong>Юридические услуги Allora:</strong><br>• <strong>Семейные споры</strong> — развод, раздел имущества, алименты<br>• <strong>Наследство</strong> — оформление, споры, завещания<br>• <strong>Составление договоров</strong> — купли-продажи, аренды, услуг<br>• <strong>Представительство в судах</strong> — защита интересов<br>• <strong>Жилищные споры</strong> — выселение, коммунальные услуги<br>• <strong>Защита прав потребителей</strong> — возврат товаров, компенсации",
        keywords: ["юрист", "юридические", "суд", "договор", "спор", "закон", "право", "адвокат"],
        category: "общее",
        priority: 6
    },
    
    "госзакупки": {
        answer: "🏛️ <strong>Участие в госзакупках с Allora:</strong><br>• <strong>Полное сопровождение участия</strong> — от поиска тендера до исполнения контракта<br>• <strong>Подготовка документации</strong> — заявки, обеспечение, квалификация<br>• <strong>Мониторинг тендеров</strong> — подбор выгодных закупок<br>• <strong>Исполнение контрактов</strong> — отчётность, приёмка, оплата<br>• <strong>Обжалование решений</strong> — в ФАС и судах<br>• <strong>Консультации по 44-ФЗ и 223-ФЗ</strong>",
        keywords: ["госзакупки", "тендер", "закупки", "госзаказ", "44-фз", "электронные торги", "контракт"],
        category: "юридические лица",
        priority: 5
    },
    
    "контакты": {
        answer: "📞 <strong>Контакты Allora:</strong><br>• <strong>Email:</strong> allora7307@gmail.com<br>• <strong>Телефон:</strong> +7 (XXX) XXX-XX-XX<br>• <strong>Адрес:</strong> [указать адрес офиса]<br>• <strong>Работаем:</strong> ежедневно с 9:00 до 21:00<br>• <strong>Консультация:</strong> первая консультация бесплатно<br>• <strong>Запись:</strong> через сайт, телефон или email",
        keywords: ["контакты", "адрес", "телефон", "email", "связаться", "офис", "график", "рабочее время"],
        category: "общее",
        priority: 4
    }
};

// ========== УМНАЯ ЛОГИКА ПОИСКА ==========
function intelligentSearch(question) {
    const lowerQ = question.toLowerCase();
    const foundTopics = [];
    
    // 1. Поиск по точным совпадениям в keywords
    for (const [topic, data] of Object.entries(knowledgeBase)) {
        for (const keyword of data.keywords) {
            if (lowerQ.includes(keyword.toLowerCase())) {
                foundTopics.push({
                    topic,
                    data,
                    matchType: 'keyword',
                    relevance: data.priority * 2 // Высокий приоритет за ключевые слова
                });
                break;
            }
        }
    }
    
    // 2. Поиск по частичному совпадению в названии темы
    for (const [topic, data] of Object.entries(knowledgeBase)) {
        if (lowerQ.includes(topic.toLowerCase())) {
            // Проверяем, не добавили ли уже эту тему по keyword
            if (!foundTopics.find(t => t.topic === topic)) {
                foundTopics.push({
                    topic,
                    data,
                    matchType: 'topic',
                    relevance: data.priority * 1.5
                });
            }
        }
    }
    
    // 3. Если ничего не найдено, ищем по общим словам
    if (foundTopics.length === 0) {
        const generalWords = ["помощь", "узнать", "расскажи", "как", "что", "где", "когда", "почему", "стоимость", "цена", "заказать"];
        
        for (const word of generalWords) {
            if (lowerQ.includes(word)) {
                // Возвращаем самые популярные темы
                return {
                    found: false,
                    answer: generateThinkingResponse(question),
                    suggestions: getTopTopics(8), // 8 самых релевантных тем
                    aiThinking: true
                };
            }
        }
    }
    
    // Сортируем по релевантности
    foundTopics.sort((a, b) => b.relevance - a.relevance);
    
    if (foundTopics.length > 0) {
        // Берём самую релевантную тему
        const bestMatch = foundTopics[0];
        
        // Получаем дополнительные темы для подсказок
        const suggestions = getRelatedTopics(bestMatch.topic, 6);
        
        return {
            found: true,
            answer: bestMatch.data.answer,
            suggestions: suggestions,
            category: bestMatch.data.category,
            aiThinking: false
        };
    }
    
    // Если совсем ничего не найдено
    return {
        found: false,
        answer: generateThinkingResponse(question),
        suggestions: getTopTopics(10), // 10 случайных тем
        aiThinking: true
    };
}

// Генерация "думающего" ответа
function generateThinkingResponse(question) {
    const responses = [
        `🤔 <strong>Анализирую ваш вопрос:</strong> "${question}"<br><br>Я вижу, вы интересуетесь услугами Allora. Позвольте предложить вам наиболее подходящие темы:`,
        `💭 <strong>Изучаю ваш запрос...</strong><br><br>На основе вашего вопроса я подобрал для вас варианты, которые могут быть полезны:`,
        `🧠 <strong>Обрабатываю информацию...</strong><br><br>Для того чтобы лучше помочь вам, рекомендую следующие темы про Allora:`,
        `🔍 <strong>Ищу информацию по вашему запросу...</strong><br><br>Вот что я могу рассказать вам об услугах Allora:`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

// Получить топовые темы
function getTopTopics(count) {
    const allTopics = Object.keys(knowledgeBase);
    
    // Сортируем по приоритету
    const sorted = allTopics.sort((a, b) => 
        knowledgeBase[b].priority - knowledgeBase[a].priority
    );
    
    return sorted.slice(0, count);
}

// Получить связанные темы
function getRelatedTopics(mainTopic, count) {
    const allTopics = Object.keys(knowledgeBase);
    const mainCategory = knowledgeBase[mainTopic].category;
    
    // Фильтруем по категории
    const related = allTopics.filter(topic => 
        knowledgeBase[topic].category === mainCategory && topic !== mainTopic
    );
    
    // Добавляем другие популярные, если не хватает
    if (related.length < count) {
        const otherTopics = allTopics.filter(topic => 
            knowledgeBase[topic].category !== mainCategory && topic !== mainTopic
        );
        related.push(...otherTopics.slice(0, count - related.length));
    }
    
    return related.slice(0, count);
}

// ========== API ==========
app.get('/health', (req, res) => res.send('OK'));

app.get('/api/info', (req, res) => {
    res.json({
        status: 'OK',
        version: 'v5.0 — УМНЫЙ AI С ДИНАМИЧЕСКИМ ПОИСКОМ',
        knowledgeSize: Object.keys(knowledgeBase).length,
        activeSessions: userSessions.size,
        message: 'AI думает и находит подходящие ответы на любые вопросы!'
    });
});

// API чата — УМНЫЙ ПОИСК
app.post('/api/chat', (req, res) => {
    try {
        const { message, sessionId = 'guest_' + Date.now() } = req.body;
        
        if (!userSessions.has(sessionId)) {
            userSessions.set(sessionId, { 
                messageCount: 0, 
                leadCollected: false,
                askedTopics: []
            });
        }
        
        const session = userSessions.get(sessionId);
        session.messageCount += 1;
        
        // Умный поиск ответа
        const result = intelligentSearch(message);
        
        // Запоминаем тему, если нашли
        if (result.found && !session.askedTopics.includes(result.category)) {
            session.askedTopics.push(result.category);
        }
        
        // Форма лида после 2-го ВАЖНОГО вопроса (не любого)
        let requiresLeadForm = false;
        if (!session.leadCollected && session.messageCount >= 2 && result.found) {
            requiresLeadForm = true;
        }
        
        // Добавляем флаг "AI думал" для фронтенда
        res.json({
            success: true,
            reply: result.answer,
            requiresLeadForm: requiresLeadForm,
            suggestions: result.suggestions,
            type: result.found ? 'knowledge' : 'ai_thinking',
            sessionId: sessionId,
            messageCount: session.messageCount,
            leadCollected: session.leadCollected,
            category: result.category || 'общее',
            aiThinking: result.aiThinking || false
        });
        
    } catch (error) {
        console.error('Ошибка в /api/chat:', error);
        res.status(500).json({ 
            success: false, 
            reply: '🧠 <strong>Произошла ошибка анализа.</strong> Попробуйте задать вопрос по-другому.',
            requiresLeadForm: false 
        });
    }
});

// API для лидов
app.post('/api/lead', (req, res) => {
    try {
        const { sessionId, name, phone, service } = req.body;
        
        if (!sessionId || !name || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Необходимы имя и телефон'
            });
        }
        
        if (!userSessions.has(sessionId)) {
            return res.status(404).json({ 
                success: false, 
                message: 'Сессия не найдена'
            });
        }
        
        const session = userSessions.get(sessionId);
        session.leadCollected = true;
        // НЕ сбрасываем счётчик! Продолжаем общение
        
        console.log('📝 ЛИД СОХРАНЁН:', { name, phone, service, questionCount: session.messageCount });
        
        res.json({
            success: true,
            message: '✅ Спасибо! Теперь я могу помочь вам ещё лучше. Задавайте следующие вопросы!',
            continueChat: true,
            suggestions: getTopTopics(8)
        });
        
    } catch (error) {
        console.error('Ошибка сохранения лида:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сохранения, но чат продолжается'
        });
    }
});

// Получить все темы (для фронтенда)
app.get('/api/topics', (req, res) => {
    res.json({
        topics: getTopTopics(12),
        categories: {
            "физические лица": Object.keys(knowledgeBase).filter(t => knowledgeBase[t].category === 'физические лица'),
            "юридические лица": Object.keys(knowledgeBase).filter(t => knowledgeBase[t].category === 'юридические лица'),
            "общее": Object.keys(knowledgeBase).filter(t => knowledgeBase[t].category === 'общее')
        }
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
        <title>🤖 AI Allora - Умный помощник с ИИ</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #0f1e5a 0%, #2d4d9c 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            
            .chat-container {
                width: 100%;
                max-width: 900px;
                height: 90vh;
                background: white;
                border-radius: 20px;
                box-shadow: 0 25px 70px rgba(0,0,0,0.5);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .chat-header {
                background: linear-gradient(135deg, #0f1e5a 0%, #1e3a8a 100%);
                color: white;
                padding: 25px 30px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .logo h1 {
                font-size: 26px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .ai-status {
                background: rgba(255,255,255,0.2);
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .ai-status::before {
                content: '🧠';
            }
            
            .chat-messages {
                flex: 1;
                padding: 30px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 25px;
            }
            
            .message {
                max-width: 85%;
                padding: 20px 25px;
                border-radius: 20px;
                line-height: 1.7;
                animation: fadeIn 0.4s ease;
                word-wrap: break-word;
            }
            
            .ai-message {
                background: linear-gradient(135deg, #f8faff 0%, #f1f5ff 100%);
                align-self: flex-start;
                border-bottom-left-radius: 5px;
                border: 2px solid #e6eeff;
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
            }
            
            .user-message {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 5px;
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
            }
            
            .ai-thinking {
                background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
                border: 2px solid #ffd54f;
                animation: pulse 2s infinite;
            }
            
            .ai-label {
                font-weight: 700;
                color: #1a237e;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
            }
            
            .suggestions-container {
                margin-top: 20px;
                padding: 20px;
                background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                border-radius: 15px;
                border: 2px solid #90caf9;
                animation: slideUp 0.5s ease;
            }
            
            .suggestions-title {
                color: #0d47a1;
                font-size: 16px;
                font-weight: 700;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .suggestions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 12px;
            }
            
            .topic-btn {
                background: white;
                border: 2px solid #2196f3;
                padding: 14px 20px;
                border-radius: 12px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                color: #1565c0;
                transition: all 0.3s ease;
                text-align: left;
                position: relative;
                overflow: hidden;
            }
            
            .topic-btn:hover {
                background: #e3f2fd;
                transform: translateY(-3px);
                box-shadow: 0 8px 20px rgba(33, 150, 243, 0.2);
            }
            
            .topic-btn::after {
                content: '→';
                position: absolute;
                right: 15px;
                top: 50%;
                transform: translateY(-50%);
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .topic-btn:hover::after {
                opacity: 1;
            }
            
            .topic-category {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
                font-weight: 500;
            }
            
            .lead-form {
                background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
                padding: 25px;
                border-radius: 15px;
                margin-top: 25px;
                border: 2px solid #81c784;
                animation: slideUp 0.5s ease;
            }
            
            .lead-form h3 {
                color: #2e7d32;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 20px;
            }
            
            .form-row {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .form-input {
                flex: 1;
                padding: 16px 20px;
                border: 2px solid #a5d6a7;
                border-radius: 10px;
                font-size: 16px;
                transition: all 0.3s;
            }
            
            .form-input:focus {
                border-color: #4caf50;
                box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
                outline: none;
            }
            
            .input-area {
                padding: 25px 30px;
                border-top: 2px solid #e0e0e0;
                display: flex;
                gap: 20px;
                background: #f9f9f9;
            }
            
            .message-input {
                flex: 1;
                padding: 18px 25px;
                border: 2px solid #ddd;
                border-radius: 25px;
                font-size: 17px;
                transition: all 0.3s;
            }
            
            .message-input:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
                outline: none;
            }
            
            .send-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 0 40px;
                border-radius: 25px;
                font-size: 17px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .send-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
            }
            
            .typing-indicator {
                padding: 15px 30px;
                color: #666;
                font-style: italic;
                display: none;
                align-items: center;
                gap: 10px;
            }
            
            .typing-dots {
                display: flex;
                gap: 5px;
            }
            
            .typing-dots span {
                width: 8px;
                height: 8px;
                background: #667eea;
                border-radius: 50%;
                animation: typing 1.4s infinite;
            }
            
            .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
            .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes pulse {
                0% { box-shadow: 0 5px 15px rgba(255, 213, 79, 0.3); }
                50% { box-shadow: 0 5px 25px rgba(255, 213, 79, 0.6); }
                100% { box-shadow: 0 5px 15px rgba(255, 213, 79, 0.3); }
            }
            
            @keyframes typing {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-10px); }
            }
            
            @media (max-width: 768px) {
                .chat-container {
                    height: 95vh;
                    border-radius: 15px;
                }
                
                .chat-messages {
                    padding: 20px;
                }
                
                .message {
                    max-width: 95%;
                    padding: 15px;
                }
                
                .form-row {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .suggestions-grid {
                    grid-template-columns: 1fr;
                }
                
                .input-area {
                    padding: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="chat-container">
            <div class="chat-header">
                <div class="header-content">
                    <div class="logo">
                        <h1>🤖 AI Allora Assistant</h1>
                    </div>
                    <div class="ai-status">Умный поиск активирован</div>
                </div>
            </div>
            
            <div class="chat-messages" id="chatWindow">
                <div class="message ai-message">
                    <div class="ai-label">🧠 Умный AI Allora</div>
                    <strong>Привет! Я AI-помощник компании Allora с интеллектуальным поиском.</strong><br><br>
                    • <strong>Задайте любой вопрос</strong> — я найду подходящую тему<br>
                    • <strong>Выберите тему ниже</strong> — получите подробный ответ<br>
                    • <strong>Я "думаю"</strong> и анализирую каждый запрос<br>
                    • <strong>Всегда предлагаю</strong> 6-8 подходящих вариантов
                </div>
                
                <div class="suggestions-container">
                    <div class="suggestions-title">🎯 Начните с этих популярных тем:</div>
                    <div class="suggestions-grid" id="initialTopics">
                        <!-- Динамически загрузится -->
                    </div>
                </div>
            </div>
            
            <div class="typing-indicator" id="typingIndicator">
                <span>AI анализирует ваш вопрос</span>
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
            
            <div class="input-area">
                <input type="text" class="message-input" id="messageInput" 
                       placeholder="Задайте любой вопрос или выберите тему выше..." 
                       autocomplete="off">
                <button class="send-btn" onclick="sendMessage()">Отправить</button>
            </div>
        </div>

        <script>
            const sessionId = 'smart_' + Date.now();
            localStorage.setItem('allora_session', sessionId);
            
            let messageCount = 0;
            const chatWindow = document.getElementById('chatWindow');
            
            // Загружаем начальные темы
            fetch('/api/topics')
                .then(r => r.json())
                .then(data => {
                    const container = document.getElementById('initialTopics');
                    const topics = data.topics.slice(0, 8);
                    
                    topics.forEach(topic => {
                        const btn = document.createElement('button');
                        btn.className = 'topic-btn';
                        btn.innerHTML = \`
                            <div>\${topic}</div>
                            <div class="topic-category">\${getCategoryLabel(topic, data)}</div>
                        \`;
                        btn.onclick = () => askQuestion(topic);
                        container.appendChild(btn);
                    });
                });
            
            function getCategoryLabel(topic, data) {
                if (data.categories["физические лица"].includes(topic)) return '👤 Для физлиц';
                if (data.categories["юридические лица"].includes(topic)) return '🏢 Для юрлиц';
                return '📋 Общее';
            }
            
            function askQuestion(question) {
                document.getElementById('messageInput').value = question;
                sendMessage();
            }
            
            async function sendMessage() {
                const input = document.getElementById('messageInput');
                const message = input.value.trim();
                
                if (!message) return;
                
                // Добавляем сообщение пользователя
                addMessage(message, 'user');
                messageCount++;
                input.value = '';
                
                // Скрываем начальные темы
                const initialTopics = document.getElementById('initialTopics');
                if (initialTopics) initialTopics.style.display = 'none';
                
                // Показываем индикатор "AI думает"
                showTyping();
                
                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            sessionId: sessionId, 
                            message: message 
                        })
                    });
                    
                    const data = await response.json();
                    hideTyping();
                    
                    // Добавляем ответ AI с особым стилем если он "думал"
                    addMessage(data.reply, 'ai', data.aiThinking);
                    
                    // Показываем подсказки
                    if (data.suggestions && data.suggestions.length > 0) {
                        showSuggestions(data.suggestions, data.category);
                    }
                    
                    // Показываем форму для лида
                    if (data.requiresLeadForm && !data.leadCollected) {
                        showLeadForm();
                    }
                    
                } catch (error) {
                    hideTyping();
                    addMessage('⚠️ Ошибка соединения с сервером', 'ai');
                }
            }
            
            function addMessage(text, sender, isThinking = false) {
                const messageDiv = document.createElement('div');
                
                if (sender === 'ai') {
                    messageDiv.className = isThinking ? 'message ai-message ai-thinking' : 'message ai-message';
                    messageDiv.innerHTML = \`
                        <div class="ai-label">\${isThinking ? '🧠 AI анализирует' : '🤖 Allora AI'}</div>
                        \${text}
                    \`;
                } else {
                    messageDiv.className = 'message user-message';
                    messageDiv.textContent = text;
                }
                
                chatWindow.appendChild(messageDiv);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
            
            function showSuggestions(suggestions, category) {
                const container = document.createElement('div');
                container.className = 'suggestions-container';
                
                const title = category ? \`💡 По теме "\${category}" также спрашивают:\` : '💡 Спросите также:';
                
                const grid = suggestions.map(suggestion => 
                    \`<button class="topic-btn" onclick="askQuestion('\${suggestion}')">
                        <div>\${suggestion}</div>
                        <div class="topic-category">Нажмите для ответа</div>
                    </button>\`
                ).join('');
                
                container.innerHTML = \`
                    <div class="suggestions-title">\${title}</div>
                    <div class="suggestions-grid">\${grid}</div>
                \`;
                
                chatWindow.appendChild(container);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
            
            function showTyping() {
                document.getElementById('typingIndicator').style.display = 'flex';
            }
            
            function hideTyping() {
                document.getElementById('typingIndicator').style.display = 'none';
            }
            
            function showLeadForm() {
                if (document.querySelector('.lead-form')) return;
                
                const formHTML = \`
                    <div class="lead-form">
                        <h3>👋 Давайте познакомимся!</h3>
                        <p>Оставьте контакты для продолжения подробной консультации</p>
                        <div class="form-row">
                            <input type="text" class="form-input" id="leadName" placeholder="Ваше имя" required>
                            <input type="tel" class="form-input" id="leadPhone" placeholder="Ваш телефон" required>
                        </div>
                        <button class="send-btn" onclick="saveLead()" style="width: 100%;">
                            ✅ Отправить и продолжить умное общение
                        </button>
                    </div>
                \`;
                
                chatWindow.innerHTML += formHTML;
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
            
            async function saveLead() {
                const name = document.getElementById('leadName').value.trim();
                const phone = document.getElementById('leadPhone').value.trim();
                
                if (!name || !phone) {
                    alert('Пожалуйста, заполните имя и телефон для продолжения');
                    return;
                }
                
                try {
                    const response = await fetch('/api/lead', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            sessionId: sessionId, 
                            name: name, 
                            phone: phone,
                            service: 'Умная консультация AI'
                        })
                    });
                    
                    const data = await response.json();
                    
                    // Удаляем форму
                    const forms = document.querySelectorAll('.lead-form');
                    forms.forEach(form => form.remove());
                    
                    if (data.success) {
                        addMessage('✅ ' + data.message, 'ai');
                        
                        // Показываем новые подсказки для продолжения
                        if (data.suggestions && data.suggestions.length > 0) {
                            showSuggestions(data.suggestions, 'продолжение');
                        }
                    }
                    
                } catch (error) {
                    alert('Ошибка сохранения, но продолжаем общение');
                    const forms = document.querySelectorAll('.lead-form');
                    forms.forEach(form => form.remove());
                    addMessage('🔄 Продолжаем наш разговор!', 'ai');
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

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 УМНЫЙ AI ALLORA ЗАПУЩЕН!');
    console.log('📡 Порт:', PORT);
    console.log('🌐 Чат: https://allora-chat-clean.onrender.com');
    console.log('🧠 Функции:');
    console.log('   • Интеллектуальный поиск по ключевым словам');
    console.log('   • "Думающие" ответы на неизвестные вопросы');
    console.log('   • 6-10 подходящих тем на любой запрос');
    console.log('   • Динамическая база знаний (легко расширять)');
    console.log('='.repeat(70));
});
