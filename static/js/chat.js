let mdChat;
let chatHistory = []; // 🧠 上下文记忆

export function initChat() {
    if (window.markdownit) {
        mdChat = window.markdownit({ html: false, linkify: true, highlight: highlightCode });
    }

    // 1. 初始化窗口拖拽
    setupDrag('chat-window', 'chat-header');
    
    // 2. 初始化图标拖拽 (新增)
    setupDrag('chat-trigger', 'chat-trigger');

    setupChatLogic();
}

/**
 * 通用拖拽逻辑
 * @param {string} elementId - 要移动的元素 ID
 * @param {string} handleId - 鼠标按下的把手 ID
 */
function setupDrag(elementId, handleId) {
    const el = document.getElementById(elementId);
    const handle = document.getElementById(handleId);
    if (!el || !handle) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let hasMoved = false; // 用于区分是点击还是拖拽

    handle.addEventListener('mousedown', (e) => {
        // 如果是图标，阻止默认点击行为以免触发打开窗口
        if(elementId === 'chat-trigger') hasMoved = false;

        const rect = el.getBoundingClientRect();
        // 转换为 fixed 定位坐标
        initialLeft = rect.left;
        initialTop = rect.top;
        startX = e.clientX;
        startY = e.clientY;
        
        // 关键：一旦开始拖拽，清除 bottom/right，改为 left/top 控制
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        el.style.left = `${initialLeft}px`;
        el.style.top = `${initialTop}px`;

        isDragging = true;
        el.classList.add('dragging');
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // 简单的防抖，移动超过 2px 才算拖拽
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved = true;
        
        el.style.left = `${initialLeft + dx}px`;
        el.style.top = `${initialTop + dy}px`;
    }

    function onMouseUp(e) {
        isDragging = false;
        el.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // 如果是图标且没有发生位移，视为点击，手动触发 click 事件
        if (elementId === 'chat-trigger' && !hasMoved) {
            handleIconClick(); 
        }
    }
}

// 专门处理图标点击（因为 mousedown 拦截了默认 click）
function handleIconClick() {
    const windowEl = document.getElementById('chat-window');
    const inputEl = document.getElementById('chat-input');
    windowEl.classList.toggle('visible');
    if (windowEl.classList.contains('visible')) inputEl.focus();
}

function setupChatLogic() {
    // 图标点击逻辑移交给了 handleIconClick，这里只需处理关闭和发送
    const closeBtn = document.getElementById('chat-close');
    const sendBtn = document.getElementById('chat-send');
    const inputEl = document.getElementById('chat-input');
    const messagesEl = document.getElementById('chat-messages');
    
    closeBtn.addEventListener('click', () => document.getElementById('chat-window').classList.remove('visible'));

    // 发送消息
    const sendMessage = async () => {
        const text = inputEl.value.trim();
        if (!text) return;

        // 1. UI更新：添加用户消息
        addMessage(text, 'user');
        inputEl.value = '';
        sendBtn.disabled = true;

        // 2. 🧠 记忆更新：添加用户记录
        chatHistory.push({ role: 'user', content: text });

        // 3. UI更新：添加 AI 思考中占位
        const aiMsgId = `ai-${Date.now()}`;
        const aiContentEl = addMessage('Thinking...', 'ai', aiMsgId);
        
        try {
            // 4. 发送完整历史记录
            const response = await fetch('/chat_stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // 改为 JSON 发送
                body: JSON.stringify({ messages: chatHistory })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullReply = '';
            
            aiContentEl.innerHTML = ''; // 清空 Thinking

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                // 简单的错误处理：如果返回的是 Error: 开头
                if (chunk.startsWith('Error:')) {
                    throw new Error(chunk);
                }
                
                fullReply += chunk;
                aiContentEl.innerHTML = mdChat ? mdChat.render(fullReply) : fullReply;
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }

            // 5. 🧠 记忆更新：添加 AI 完整回复
            chatHistory.push({ role: 'assistant', content: fullReply });

            // 记忆限制：只保留最近 10 轮，防止 token 爆炸
            if (chatHistory.length > 30) chatHistory = chatHistory.slice(-30);

        } catch (err) {
            aiContentEl.innerHTML += `<br><span style="color:red">[系统错误: ${err.message}]</span>`;
            // 出错的话，把刚才用户的消息从记忆里删掉，以便重试
            chatHistory.pop(); 
        } finally {
            sendBtn.disabled = false;
            inputEl.focus();
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function addMessage(text, role, id = null) {
    const messagesEl = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    if (id) msgDiv.id = id;
    if (role === 'user') msgDiv.textContent = text;
    else msgDiv.innerHTML = text;
    messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msgDiv;
}

function highlightCode(str, lang) {
    return `<pre><code class="language-${lang}">${str}</code></pre>`;
}