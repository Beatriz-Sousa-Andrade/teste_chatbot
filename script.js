// Configuração da URL com detecção automática de ambiente
const URL_BACKEND = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:6500'
    : 'https://chatbot-gemini-b9jl.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;
    
    // Recupera ou cria ID de sessão persistente
    let userSessionId = localStorage.getItem('chat_session_id') || crypto.randomUUID();
    localStorage.setItem('chat_session_id', userSessionId);

    // Seletores DOM
    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');

    // Utilitário para adicionar mensagens (com suporte a Markdown)
    function addMessageToChat(sender, text, type = 'normal') {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}-message ${sender}-message`;
        
        // Se a biblioteca 'marked' estiver carregada, renderiza markdown, senão usa texto puro
        const content = (type === 'normal' && typeof marked !== 'undefined') 
            ? marked.parse(text) 
            : text;

        msgDiv.innerHTML = `<strong>${sender}:</strong> <span>${content}</span>`;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Gerenciador de conexão
    function iniciarConversa() {
        if (socket?.connected) return;

        addMessageToChat('Sistema', 'Conectando à Membrana...', 'status');

        socket = io(URL_BACKEND, {
            transports: ['polling', 'websocket'],
            upgrade: true,
            timeout: 2000
        });

        socket.on('connect', () => {
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'status-online';
            addMessageToChat('Sistema', 'Conexão estabelecida.', 'status');
            messageInput.disabled = false;
        });

        socket.on('nova_mensagem', (data) => {
            addMessageToChat('Bot', data.texto);
        });

        socket.on('erro', (data) => {
            addMessageToChat('Erro', data.erro, 'error');
        });

        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            messageInput.disabled = true;
        });
    }

    // Envio de mensagens com validação
    function sendMessageToServer() {
        const text = messageInput.value.trim();
        if (!text || !socket?.connected) return;

        addMessageToChat('Você', text, 'user');
        
        socket.emit('enviar_mensagem', { 
            mensagem: text, 
            session_id: userSessionId 
        });
        
        messageInput.value = '';
    }

    // Listeners
    iniciarBtn.addEventListener('click', iniciarConversa);
    sendButton.addEventListener('click', sendMessageToServer);
    messageInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessageToServer());
});