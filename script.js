// URL do backend
const URL_BACKEND = (window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.protocol === 'file:')
    ? 'http://localhost:6500'
    : 'https://chatbot-gemini-b9jl.onrender.com';

console.log('Script.js carregado. URL_BACKEND configurada para:', URL_BACKEND);

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM totalmente carregado. Inicializando chatbot...');
    let socket = null;
    
    // MUDANÇA: Geramos ou recuperamos o ID do usuário localmente
    let userSessionId = localStorage.getItem('chat_session_id');
    if (!userSessionId) {
        userSessionId = crypto.randomUUID();
        localStorage.setItem('chat_session_id', userSessionId);
    }

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');

    if (!chatBox || !messageInput || !sendButton || !connectionStatus || !iniciarBtn || !encerrarBtn || !limparBtn) {
        console.error('Erro: Elementos HTML ausentes.');
        return;
    }

    function addMessageToChat(sender, text, type = 'normal') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender === 'user' ? 'user-message' : (sender === 'bot' ? 'bot-message' : 'status-message'));

        const senderSpan = document.createElement('strong');
        senderSpan.textContent = `${sender.charAt(0).toUpperCase() + sender.slice(1)}: `;
        
        const textSpan = document.createElement('span');
        if (type === 'normal' && typeof marked !== 'undefined') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            textSpan.textContent = text;
        }
        
        messageElement.appendChild(senderSpan);
        messageElement.appendChild(textSpan);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function iniciarConversa() {
        if (socket && socket.connected) return;

        socket = io(URL_BACKEND);

        socket.on('connect', () => {
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'status-online';
            messageInput.disabled = false;
            sendButton.disabled = false;
            addMessageToChat('status', 'Conectado com sucesso!');
        });

        socket.on('nova_mensagem', (data) => {
            addMessageToChat('bot', data.texto);
        });

        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            messageInput.disabled = true;
            sendButton.disabled = true;
        });
    }

    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '' || !socket.connected) return;

        addMessageToChat('user', messageText);
        
        // MUDANÇA: Enviamos o ID manualmente junto com a mensagem
        socket.emit('enviar_mensagem', { 
            mensagem: messageText, 
            session_id: userSessionId 
        });
        
        messageInput.value = '';
    }

    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', () => socket?.disconnect());
    limparBtn.addEventListener('click', () => chatBox.innerHTML = '');
    sendButton.addEventListener('click', sendMessageToServer);
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessageToServer();
    });
});
