import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs/promises';
import { getAIResponse } from './ai-logic.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const LEADS_FILE = 'leads.json';
const userSessions = new Map(); // {sessionId: {alloraQuestions: number}}

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
    mode: 'ЛИДЫ после 2 вопросов про Allora',
    endpoints: {
      chat: 'POST /api/chat',
      leads: 'GET /api/leads?secret=allora_admin_2024',
      health: 'GET /health'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Просмотр лидов
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
      leads: leads.slice(-20)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка чтения лидов' });
  }
});

// ОСНОВНОЙ ЧАТ ENDPOINT
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'guest_' + Date.now() } = req.body;
    console.log('💬 [Чат]', sessionId.substring(0, 10), ':', message.substring(0, 50));
    
    // 1. Определяем вопрос про Allora
    const alloraKeywords = [
      'allora', 'аллора', 'услуг', 'стоимость', 'цен', 'сколько стоит',
      'прайс', 'бюджет', 'контакт', 'работа', 'компани', 'сервис',
      'сотрудничеств', 'заказ', 'проект', 'заявк', 'расценк', 'тариф'
    ];
    
    const lowerMessage = message.toLowerCase();
    const isAlloraQuestion = alloraKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // 2. Обновляем счётчик вопросов про Allora
    if (!userSessions.has(sessionId)) {
      userSessions.set(sessionId, { alloraQuestions: 0 });
    }
    
    const session = userSessions.get(sessionId);
    let showLeadForm = false;
    
    if (isAlloraQuestion) {
      session.alloraQuestions += 1;
      console.log(`📊 [Allora вопрос #${session.alloraQuestions}] для ${sessionId.substring(0, 10)}`);
    }
    
    // 3. Проверяем нужно ли показывать форму (после 2+ вопросов)
    const isSecondOrMoreAlloraQuestion = session.alloraQuestions >= 2;
    
    // 4. Получаем ответ от AI
    const reply = getAIResponse(message, isSecondOrMoreAlloraQuestion);
    
    // 5. Если это 2+ вопрос про Allora — показываем форму
    if (isSecondOrMoreAlloraQuestion && isAlloraQuestion) {
      showLeadForm = true;
      console.log(`🎯 [ПРЕДЛАГАЮ ЛИД] ${sessionId.substring(0, 10)} (вопросов: ${session.alloraQuestions})`);
    }
    
    // 6. Отправляем ответ
    res.json({
      success: true,
      reply: reply,
      timestamp: new Date().toISOString(),
      showLeadForm: showLeadForm,
      sessionId: sessionId,
      alloraQuestions: session.alloraQuestions,
      isAlloraQuestion: isAlloraQuestion
    });
    
  } catch (error) {
    console.error('❌ Ошибка в чате:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера',
      reply: 'Произошла техническая ошибка. Пожалуйста, попробуйте еще раз.'
    });
  }
});

// СОХРАНЕНИЕ ЛИДА (когда клиент заполнил форму)
app.post('/api/lead', async (req, res) => {
  try {
    const { name, email, phone, message, sessionId } = req.body;
    
    const newLead = {
      id: uuidv4(),
      name: name || 'Не указано',
      email: email || 'Не указано',
      phone: phone || 'Не указано',
      message: message || 'Хочет познакомиться',
      sessionId: sessionId || 'unknown',
      date: new Date().toISOString(),
      source: 'allora-chat',
      status: 'new'
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
    
    console.log('🎯 [НОВЫЙ ЛИД СОХРАНЁН]', {
      id: newLead.id,
      name: newLead.name,
      email: newLead.email
    });
    
    // Удаляем сессию после сохранения лида
    if (sessionId && userSessions.has(sessionId)) {
      userSessions.delete(sessionId);
    }
    
    res.json({
      success: true,
      message: 'Спасибо! Наш специалист свяжется с вами в течение 1 рабочего дня.',
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
    console.log('🤖 ALLORA AI CHAT v3.1 ЗАПУЩЕН');
    console.log('📍 Порт:', PORT);
    console.log('🎯 ЛИДЫ: после 2+ вопросов про Allora');
    console.log('💬 Фраза: "ОЙ ДАВАЙТЕ С ВАМИ ПОЗНАКОМИМСЯ БЛИЖЕ..."');
    console.log('🚀 ============================================');
    console.log('\n📊 Проверка лидов:');
    console.log('   curl https://allora-chat-clean.onrender.com/api/leads?secret=allora_admin_2024');
  });
});
