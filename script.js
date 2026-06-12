const URL_BACKEND = (window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1')
    ? 'http://localhost:6500'
    : 'https://chatbot-gemini-b9jl.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;
    let userSessionId = localStorage.getItem('chat_session_id') || crypto.randomUUID();
    localStorage.setItem('chat_session_id', userSessionId);

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');

    function addMessageToChat(sender, text, type = 'normal') {
        const msgDiv = document.createElement('div');
        if(type === 'loading') msgDiv.id = 'bot-loading-msg';
        msgDiv.className = `message ${sender}-message`;
        msgDiv.innerHTML = `<strong>${sender}:</strong> <span>${type === 'normal' ? marked.parse(text) : text}</span>`;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function iniciarConversa() {
        if (socket?.connected) return;

        // Conexão simplificada para evitar erro 400
        socket = io(URL_BACKEND, {
            transports: ['polling', 'websocket'],
            upgrade: true,
            timeout: 60000 
        });

        socket.on('connect', () => {
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'status-online';
            addMessageToChat('Sistema', 'Conectado à Membrana.', 'status');
        });

        socket.on('nova_mensagem', (data) => {
            document.getElementById('bot-loading-msg')?.remove();
            addMessageToChat('Bot', data.texto);
        });

        socket.on('connect_error', (err) => {
            console.error('Erro de conexão:', err);
            addMessageToChat('Sistema', 'Erro ao conectar. Tente novamente.', 'error');
        });
    }

    function sendMessageToServer() {
        const text = messageInput.value.trim();
        if (!text || !socket?.connected) return;

        addMessageToChat('User', text);
        addMessageToChat('Bot', 'Consultando...', 'loading');
        
        socket.emit('enviar_mensagem', { mensagem: text, session_id: userSessionId });
        messageInput.value = '';
    }

    document.getElementById('iniciarBtn').addEventListener('click', iniciarConversa);
    document.getElementById('send-button').addEventListener('click', sendMessageToServer);
    messageInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessageToServer());
});
