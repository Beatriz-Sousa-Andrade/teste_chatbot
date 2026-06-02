// URL do backend (detecta automaticamente se está rodando localmente por file:// ou localhost, ou em produção no Render)
const URL_BACKEND = (window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.protocol === 'file:' || 
                     window.location.hostname === '')
    ? 'http://localhost:6500'
    : 'https://chatbot-gemini-b9jl.onrender.com';

console.log('Script.js carregado. URL_BACKEND configurada para:', URL_BACKEND);

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM totalmente carregado. Inicializando chatbot...');
    let socket = null;
    let userSessionId = null;

    // Elementos do DOM
    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');

    // Validação dos elementos do DOM para garantir que nenhum é nulo
    if (!chatBox || !messageInput || !sendButton || !connectionStatus || !iniciarBtn || !encerrarBtn || !limparBtn) {
        console.error('Erro: Alguns elementos do HTML não foram encontrados!', {
            chatBox: !!chatBox,
            messageInput: !!messageInput,
            sendButton: !!sendButton,
            connectionStatus: !!connectionStatus,
            iniciarBtn: !!iniciarBtn,
            encerrarBtn: !!encerrarBtn,
            limparBtn: !!limparBtn
        });
        alert('Erro ao inicializar o chat: Elementos HTML ausentes. Verifique o console (F12).');
        return;
    }

    // Função para adicionar mensagens no chat
    function addMessageToChat(sender, text, type = 'normal') {
        try {
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
            
            // Se for uma mensagem normal (bot ou usuário), renderiza o Markdown
            if (type === 'normal') {
                if (typeof marked !== 'undefined' && marked.parse) {
                    textSpan.innerHTML = marked.parse(text);
                } else {
                    console.warn('Biblioteca "marked" não carregada. Renderizando texto puro.');
                    textSpan.textContent = text;
                }
            } else {
                // Se for erro ou status, mantém como texto puro
                textSpan.textContent = text;
            }
            
            messageElement.appendChild(textSpan);
            chatBox.appendChild(messageElement);
            chatBox.scrollTop = chatBox.scrollHeight;
        } catch (error) {
            console.error('Erro ao adicionar mensagem na tela:', error);
        }
    }

    // Função para habilitar/desabilitar o chat
    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    // Inicialização da tela
    setChatEnabled(false);
    connectionStatus.textContent = 'Desconectado';
    connectionStatus.className = 'status-offline';
    addMessageToChat('Status', 'Clique em "Iniciar conversa" para começar.', 'status');

    // Função para conectar ao servidor
    function iniciarConversa() {
        console.log('Botão "Iniciar conversa" clicado.');
        if (socket && socket.connected) {
            console.log('Já existe um socket conectado.');
            return;
        }

        if (typeof io === 'undefined') {
            console.error('Biblioteca Socket.IO não foi carregada! Verifique sua conexão ou a tag <script> no HTML.');
            addMessageToChat('Erro', 'Biblioteca Socket.IO não carregada. Verifique se tem internet.', 'error');
            return;
        }

        // Configurações da conexão Socket.IO (permite polling como fallback com upgrade para websocket)
        const options = {
            transports: ['polling', 'websocket']
        };

        if (URL_BACKEND.startsWith('https')) {
            options.secure = true;
        }

        console.log(`Tentando conectar ao backend em: ${URL_BACKEND}`);
        addMessageToChat('Status', `Conectando ao servidor em ${URL_BACKEND}...`, 'status');

        try {
            socket = io(URL_BACKEND, options);

            socket.on('connect', () => {
                console.log('Conectado ao servidor Socket.IO! SID:', socket.id);
                connectionStatus.textContent = 'Conectado';
                connectionStatus.className = 'status-online';
                addMessageToChat('Status', 'Conectado ao servidor de chat com sucesso!', 'status');
                setChatEnabled(true);
            });

            socket.on('disconnect', () => {
                console.log('Desconectado do servidor Socket.IO.');
                connectionStatus.textContent = 'Desconectado';
                connectionStatus.className = 'status-offline';
                addMessageToChat('Status', 'Você foi desconectado.', 'status');
                setChatEnabled(false);
            });

            socket.on('status_conexao', (data) => {
                console.log('Evento status_conexao recebido:', data);
                if (data.session_id) {
                    userSessionId = data.session_id;
                }
            });

            socket.on('nova_mensagem', (data) => {
                console.log('Nova mensagem recebida do bot:', data);
                addMessageToChat(data.remetente, data.texto);
            });

            socket.on('erro', (data) => {
                console.error('Erro recebido do servidor:', data);
                addMessageToChat('Erro', data.erro, 'error');
            });

            socket.on('connect_error', (error) => {
                console.error('Erro na conexão com o servidor:', error);
                addMessageToChat('Erro', `Não foi possível conectar ao servidor (${error.message}). Se for local, certifique-se de que o Flask está rodando.`, 'error');
            });

        } catch (err) {
            console.error('Exceção ao tentar abrir socket:', err);
            addMessageToChat('Erro', `Erro crítico na conexão: ${err.message}`, 'error');
        }
    }

    // Função para encerrar a conversa
    function encerrarConversa() {
        console.log('Botão "Encerrar conversa" clicado.');
        if (socket && socket.connected) {
            socket.disconnect();
            setChatEnabled(false);
            addMessageToChat('Status', 'Conversa encerrada pelo usuário.', 'status');
        } else {
            console.log('Nenhum chat ativo para encerrar.');
        }
    }

    // Função para limpar as mensagens da tela
    function limparTela() {
        console.log('Botão "Limpar tela" clicado.');
        chatBox.innerHTML = '';
        addMessageToChat('Status', 'Tela limpa.', 'status');
    }

    // Enviar mensagem para o servidor
    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        if (socket && socket.connected) {
            console.log('Enviando mensagem para o servidor:', messageText);
            addMessageToChat('user', messageText);
            socket.emit('enviar_mensagem', { mensagem: messageText });
            messageInput.value = '';
            messageInput.focus();
        } else {
            console.warn('Tentativa de envio de mensagem sem conexão ativa.');
            addMessageToChat('Erro', 'Não conectado ao servidor. Clique em "Iniciar conversa" primeiro.', 'error');
        }
    }

    // Registrar Eventos dos botões com log de depuração
    console.log('Registrando ouvintes de eventos nos botões...');
    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', encerrarConversa);
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessageToServer();
        }
    });

    console.log('Chatbot inicializado com sucesso no front-end.');
});
