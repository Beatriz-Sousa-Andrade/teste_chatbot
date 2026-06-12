const URL_BACKEND = (window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1')
    ? 'http://localhost:6500'
    : 'https://chatbot-gemini-b9jl.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    // Recupera ou cria um ID único para o usuário no navegador
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

    function addMessageToChat(sender, text, type = 'normal') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (sender.toLowerCase() === 'user') {
            messageElement.classList.add('user-message');
            sender = 'Você';
        } else if (sender.toLowerCase() === 'bot') {
            messageElement.classList.add('bot-message');
            sender = 'Bot';
        } else {
            messageElement.classList.add('status-message');
        }

        if (type === 'error') {
            messageElement.classList.add('error-text');
            sender = 'Erro';
        } else if (type === 'status') {
            messageElement.classList.add('status-text');
            sender = 'Status';
        }

        const senderSpan = document.createElement('strong');
        senderSpan.textContent = `${sender}: `;
        messageElement.appendChild(senderSpan);

        const textSpan = document.createElement('span');
        if (type === 'normal' && typeof marked !== 'undefined') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            textSpan.textContent = text;
        }
        messageElement.appendChild(textSpan);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    function iniciarConversa() {
        if (socket && socket.connected) return;

            socket = io(URL_BACKEND, {
                transports: ['polling', 'websocket'], // Mantém o polling para o handshake
                withCredentials: false,               // MUDE PARA FALSE (Isso costuma resolver o CORS em muitos casos)
                reconnection: true,
                timeout: 60000
            });

        socket.on('connect', () => {
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'status-online';
            addMessageToChat('Status', 'Conectado à Membrana.', 'status');
            setChatEnabled(true);
        });

        socket.on('nova_mensagem', (data) => {
            addMessageToChat('bot', data.texto);
        });

        socket.on('erro', (data) => {
            addMessageToChat('Erro', data.erro, 'error');
        });

        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            setChatEnabled(false);
        });
    }

    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '' || !socket?.connected) return;

        addMessageToChat('user', messageText);
        
        // ENVIO DO SESSION_ID: 
        // Agora enviamos o ID recuperado do localStorage para o servidor
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
    messageInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessageToServer());
});