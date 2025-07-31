'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM 元素获取 ---
    const DOM = {
        root: document.documentElement,
        body: document.body,
        markdownInput: document.getElementById('markdown-input'),
        previewOutput: document.getElementById('preview-pane'),
        previewPlaceholder: document.getElementById('preview-placeholder'),
        editorPane: document.getElementById('editor-pane'),
        resizer: document.getElementById('resizer'),
        downloadBtn: document.getElementById('download-btn'),
        clearBtn: document.getElementById('clear-btn'),
        formulaToggle: document.getElementById('formula-toggle'),
        themeToggle: document.getElementById('theme-toggle'),
        themeIconLight: document.getElementById('theme-icon-light'),
        themeIconDark: document.getElementById('theme-icon-dark'),
        fontSizeSlider: document.getElementById('font-size-slider'),
        fontSizeDisplay: document.getElementById('font-size-display'),
        toastContainer: document.getElementById('toast-container'),
        loginBtn: document.getElementById('login-btn'),
        // 新增或修改的DOM元素
        logo: document.getElementById('logo'),
        logoText: document.getElementById('logo-text'),
        adBoard: document.getElementById('ad-board'),
        poetryContainer: document.getElementById('poetry-container'),
        welcomeMessage: document.getElementById('welcome-message'), // V37 新增
        downloadBtnIconWrapper: document.querySelector('#download-btn .btn-icon-wrapper'), // V37 新增
    };

    // --- 2. 状态与变量 ---
    let md;
    let idleTimer;
    let logoClickCount = 0;
    let poetryTimeout;

    // --- 彩蛋数据 ---
    const EASTER_EGGS = {
        logoQuotes: [
            "Stay hungry, stay foolish. - Steve Jobs",
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Talk is cheap. Show me the code. - Linus Torvalds",
            "Any fool can write code that a computer can understand. Good programmers write code that humans can understand. - Martin Fowler"
        ],
        poetry: {
            code: ["代码是写给人读的，附带能在机器上运行。", "在代码的世界里，我们都是造物主。"],
            love: ["爱是恒久忍耐，又有恩慈。", "因为爱，我们看见了整个宇宙。"],
            life: ["生活不止眼前的苟且，还有诗和远方的田野。", "我思故我在。 - 笛卡尔"]
        },
        // V36: 日与夜的诗彩蛋数据
        dayQuotes: ["白日依山尽，黄河入海流。", "朝辞白帝彩云间，千里江陵一日还。"],
        nightQuotes: ["月落乌啼霜满天，江枫渔火对愁眠。", "晚来天欲雪，能饮一杯无？"]
    };

    // --- 3. 核心初始化函数 ---
    function init() {
        if (!checkDependencies()) return;

        md = window.markdownit({
            html: true,
            linkify: true,
            typographer: true,
            highlight: highlightCode
        });

        setupEventListeners();
        setupTheme();
        setupFontSize();
        setupResizer();
        setupWelcomeMessage(); // V37: 新增欢迎语设置

        // V38: 使用全新的引导文本
        DOM.markdownInput.value = getInitialMarkdownText();
        updatePreview();
        resetIdleTimer();
    }

    function checkDependencies() {
        if (typeof window.markdownit === 'undefined' || typeof window.MathJax === 'undefined') {
            DOM.previewPlaceholder.innerHTML = `<p class="error-msg">错误：核心库加载失败，请检查网络连接。</p>`;
            return false;
        }
        return true;
    }

    // --- 4. 功能设置模块 ---
    function setupEventListeners() {
        DOM.markdownInput.addEventListener('input', debounce(handleInput, 250));
        DOM.clearBtn.addEventListener('click', handleClear);
        DOM.downloadBtn.addEventListener('click', handleDownload);
        DOM.formulaToggle.addEventListener('change', updatePreview);
        DOM.themeToggle.addEventListener('click', handleThemeToggle);
        DOM.fontSizeSlider.addEventListener('input', handleFontSlider);
        setupLoginButton(); // V37: 调整登录按钮设置
        DOM.logo.addEventListener('click', handleLogoClick);

        ['mousemove', 'keydown', 'scroll'].forEach(evt => document.addEventListener(evt, resetIdleTimer));
    }

    function setupResizer() {
        const resizer = DOM.resizer;
        resizer.addEventListener('mousedown', function(e) {
            e.preventDefault();
            resizer.classList.add('active');
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });

        function handleMouseMove(e) {
            const container = DOM.editorPane.parentElement;
            const newLeftWidth = e.clientX - container.offsetLeft;
            if (newLeftWidth > 200 && (container.offsetWidth - newLeftWidth - resizer.offsetWidth) > 200) {
                DOM.editorPane.style.width = `${newLeftWidth}px`;
                DOM.previewOutput.style.width = `calc(100% - ${newLeftWidth}px - ${resizer.offsetWidth}px)`;
            }
        }

        function handleMouseUp() {
            resizer.classList.remove('active');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }

    function setupFontSize() {
        const slider = DOM.fontSizeSlider;
        const savedSize = localStorage.getItem('editorFontSize') || 16;
        slider.value = savedSize;
        applyFontSize(savedSize);
    }

    function setupTheme() {
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
    }

    // --- 5. 核心与彩蛋辅助函数 ---

    function setupWelcomeMessage() { // V37: 新增欢迎语函数
        const hour = new Date().getHours();
        let msg = '欢迎使用, ';
        if (hour < 6) { msg = '夜深了, 注意休息哦'; }
        else if (hour < 12) { msg = '早上好, 开始新的一天吧'; }
        else if (hour < 18) { msg = '下午好, 来杯咖啡么'; }
        else { msg = '晚上好, 享受创作的宁静'; }
        DOM.welcomeMessage.textContent = msg;
    }

    function applyFontSize(size) {
        DOM.root.style.setProperty('--editor-font-size', `${size}px`);
        DOM.fontSizeDisplay.textContent = `${size}px`;
        localStorage.setItem('editorFontSize', size);
    }

    function applyTheme(theme) {
        DOM.body.classList.toggle('dark-mode', theme === 'dark');
        DOM.themeIconLight.style.display = theme === 'dark' ? 'none' : 'block';
        DOM.themeIconDark.style.display = theme === 'dark' ? 'block' : 'none';
        localStorage.setItem('theme', theme);
    }

    // V38: 重新实现的按钮交互函数
    function handleClear() {
        DOM.clearBtn.classList.add('clearing');
        setTimeout(() => {
            DOM.markdownInput.value = '';
            updatePreview();
            showToast('已清空，整装待发！');
            DOM.clearBtn.classList.remove('clearing');
        }, 300); // 等待动画效果
    }

    function updatePreview() {
        const text = DOM.markdownInput.value;
        const hasContent = text.trim().length > 0;
        DOM.previewPlaceholder.style.display = hasContent ? 'none' : 'block';
        if (hasContent) {
            DOM.previewOutput.innerHTML = md.render(text);
            renderFormulas();
            enhanceCodeBlocks();
        } else {
            DOM.previewOutput.innerHTML = '';
            DOM.previewOutput.appendChild(DOM.previewPlaceholder);
        }
        DOM.downloadBtn.disabled = !hasContent;
    }

    function renderFormulas() {
        if (DOM.formulaToggle.checked && window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            window.MathJax.typesetPromise([DOM.previewOutput]).catch((err) => console.error('MathJax error:', err));
        }
    }

    async function handleDownload() {
        if (DOM.downloadBtn.classList.contains('loading')) return;

        const markdownText = DOM.markdownInput.value.trim();
        if (!markdownText) {
            showToast('巧妇难为无米之炊哦~', 'error');
            return;
        }

        DOM.downloadBtn.classList.add('loading');
        DOM.downloadBtn.disabled = true;
        
        try {
            const response = await fetch('/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'markdown=' + encodeURIComponent(markdownText)
            });
            if (!response.ok) throw new Error((await response.json()).error || '未知服务器错误');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
            a.download = `Markdown_Masterpiece_${timestamp}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            showToast('您的杰作已生成！', 'success');

        } catch (error) {
            showToast(`生成失败: ${error.message}`, 'error');
        } finally {
            DOM.downloadBtn.classList.remove('loading');
            DOM.downloadBtn.disabled = false;
        }
    }

    const debounce = (func, delay) => {
        let t;
        return (...a) => {
            clearTimeout(t);
            t = setTimeout(() => func.apply(this, a), delay)
        };
    };

    function showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const textNode = document.createTextNode(message);
        toast.appendChild(textNode);

        DOM.toastContainer.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove(), {
                once: true
            });
        }, duration);
    }

    const highlightCode = (str, lang) => {
        const langAttr = lang ? `class="language-${lang}"` : '';
        return `<pre><code ${langAttr}>${md.utils.escapeHtml(str)}</code></pre>`;
    };

    const enhanceCodeBlocks = () => {
        DOM.previewOutput.querySelectorAll('pre > code[class*="language-"]').forEach(codeBlock => {
            const pre = codeBlock.parentElement;
            if (pre.querySelector('.code-toolbar')) return;
            const langMatch = codeBlock.className.match(/language-(\w+)/);
            const lang = langMatch ? langMatch[1] : 'text';
            const toolbar = document.createElement('div');
            toolbar.className = 'code-toolbar';
            const langName = document.createElement('span');
            langName.textContent = lang;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = '复制';
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                    copyBtn.textContent = '已复制!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = '复制';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            });
            toolbar.appendChild(langName);
            toolbar.appendChild(copyBtn);
            const wrapper = document.createElement('div');
            wrapper.className = `language-${lang}`;
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(toolbar);
            wrapper.appendChild(pre);
        });
    };

    // 重置广告牌计时器
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        DOM.adBoard.classList.remove('visible');
        idleTimer = setTimeout(() => {
            DOM.adBoard.classList.add('visible');
        }, 30000);
    }

    // V35: 输入事件处理，用于触发诗歌彩蛋
    function handleInput(event) {
        updatePreview();
        const text = event.target.value.toLowerCase();
        for (const keyword in EASTER_EGGS.poetry) {
            if (text.includes(keyword)) {
                const lines = EASTER_EGGS.poetry[keyword];
                showPoetry(lines[Math.floor(Math.random() * lines.length)]);
                break;
            }
        }
    }

    // V36: 字体滑块事件处理，用于触发像素模式彩蛋
    function handleFontSlider(e) {
        const size = e.target.value;
        applyFontSize(size);
        if (size == 12) { // 当字体大小为12px时触发像素模式
            document.body.classList.add('pixel-mode');
            showToast('8-Bit Mode Activated! 👾', 'info');
            setTimeout(() => document.body.classList.remove('pixel-mode'), 3000);
        } else {
            document.body.classList.remove('pixel-mode'); // 其他字体大小移除像素模式
        }
    }

    // V36: 主题切换事件处理，用于触发日与夜的诗彩蛋
    function handleThemeToggle() {
        const isDark = DOM.body.classList.toggle('dark-mode');
        applyTheme(isDark ? 'dark' : 'light'); // applyTheme现在接受字符串参数

        const quotes = isDark ? EASTER_EGGS.nightQuotes : EASTER_EGGS.dayQuotes;
        showToast(quotes[Math.floor(Math.random() * quotes.length)], 'info'); // 使用info类型
    }

    // V35: Logo点击事件处理，用于触发Logo思考和名言彩蛋
    function handleLogoClick() {
        logoClickCount++;
        if (!DOM.logo.classList.contains('thinking') && logoClickCount >= 5) {
            DOM.logo.classList.add('thinking');
            const originalText = DOM.logo.dataset.originalText;
            const quote = EASTER_EGGS.logoQuotes[Math.floor(Math.random() * EASTER_EGGS.logoQuotes.length)];
            DOM.logoText.textContent = "Thinking...";
            showToast(quote, 'info', 5000);

            setTimeout(() => {
                DOM.logo.classList.remove('thinking');
                DOM.logoText.textContent = originalText;
                logoClickCount = 0;
            }, 5000);
        }
    }

    // V35: 显示诗歌彩蛋
    function showPoetry(line) {
        clearTimeout(poetryTimeout);
        const p = document.createElement('div');
        p.className = 'poetry-line';
        p.textContent = line;
        DOM.poetryContainer.innerHTML = '';
        DOM.poetryContainer.appendChild(p);
        poetryTimeout = setTimeout(() => {
            p.remove();
        }, 5000);
    }

    // V37: 调整登录彩蛋触发
    function setupLoginButton() {
        let clickTimeout;
        DOM.loginBtn.addEventListener('click', () => {
            clearTimeout(clickTimeout);
            showToast('登录模块正在超时空跃迁中...请稍候...或者再点一下？🤔', 'dev-joke', 4000);
            
            // 这是一个嵌套彩蛋：如果在提示期间再次点击
            clickTimeout = setTimeout(() => {
                 DOM.loginBtn.onclick = () => showToast('哎呀，跃迁引擎过热了！请给工程师一点时间冷却。😂', 'error');
                 // 恢复正常
                 setTimeout(() => { DOM.loginBtn.onclick = null; }, 5000);
            }, 1000);
        });
    }

    // V38: 全新的、充满艺术感的初始引导文本
    function getInitialMarkdownText() {
        return `# 欢迎来到 Markdown Master, V1 ✨

你好，未来的大作家/效率达人！我是你的专属 Markdown 格式化助手。别看我界面简单，我的“内心”可是藏着不少黑科技。

> 我的使命？就是把左边这些“乱码”，变成右边这种让老板/导师满意的优雅文档。

---

## 功能展示柜

这里陈列着我的一些独门绝技：

### 1. 完美表格
无论你的表格有多复杂，我都能精准还原，并且自动居中。

| 特性 | 支持状态 | 备注 |
| :--- | :---: | ---: |
| 多行/多列 | ✅ | 完美对齐 |
| 单元格内格式 | ✅ | **加粗**、*斜体* |
| 复杂内容 | ✅ | 比如这个公式 $\\rightarrow$ |

### 2. 数学公式？小菜一碟
无论是行内公式，比如爱因斯坦的质能方程 $E=mc^2$，还是复杂的公式块，我都能让它们在Word里清晰展现。

\`\`\`math
\\oint_C \\mathbf{B} \\cdot d\\mathbf{l} = \\mu_0 \\left( I_{enc} + \\epsilon_0 \\frac{d\\Phi_E}{dt} \\right)
\`\`\`

### 3. 代码块高亮
对于我们这些“码农”来说，代码的美观至关重要。

\`\`\`python
# 这是一段优雅的 Python 代码
def greet(name):
    # P.S. 听说连续点击左上角的 Logo 有惊喜...
    print(f"Hello, {name}! Welcome to the world of perfect formatting.")

greet("Developer")
\`\`\`

## 彩蛋线索
我可不是个没有感情的工具。我身体里藏着一些小秘密，等待着有缘人去发现：
- 切换一下**明暗主题**，看看会发生什么？
- 把**字体**调到最小，会不会开启一个新世界？
- **清空**和**下载**按钮的交互，是不是比你想的更优雅？
- 在这个文本框里输入一些充满**爱 (love)** 或关于**生命 (life)** 的词汇试试？

---

现在，清空这里，开始你的创作吧！祝你文思泉涌，格式无忧！
`;
    }

    // --- 6. 启动应用 ---
    init();
});
