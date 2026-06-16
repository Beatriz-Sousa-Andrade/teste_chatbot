// Configuração da URL com detecção automática de ambiente
const URL_BACKEND = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://chatbot-gemini-b9jl.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');

    let userSessionId = null;

    function showTypingIndicator() {
        if (document.getElementById('typing-indicator')) return;
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'bot-message');
        messageElement.id = 'typing-indicator';
        
        const senderSpan = document.createElement('strong');
        senderSpan.textContent = 'E.V.P.: ';
        messageElement.appendChild(senderSpan);

        const textSpan = document.createElement('span');
        textSpan.classList.add('typing-animation');
        textSpan.textContent = 'Decodificando sinal';
        messageElement.appendChild(textSpan);

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Função para adicionar mensagens no chat
    function addMessageToChat(sender, text, type = 'normal') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (sender.toLowerCase() === 'user') {
            messageElement.classList.add('user-message');
            sender = 'Agente';
        } else if (sender.toLowerCase() === 'bot') {
            messageElement.classList.add('bot-message');
            sender = 'E.V.P.';
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
        
        // Se for uma mensagem normal (bot ou usuário), renderiza o Markdown
        if (type === 'normal') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            // Se for erro ou status, mantém como texto puro
            textSpan.textContent = text;
        }
        
        messageElement.appendChild(textSpan);

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Função para habilitar/desabilitar o chat
    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    // Inicialmente desativa o chat
    setChatEnabled(false);
    connectionStatus.textContent = 'Desconectado';
    connectionStatus.className = 'status-offline';
    addMessageToChat('Status', 'Clique em "Iniciar Sessão" para estabelecer conexão com o Outro Lado.', 'status');

    // Função para conectar ao servidor
    function iniciarConversa() {
        if (socket && socket.connected) return;

        // Dentro da função iniciarConversa()
        addMessageToChat('Status', 'Tentando estabelecer conexão com ' + URL_BACKEND + '...', 'status');
        
        socket = io(URL_BACKEND, {
            secure: true,              // Garante que tentará wss://
            rejectUnauthorized: false  // Útil se houver problemas com certificado SSL no Render
        });

        socket.on('connect', () => {
            console.log('Conectado ao servidor Socket.IO! SID:', socket.id);
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'status-online';
            addMessageToChat('Status', 'Conectado ao servidor de chat.', 'status');
            setChatEnabled(true);
        });

        socket.on('disconnect', () => {
            console.log('Desconectado do servidor Socket.IO.');
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            addMessageToChat('Status', 'Você foi desconectado.', 'status');
            setChatEnabled(false);
        });

        socket.on('connect_error', (error) => {
            console.error('Erro de conexão:', error);
            addMessageToChat('Erro', 'Falha na conexão: ' + error.message + '. (O servidor pode estar dormindo ou offline)', 'error');
            setChatEnabled(false);
            connectionStatus.textContent = 'Erro de Conexão';
            connectionStatus.className = 'status-offline';
        });

        socket.on('status_conexao', (data) => {
            if (data.session_id) {
                userSessionId = data.session_id;
            }
        });

        socket.on('nova_mensagem', (data) => {
            removeTypingIndicator();
            addMessageToChat(data.remetente, data.texto);
        });

        socket.on('erro', (data) => {
            removeTypingIndicator();
            addMessageToChat('Erro', data.erro, 'error');
        });
    }

    // Função para encerrar a conversa
    function encerrarConversa() {
        if (socket && socket.connected) {
            socket.disconnect();
            setChatEnabled(false);
            addMessageToChat('Status', 'Conversa encerrada pelo usuário.', 'status');
        }
    }

    // Função para limpar as mensagens da tela
    function limparTela() {
        chatBox.innerHTML = ''; // Isso apaga todo o HTML de dentro da caixa de chat
        addMessageToChat('Status', 'Tela limpa.', 'status');
    }

    // Enviar mensagem para o servidor
    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        if (socket && socket.connected) {
            addMessageToChat('user', messageText);
            showTypingIndicator();
            socket.emit('enviar_mensagem', { mensagem: messageText });
            messageInput.value = '';
            messageInput.focus();
        } else {
            addMessageToChat('Erro', 'Não conectado ao servidor.', 'error');
        }
    }

    // Eventos dos botões
    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', encerrarConversa);
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessageToServer();
        }
    });
});
