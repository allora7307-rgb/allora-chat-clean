// === ЗАМЕНИТЕ ВАШ ТЕКУЩИЙ SCRIPT НА ЭТОТ ===

let sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let questionCount = 0;
let authorized = false;

function showTyping() {
    document.getElementById('typing-indicator').style.display = 'block';
    const messagesDiv = document.getElementById('chat-messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function hideTyping() {
    document.getElementById('typing-indicator').style.display = 'none';
}

function addMessage(text, isUser = false, type = 'general') {
    hideTyping();
    
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const typeIcons = {
        'company_info': '🏢',
        'services_info': '🛠️',
        'ai_generated': '🤖',
        'general': '💬',
        'contact_hint': '📞'
    };
    
    const icon = typeIcons[type] || '💬';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${isUser ? '👤' : '🤖'}</div>
        <div class="message-content">
            <div class="message-text">${text.replace(/\n/g, '<br>')}</div>
            <div class="message-type">
                <span>${icon} ${type === 'ai_generated' ? 'ИИ-ответ' : 'Allora помощник'}</span>
            </div>
        </div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    addMessage(message, true);
    input.value = '';
    
    questionCount++;
    
    showTyping();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message, 
                sessionId 
            })
        });
        
        const data = await response.json();
        console.log('Ответ сервера:', data); // Для отладки
        
        if (data.success) {
            setTimeout(() => {
                addMessage(data.reply, false, data.type || 'general');
                
                // Показываем модальное окно при необходимости
                if (data.requiresLeadForm && !authorized) {
                    setTimeout(() => {
                        showLeadModal();
                    }, 800);
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        hideTyping();
        addMessage('Извините, произошла ошибка соединения. Попробуйте еще раз.', false, 'general');
    }
}

function sendQuickTopic(text) {
    document.getElementById('user-input').value = text;
    sendMessage();
}

function showLeadModal() {
    console.log('Показываем модальное окно для контактов');
    document.getElementById('lead-modal').style.display = 'flex';
}

function hideLeadModal() {
    document.getElementById('lead-modal').style.display = 'none';
}

async function submitLead() {
    const name = document.getElementById('lead-name').value.trim();
    const email = document.getElementById('lead-email').value.trim();
    const phone = document.getElementById('lead-phone').value.trim();
    
    if (!email && !phone) {
        alert('Пожалуйста, укажите email или телефон для продолжения работы');
        return;
    }
    
    try {
        const response = await fetch('/api/lead', {  // Используем /api/lead
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId, 
                email, 
                phone, 
                name 
            })
        });
        
        const data = await response.json();
        console.log('Ответ на заявку:', data);
        
        if (data.success) {
            authorized = true;
            hideLeadModal();
            addMessage(data.message, false, 'general');
        } else {
            alert('Ошибка: ' + (data.message || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка отправки:', error);
        alert('Ошибка при отправке данных. Пожалуйста, попробуйте еще раз.');
    }
}

function skipLead() {
    hideLeadModal();
    addMessage('Хорошо, продолжаем общение. Что еще вас интересует?', false, 'general');
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Фокус на input при загрузке
window.onload = function() {
    document.getElementById('user-input').focus();
    console.log('Сессия начата:', sessionId);
};
