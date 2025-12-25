import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs/promises';
import { getAIResponse } from './ai-logic.js';

// ES6 модули не имеют __dirname, создаем его
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Файл для хранения лидов
const LEADS_FILE = 'leads.json';

// Трекер сессий для сбора лидов
const userSessions = new Map();

// Инициализация файла лидов
async function initLeadsFile() {
  try {
    await fs.access(LEADS_FILE);
  } catch {
    await fs.writeFile(LEADS_FILE, JSON.stringify([], null, 2));
  }
}

// Тестовый endpoint
app.get('/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Сервер Allora AI работает!',
    time: new Date().toISOString(),
    mode: 'Улучшенный локальный AI',
    endpoints: {
      chat: 'POST /api/chat',
      leads: 'GET /api/leads?secret=allora_admin_2024',
      health: 'GET /health'
    }
  });
});

// Health check для хостингов
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Получение всех лидов
app.get('/api/leads', async (req, res) => {
  try {
    const secret = req.query.secret;
    if (secret !== 'allora_admin_2024') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const data = await fs.readFile(LEADS_FILE, 'utf-8');
    const leads = JSON.parse(data);
    res.json({ 
      count: leads.length,
      leads: leads.slice(-10) // Последние 10 лидов
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка чтения лидов' });
  }
});

// Чат endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'guest' } = req.body;
    console.log('🤖 [AI] Вопрос от', sessionId, ':', message);
    
    // Улучшенная логика ответов
    const reply = getAIResponse(message);
    
    // Отслеживание вопросов о Allora для сбора лидов
    const alloraKeywords = ['allora', 'аллора', 'услуг', 'стоимость', 'контакт', 'работа', 'компани', 'сервис', 'сотрудничеств'];
    const lowerMessage = message.toLowerCase();
    const isAlloraQuestion = alloraKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (isAlloraQuestion && sessionId !== 'guest') {
      if (!userSessions.has(sessionId)) {
        userSessions.set(sessionId, { alloraQuestions: 0, firstQuestionTime: new Date() });
      }
      
      const session = userSessions.get(sessionId);
      session.alloraQuestions += 1;
      
      console.log('📊 [LEAD]', sessionId, 'вопросов о Allora:', session.alloraQuestions);
      
      // После 2+ вопросов предлагаем оставить контакты
      if (session.alloraQuestions >= 2) {
        const enhancedReply = reply + '\n\n🎯 **Заинтересованы в сотрудничестве?**\nМы можем обсудить ваш проект детальнее. Хотите, чтобы наш менеджер связался с вами?';
        
        res.json({
          success: true,
          reply: enhancedReply,
          timestamp: new Date().toISOString(),
          isAlloraQuestion: true,
          showLeadForm: true,
          sessionId: sessionId
        });
        return;
      }
    }
    
    res.json({
      success: true,
      reply: reply,
      timestamp: new Date().toISOString(),
      isAlloraQuestion: isAlloraQuestion,
      showLeadForm: false
    });
    
  } catch (error) {
    console.error('❌ Ошибка в чате:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера',
      reply: 'Произошла техническая ошибка. Пожалуйста, попробуйте еще раз через минуту.'
    });
  }
});

// Endpoint для сбора лидов
app.post('/api/lead', async (req, res) => {
  try {
    const { name, email, phone, message, sessionId } = req.body;
    
    const newLead = {
      id: Date.now(),
      name,
      email,
      phone,
      message,
      sessionId,
      date: new Date().toISOString(),
      source: 'allora-chat'
    };
    
    // Читаем существующие лиды
    let leads = [];
    try {
      const data = await fs.readFile(LEADS_FILE, 'utf-8');
      leads = JSON.parse(data);
    } catch (e) {
      leads = [];
    }
    
    // Добавляем новый лид
    leads.push(newLead);
    await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
    
    console.log('🎯 [NEW LEAD]', newLead);
    
    res.json({
      success: true,
      message: 'Спасибо! Ваши контакты сохранены. Наш менеджер свяжется с вами в ближайшее время.',
      leadId: newLead.id
    });
    
  } catch (error) {
    console.error('Ошибка сохранения лида:', error);
    res.status(500).json({ success: false, error: 'Ошибка сохранения данных' });
  }
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Инициализация и запуск
initLeadsFile().then(() => {
  app.listen(PORT, () => {
    console.log('🚀 ============================================');
    console.log('🤖 ALLORA AI CHAT v2.0 ЗАПУЩЕН');
    console.log('📍 Локальный URL: http://localhost:' + PORT);
    console.log('📍 Тестовый endpoint: http://localhost:' + PORT + '/test');
    console.log('🌐 Готов к размещению в интернете!');
    console.log('📦 Следующий шаг: загрузите на хостинг');
    console.log('🚀 ============================================');
    console.log('\n📋 ДЛЯ РАЗМЕЩЕНИЯ В ИНТЕРНЕТЕ:');
    console.log('1. Создайте аккаунт на Render.com или Railway.app');
    console.log('2. Загрузите эту папку в GitHub');
    console.log('3. Подключите репозиторий к хостингу');
    console.log('4. Получите публичный URL для WordPress сайта');
  });
});
