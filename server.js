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
const userSessions = new Map();

async function initLeadsFile() {
  try {
    await fs.access(LEADS_FILE);
  } catch {
    await fs.writeFile(LEADS_FILE, JSON.stringify([], null, 2));
  }
}

app.get('/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Сервер Allora AI работает!',
    time: new Date().toISOString(),
    mode: 'Улучшенный AI со сбором лидов',
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
      leads: leads.slice(-10)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка чтения лидов' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'guest' } = req.body;
    console.log('🤖 [AI] Вопрос от', sessionId, ':', message);
    
    const reply = getAIResponse(message);
    
    const alloraKeywords = ['allora', 'аллора', 'услуг', 'стоимость', 'контакт', 'работа', 'компани', 'сервис', 'сотрудничеств', 'заказ', 'проект', 'заявк'];
    const lowerMessage = message.toLowerCase();
    const isAlloraQuestion = alloraKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (isAlloraQuestion) {
      if (!userSessions.has(sessionId)) {
        userSessions.set(sessionId, { 
          alloraQuestions: 0, 
          firstQuestionTime: new Date(),
          collected: false,
          id: sessionId
        });
      }
      
      const session = userSessions.get(sessionId);
      session.alloraQuestions += 1;
      
      console.log('📊 [LEAD]', sessionId, 'вопросов о Allora:', session.alloraQuestions);
      
      if (session.alloraQuestions >= 2 && !session.collected) {
        const enhancedReply = reply + '\n\n🎯 **Заинтересованы в сотрудничестве?**\nМы можем обсудить ваш проект детальнее. Хотите, чтобы наш менеджер связался с вами? Если да, оставьте свои контакты.';
        
        res.json({
          success: true,
          reply: enhancedReply,
          timestamp: new Date().toISOString(),
          isAlloraQuestion: true,
          showLeadForm: true,
          sessionId: sessionId,
          alloraQuestions: session.alloraQuestions
        });
        return;
      }
    }
    
    res.json({
      success: true,
      reply: reply,
      timestamp: new Date().toISOString(),
      isAlloraQuestion: isAlloraQuestion,
      showLeadForm: false,
      sessionId: sessionId
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

app.post('/api/lead', async (req, res) => {
  try {
    const { name, email, phone, message, sessionId } = req.body;
    
    if (!sessionId || !userSessions.has(sessionId)) {
      return res.json({ success: false, message: "Сессия не найдена" });
    }
    
    const session = userSessions.get(sessionId);
    session.collected = true;
    
    const newLead = {
      id: uuidv4(),
      name,
      email,
      phone,
      message,
      sessionId,
      date: new Date().toISOString(),
      source: 'allora-chat',
      questionsCount: session.alloraQuestions || 0
    };
    
    let leads = [];
    try {
      const data = await fs.readFile(LEADS_FILE, 'utf-8');
      leads = JSON.parse(data);
    } catch (e) {
      leads = [];
    }
    
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initLeadsFile().then(() => {
  app.listen(PORT, () => {
    console.log('🚀 ============================================');
    console.log('🤖 ALLORA AI CHAT v2.1 ЗАПУЩЕН');
    console.log('📍 Порт:', PORT);
    console.log('📍 Тестовый endpoint: http://localhost:' + PORT + '/test');
    console.log('📞 Система лидов: АКТИВНА (после 2+ вопросов)');
    console.log('🚀 ============================================');
  });
});
