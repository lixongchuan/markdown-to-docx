'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM 元素获取 (增加登录模态框) ---
    const DOM = {
        root: document.documentElement, body: document.body,
        markdownInput: document.getElementById('markdown-input'),
        previewOutput: document.getElementById('preview-pane'),
        previewPlaceholder: document.getElementById('preview-placeholder'),
        editorPane: document.getElementById('editor-pane'), resizer: document.getElementById('resizer'),
        downloadBtn: document.getElementById('download-btn'), clearBtn: document.getElementById('clear-btn'),
        formulaToggle: document.getElementById('formula-toggle'), themeToggle: document.getElementById('theme-toggle'),
        themeIconLight: document.getElementById('theme-icon-light'), themeIconDark: document.getElementById('theme-icon-dark'),
        fontSizeSlider: document.getElementById('font-size-slider'), fontSizeDisplay: document.getElementById('font-size-display'),
        toastContainer: document.getElementById('toast-container'), loginBtn: document.getElementById('login-btn'),
        logo: document.getElementById('logo'), logoText: document.getElementById('logo-text'),
        adBoard: document.getElementById('ad-board'), poetryContainer: document.getElementById('poetry-container'),
        welcomeMessage: document.getElementById('welcome-message'),
        downloadBtnIconWrapper: document.querySelector('#download-btn .btn-icon-wrapper'),
        loginModal: null, // 初始设置为null，在createLoginModal中赋值
        loginOverlay: null, // 初始设置为null，在createLoginModal中赋值
        loginOptions: null, // 初始设置为null，在createLoginModal中赋值
        loginSubmit: null, // 初始设置为null，在createLoginModal中赋值
        closeLogin: null // 初始设置为null，在createLoginModal中赋值
    };

    // --- 2. 状态与变量 (优化彩蛋数据) ---
    let md, idleTimer, logoClickCount = 0, poetryTimeout;
    const EASTER_EGGS = { 
        logoQuotes: [
            "代码写得好，bug 追着跑~",
            "程序员三美德：懒惰、急躁和傲慢",
            "永远不要相信程序员说'这只需要5分钟'",
            "99个小bug在代码里，99个小bug~ 抓一个，修一个，117个小bug在代码里~"
        ],
        // 减少关键词数量，提高触发质量
        poetry: {
            coffee: ["咖啡是程序员最好的朋友，除了编译器", "咖啡因含量 >= 代码行数"],
            debug: ["调试就像在黑暗房间里找黑猫，而且灯还坏了", "console.log('救命！');"],
            love: ["while(!success) { tryAgain(); if(dead) break; }", "爱情就像递归，没有终止条件就会栈溢出"]
        },
        dayQuotes: ["早安世界！又是写bug的好日子", "咖啡机启动中...请稍候"],
        nightQuotes: ["夜深了，但IDE还亮着...", "月亮不睡我不睡，我是秃头小宝贝"]
    };
    
    // 已触发的彩蛋记录
    const triggeredEasterEggs = new Set();

    // --- 3. 核心初始化函数 (增加登录模态框) ---
    function init() {
        if (!checkDependencies()) return;

        md = window.markdownit({
            html: true,
            linkify: true,
            typographer: true,
            highlight: highlightCode
        });

        // 确保登录模态框存在
        ensureLoginModal();
        
        setupEventListeners();
        setupTheme();
        setupFontSize();
        setupResizer();
        setupWelcomeMessage();

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

    // V38.1: 确保模态框在DOM中
    function ensureLoginModal() {
        if (!document.getElementById('login-modal')) {
            createLoginModal();
        }
    }

    // 创建登录模态框
    function createLoginModal() {
        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.className = 'login-overlay';
        
        const modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'login-modal';
        modal.innerHTML = `
            <button id="close-login" class="close-btn">×</button>
            <h2>开发者专属登录</h2>
            <p>选择您的认证方式以继续</p>
            <div class="login-options">
                <div class="login-option" data-type="coffee">☕ 咖啡因认证</div>
                <div class="login-option" data-type="debug">🐞 调试模式认证</div>
                <div class="login-option" data-type="magic">✨ 魔法认证</div>
            </div>
            <button id="login-submit">开始认证</button>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        
        // 更新DOM引用
        DOM.loginModal = modal;
        DOM.loginOverlay = overlay;
        // 重新获取NodeList，因为元素是动态创建的
        DOM.loginOptions = document.querySelectorAll('.login-option');
        DOM.loginSubmit = document.getElementById('login-submit');
        DOM.closeLogin = document.getElementById('close-login');
    }

    // --- 4. 功能设置模块 (优化事件监听) ---
    function setupEventListeners() {
        // 优化输入处理：使用requestAnimationFrame进行节流
        DOM.markdownInput.addEventListener('input', () => {
            requestAnimationFrame(handleInput);
        });
        
        DOM.clearBtn.addEventListener('click', handleClear);
        DOM.downloadBtn.addEventListener('click', handleDownload);
        DOM.formulaToggle.addEventListener('change', updatePreview);
        DOM.themeToggle.addEventListener('click', handleThemeToggle);
        DOM.fontSizeSlider.addEventListener('input', handleFontSlider);
        DOM.loginBtn.addEventListener('click', handleLoginClick);
        DOM.logo.addEventListener('click', handleLogoClick);
        DOM.adBoard.addEventListener('click', () => DOM.adBoard.classList.remove('visible')); // 点击广告牌关闭

        // 登录模态框事件
        // 确保DOM元素存在后再添加事件监听器
        if (DOM.loginOptions) {
            DOM.loginOptions.forEach(option => {
                option.addEventListener('click', handleLoginOption);
            });
        }
        if (DOM.loginSubmit) {
            DOM.loginSubmit.addEventListener('click', handleLoginSubmit);
        }
        if (DOM.closeLogin) {
            DOM.closeLogin.addEventListener('click', closeLoginModal);
        }
        if (DOM.loginOverlay) {
            DOM.loginOverlay.addEventListener('click', closeLoginModal);
        }

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

    // --- 5. 核心与彩蛋辅助函数 (全面优化) ---
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

    // V38.1 新增: 兼容HTTP的剪贴板复制函数
    function copyCodeToClipboard(text, button) {
        // 优先使用现代、安全的剪贴板API (适用于HTTPS和localhost)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                button.textContent = '已复制!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = '复制';
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                showToast(`复制失败: ${err.message}`, 'error');
            });
        } else {
            // 为HTTP环境提供后备方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                button.textContent = '已复制!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = '复制';
                    button.classList.remove('copied');
                }, 2000);
            } catch (err) {
                showToast('复制失败, 请手动操作', 'error');
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    // V38.1 修改: 调用新的复制函数
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
            
            // 绑定事件到我们新的、更强大的复制函数
            copyBtn.addEventListener('click', () => {
                copyCodeToClipboard(codeBlock.textContent, copyBtn);
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

    // 重置广告牌计时器
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        DOM.adBoard.classList.remove('visible');
        idleTimer = setTimeout(() => {
            DOM.adBoard.classList.add('visible');
            showRandomDevFact(); // 每次显示广告牌时显示随机事实
        }, 60000); // 延长到60秒
    }

    // 显示随机开发者事实
    function showRandomDevFact() {
        const facts = [
            "第一个计算机bug是1947年由一只真正的飞蛾引起的",
            "程序员平均每天写50-100行有效代码",
            "Linux的创始人Linus Torvalds在21岁时创建了Linux",
            "Python的名字来源于Monty Python喜剧团",
            "世界上第一台电子计算机ENIAC重达27吨",
            "JavaScript最初只用了10天时间开发",
            "程序员最常用的密码是'123456'和'password'",
            "HTML不是编程语言，是标记语言",
            "程序员平均每天喝3.5杯咖啡",
            "Stack Overflow成立于2008年，现在是程序员圣地",
            "GitHub上最流行的语言是JavaScript",
            "程序员最痛恨的事：写文档和开会"
        ];
        
        const randomFact = facts[Math.floor(Math.random() * facts.length)];
        document.getElementById('ad-fact').textContent = randomFact;
    }

    // V38.1: 优化输入处理性能
    function handleInput() {
        const text = DOM.markdownInput.value;
        const hasContent = text.trim().length > 0;
        
        // 使用防抖优化预览更新
        debouncePreview(text);
        
        // 彩蛋触发逻辑优化 - 只在文本较短时触发
        if (text.length < 500) {
            const textLower = text.toLowerCase();
            for (const keyword in EASTER_EGGS.poetry) {
                // 每个关键词只触发一次
                if (textLower.includes(keyword) && !triggeredEasterEggs.has(keyword)) {
                    const lines = EASTER_EGGS.poetry[keyword];
                    showPoetry(lines[Math.floor(Math.random() * lines.length)]);
                    triggeredEasterEggs.add(keyword);
                    break; // 一次只触发一个彩蛋
                }
            }
        }

        // 新彩蛋：输入特定关键词触发特殊效果
        if (text.toLowerCase().includes("unicorn") && !triggeredEasterEggs.has("unicorn")) {
            document.body.classList.add('unicorn-mode');
            showToast("🦄 独角兽模式激活！", 'info');
            triggeredEasterEggs.add("unicorn");
            setTimeout(() => {
                document.body.classList.remove('unicorn-mode');
                triggeredEasterEggs.delete("unicorn"); // 允许再次触发
            }, 5000);
        }
    }
    
    // 防抖预览更新
    let previewDebounce;
    function debouncePreview(text) {
        clearTimeout(previewDebounce);
        previewDebounce = setTimeout(() => {
            updatePreview();
        }, 300); // 300ms防抖
    }

    // V38: 优化Logo点击事件
    function handleLogoClick() {
        logoClickCount++;
        
        // 5次点击触发彩蛋
        if (logoClickCount >= 5) {
            const quote = EASTER_EGGS.logoQuotes[Math.floor(Math.random() * EASTER_EGGS.logoQuotes.length)];
            showToast(quote, 'info', 5000);
            logoClickCount = 0;
        }
    }

    // V38: 全新的登录彩蛋
    function handleLoginClick() {
        DOM.loginModal.classList.add('visible');
        DOM.loginOverlay.classList.add('visible');
    }
    
    // V38.1: 优化登录彩蛋交互
    function handleLoginOption(e) {
        // 移除之前的选择
        DOM.loginOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        // 设置当前选择
        const selectedOption = e.currentTarget;
        selectedOption.classList.add('selected');
        
        // 添加动画效果
        selectedOption.style.transform = 'scale(0.95)';
        setTimeout(() => {
            selectedOption.style.transform = 'scale(1)';
        }, 150);
    }

    function handleLoginSubmit() {
        const selected = document.querySelector('.login-option.selected');
        if (!selected) {
            showToast('请选择一种认证方式', 'error');
            return;
        }
        
        const type = selected.dataset.type;
        let result = '';
        let emoji = '';
        
        switch(type) {
            case 'coffee':
                result = '咖啡因水平提升200%';
                emoji = '☕';
                break;
            case 'debug':
                result = '调试模式激活！所有bug暂时隐藏';
                emoji = '🐛';
                break;
            case 'magic':
                result = '魔法生效！代码质量+50%';
                emoji = '✨';
                break;
        }
        
        showToast(`${emoji} ${result}`, 'success', 3000);
        closeLoginModal();
        
        // 添加特殊效果
        if (type === 'magic') {
            document.body.classList.add('magic-effect');
            setTimeout(() => {
                document.body.classList.remove('magic-effect');
            }, 2000);
        }
    }
    
    // V38.1: 修复登录弹窗关闭功能
    function closeLoginModal() {
        if (DOM.loginModal) DOM.loginModal.classList.remove('visible');
        if (DOM.loginOverlay) DOM.loginOverlay.classList.remove('visible');
    }

    // V38: 优化清空功能
    function handleClear() {
        DOM.clearBtn.classList.add('clearing');
        DOM.markdownInput.value = '';
        
        // 清空预览
        DOM.previewPlaceholder.style.display = 'block';
        DOM.previewOutput.innerHTML = '';
        DOM.previewOutput.appendChild(DOM.previewPlaceholder);
        
        // 清空彩蛋记录
        triggeredEasterEggs.clear();
        
        showToast('已清空，整装待发！', 'success');
        
        setTimeout(() => {
            DOM.clearBtn.classList.remove('clearing');
        }, 300);
    }

    // V38.1: 优化下载功能 - 恢复真实后端请求
    async function handleDownload() {
        if (DOM.downloadBtn.classList.contains('loading')) return;

        const markdownText = DOM.markdownInput.value.trim();
        if (!markdownText) {
            showToast('内容为空，无法导出', 'error');
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
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '未知服务器错误');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
            a.download = `Markdown_Export_${timestamp}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            showToast('文档已生成！', 'success');
        } catch (error) {
            showToast(`导出失败: ${error.message}`, 'error');
        } finally {
            DOM.downloadBtn.classList.remove('loading');
            DOM.downloadBtn.disabled = false;
        }
    }

    // V36: 字体滑块事件处理，用于触发像素模式彩蛋
    function handleFontSlider(e) {
        const size = e.target.value;
        applyFontSize(size);
        if (size == 12 && !triggeredEasterEggs.has("pixel-mode")) { // 当字体大小为12px时触发像素模式
            document.body.classList.add('pixel-mode');
            showToast('8-Bit Mode Activated! 👾', 'info');
            triggeredEasterEggs.add("pixel-mode");
            setTimeout(() => {
                document.body.classList.remove('pixel-mode');
                triggeredEasterEggs.delete("pixel-mode"); // 允许再次触发
            }, 3000);
        } else if (size != 12) {
            document.body.classList.remove('pixel-mode'); // 其他字体大小移除像素模式
            triggeredEasterEggs.delete("pixel-mode");
        }
    }

    // V36: 主题切换事件处理，用于触发日与夜的诗彩蛋
    function handleThemeToggle() {
        const isDark = DOM.body.classList.toggle('dark-mode');
        applyTheme(isDark ? 'dark' : 'light'); // applyTheme现在接受字符串参数

        const quotes = isDark ? EASTER_EGGS.nightQuotes : EASTER_EGGS.dayQuotes;
        showToast(quotes[Math.floor(Math.random() * quotes.length)], 'info'); // 使用info类型
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

    // V38: 优化初始文本
    function getInitialMarkdownText() {
        return `# 欢迎来到 Markdown Master ✨

你好，创作者！这是一个能让你专注写作的Markdown编辑器，但别被它正经的外表骗了 - 我可是个有趣的灵魂！

> **彩蛋猎人提示**：试试这些操作，发现隐藏惊喜：
> - 点击左上角Logo多次 🤫
> - 把字体大小调到12px 👾
> - 切换明暗模式 🌓
> - 在编辑器里输入特定关键词（比如 "coffee"、"debug" 或 "love"）
> - 30秒不动会触发开发者冷知识

---

## 基础功能展示

### 表格支持
| 功能       | 支持状态 | 酷炫指数 |
| :--------- | :------: | -------: |
| 复杂表格   | ✅       | ⭐⭐⭐⭐ |
| 数学公式   | ✅       | ⭐⭐⭐⭐ |
| 论文格式   | ✅       | ⭐⭐⭐⭐⭐ |

### 数学公式示例
行内公式：$E=mc^2$

块公式：
$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

### 代码高亮
\`\`\`javascript
// 试试点击代码块的"复制"按钮
function discoverEasterEgg() {
  console.log("恭喜发现隐藏功能！");
  return "🎉";
}
\`\`\`

---

现在就开始创作吧！您的所有内容都会自动保存。
`;
    }

    // --- 6. 启动应用 ---
    init();
});
