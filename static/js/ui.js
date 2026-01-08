// static/js/ui.js

export function initUI() {
    setupTheme();
    setupResizer();
    setupModals();      
    setupFontSize();    
    setupWelcomeMessage();
    setupSidebar();
    setupTitlePrank();
    
    // 核心新增：统一管理所有彩蛋
    setupEasterEggs();
}

// ==========================================
// 🥚 核心彩蛋逻辑 
// ==========================================
function setupEasterEggs() {
    setupLogoEgg();     // 1. Logo 点击 -> 像素模式
    setupKonamiCode();  // 2. 秘籍 -> 独角兽模式
    setupAdBoard();     // 3. 闲置 -> 冷知识看板
    setupPoetry();      // 4. 定时 -> 代码诗歌
}

// 1. Logo 点击彩蛋 (像素模式)
function setupLogoEgg() {
    const logo = document.getElementById('logo');
    let clickCount = 0;
    let resetTimer;

    if (!logo) return;

    logo.addEventListener('click', () => {
        clickCount++;
        logo.classList.add('thinking'); // CSS 动画：跳动一下
        
        // 动画结束后移除类，方便下次跳动
        setTimeout(() => logo.classList.remove('thinking'), 500);

        clearTimeout(resetTimer);
        
        // 连续点击检测
        if (clickCount >= 3) {
            document.body.classList.toggle('pixel-mode');
            const isPixel = document.body.classList.contains('pixel-mode');
            showToast(isPixel ? "👾 8-BIT TIME! 像素模式已开启" : "回到现代世界", 'info');
            clickCount = 0;
        } else {
            // 2秒内没点够次数就重置
            resetTimer = setTimeout(() => { clickCount = 0; }, 2000);
        }
    });
}

// 2. Konami Code 彩蛋 (独角兽模式 - 增强调试版)
function setupKonamiCode() {
    // 标准序列
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let currentPosition = 0;

    document.addEventListener('keydown', (e) => {
        const key = e.key;
        
        // --- 调试日志 (按 F12 打开控制台 Console 查看) ---
        // 如果你按 b 显示为 "Process" 或者其他字符，说明输入法没切成英文
        console.log(`[彩蛋检测] 按键: ${key} | 期望: ${code[currentPosition]} | 当前进度: ${currentPosition}`);

        // 匹配逻辑 (兼容大小写，例如 B 和 b)
        // 注意：ArrowUp 等方向键区分大小写，但字母我们允许 B/b
        const isMatch = (key === code[currentPosition]) || (key.toLowerCase() === code[currentPosition]);

        if (isMatch) {
            currentPosition++;
            if (currentPosition === code.length) {
                // --- 触发成功 ---
                console.log("🚀 独角兽模式触发！");
                document.body.classList.toggle('unicorn-mode');
                
                const isMagic = document.body.classList.contains('unicorn-mode');
                showToast(isMagic ? "🦄 魔法已激活！独角兽模式" : "魔法消散...", 'info');
                
                currentPosition = 0; // 重置
            }
        } else {
            // --- 失败重置逻辑优化 ---
            // 如果按错了，但按下的键刚好是序列的第一个键 (ArrowUp)，
            // 我们不重置为 0，而是重置为 1 (视为新序列的开始)，这样手感更好。
            currentPosition = (key === code[0]) ? 1 : 0;
            
            if (currentPosition === 1) {
                console.log("🔄 序列重新开始...");
            } else {
                console.log("❌ 序列中断，重置。");
            }
        }
    });
}

// 3. 闲置彩蛋 (广告牌 )
function setupAdBoard() {
    const adBoard = document.getElementById('ad-board');
    const factEl = document.getElementById('ad-fact');
    
    if (!adBoard) return;
    
    // --- 新增：暴露给控制台的调试命令 ---
    window.showAd = () => {
        console.log("🔧 [调试] 手动触发广告牌");
        if(factEl) factEl.textContent = "Ctrl+C 和 Ctrl+V 是程序员最高效的开发工具。";
        adBoard.classList.add('visible');
    };
    // ----------------------------------

    const facts = [
        "程序员最讨厌的两件事：写文档，和看别人不写文档。",
        "你的代码在别人的电脑上运行不了？那叫 'Works on my machine' 认证。",
        "Ctrl+C 和 Ctrl+V 是程序员最高效的开发工具。",
        "一支 10 年经验的团队能把 Hello World 写出 100 种 Bug。",
        "要理解递归，你首先需要理解递归。"
    ];

    adBoard.addEventListener('click', () => {
        console.log("👋 用户关闭了广告牌");
        adBoard.classList.remove('visible');
    });
    
    let idleTimer;
    const resetTimer = () => {
        clearTimeout(idleTimer);
        // 如果已经显示了，就不重置计时器了，直到用户手动关闭
        if (adBoard.classList.contains('visible')) return; 

        // ⏱️ 将闲置时间从 60000 改为 120000 (240秒) 方便你测试
        idleTimer = setTimeout(() => {
            console.log("😴 检测到闲置，触发广告牌...");
            if(factEl) factEl.textContent = facts[Math.floor(Math.random() * facts.length)];
            adBoard.classList.add('visible');
        }, 240000); 
    };
    
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt => document.addEventListener(evt, resetTimer));
    resetTimer();
}

// 4. 诗歌彩蛋 
function setupPoetry() {
    const container = document.getElementById('poetry-container');
    if (!container) return;

    const lines = [
        "Hello World, Hello You.",
        "代码是写给人看的，顺便给机器运行。",
        "没有什么是一个 console.log 解决不了的。",
    ];

    // --- 新增：暴露给控制台的调试命令 ---
    window.showPoem = () => {
        console.log("🔧 [调试] 手动触发诗歌");
        triggerPoem(true); // true 表示强制显示，忽略输入状态
    };

    const triggerPoem = (force = false) => {
        // 🚫 限制检查：如果用户正在输入，暂不打扰
        // 除非是强制触发 (force)
        if (!force && document.activeElement.tagName === 'TEXTAREA') {
            console.log("🔕 [诗歌] 跳过：用户正在输入中...");
            return;
        }

        const lineText = lines[Math.floor(Math.random() * lines.length)];
        const el = document.createElement('div');
        el.className = 'poetry-line';
        el.textContent = lineText;
        
        container.appendChild(el);
        console.log(`📜 [诗歌] 显示: "${lineText}"`);

        setTimeout(() => el.remove(), 6000);
    };

    // ⏱️ 频率调整：改为 23秒 (23000ms)
    setInterval(() => triggerPoem(false), 23000);
    
    // 初始化 3秒后先来一条
    setTimeout(() => triggerPoem(false), 3000);
}

// ==========================================
// 🏗️ 基础 UI 逻辑 
// ==========================================

function setupFontSize() {
    const slider = document.getElementById('font-size-slider');
    const display = document.getElementById('font-size-display');
    const root = document.documentElement;
    if (!slider || !display) return;
    const savedSize = localStorage.getItem('editorFontSize') || 16;
    slider.value = savedSize;
    display.textContent = `${savedSize}px`;
    root.style.setProperty('--editor-font-size', `${savedSize}px`);
    slider.addEventListener('input', (e) => {
        const size = e.target.value;
        root.style.setProperty('--editor-font-size', `${size}px`);
        display.textContent = `${size}px`;
        localStorage.setItem('editorFontSize', size);
    });
}

function setupModals() {
    // 设置模态框
    const settingsModal = document.getElementById('settings-modal');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    
    const toggleSettings = (show) => {
        if(!settingsModal) return;
        if (show) {
            settingsModal.classList.add('visible');
            settingsOverlay.classList.add('visible');
        } else {
            settingsModal.classList.remove('visible');
            settingsOverlay.classList.remove('visible');
        }
    };

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => toggleSettings(true));
        if(closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => toggleSettings(false));
        if(settingsOverlay) settingsOverlay.addEventListener('click', () => toggleSettings(false));
        if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => { showToast('配置已保存', 'success'); toggleSettings(false); });
        if(resetSettingsBtn) resetSettingsBtn.addEventListener('click', () => { showToast('已恢复默认配置', 'info'); });
    }

    // Tab 切换
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(`tab-${btn.dataset.tab}`);
            if (target) target.classList.add('active');
        });
    });

    // 登录模态框
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        if (!document.getElementById('login-modal')) createLoginModalDOM();
        const loginModal = document.getElementById('login-modal');
        const loginOverlay = document.getElementById('login-overlay');
        const closeLoginBtn = document.getElementById('close-login');
        const loginSubmitBtn = document.getElementById('login-submit');
        const loginOptions = document.querySelectorAll('.login-option');

        const toggleLogin = (show) => {
            if (show) {
                loginModal.classList.add('visible');
                loginOverlay.classList.add('visible');
            } else {
                loginModal.classList.remove('visible');
                loginOverlay.classList.remove('visible');
            }
        };

        loginBtn.addEventListener('click', () => toggleLogin(true));
        if(closeLoginBtn) closeLoginBtn.addEventListener('click', () => toggleLogin(false));
        if(loginOverlay) loginOverlay.addEventListener('click', () => toggleLogin(false));
        
        loginOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                loginOptions.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });

        if(loginSubmitBtn) {
            loginSubmitBtn.addEventListener('click', () => {
                const selected = document.querySelector('.login-option.selected');
                if (!selected) return showToast('请选择一种认证方式', 'error');
                
                // 登录成功彩蛋效果
                const type = selected.dataset.type; // 'coffee' or 'debug'
                let msg = '认证成功！开发者模式已激活';
                if(type === 'coffee') msg = '☕ 咖啡因注入完毕！精力充沛';
                if(type === 'debug') msg = '🐞 捕虫网已就绪！';
                if(type === 'i') msg = '你可以了解我吗?点i';

                showToast(msg, 'success');
                toggleLogin(false);
                loginBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>Dev User</span>
                `;
                // 给按钮加个特效类
                loginBtn.classList.add('magic-effect');
            });
        }
    }
}

function createLoginModalDOM() {
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
            <div class="login-option" data-type="i">开发者专属认证i</div>
        </div>
        <button id="login-submit">开始认证</button>
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
}

function setupTheme() {
    const toggle = document.getElementById('theme-toggle');
    const body = document.body;
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');
    const saved = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (saved === 'dark') body.classList.add('dark-mode');
    updateThemeIcons(saved === 'dark', lightIcon, darkIcon);
    if (toggle) {
        toggle.addEventListener('click', () => {
            const isDark = body.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons(isDark, lightIcon, darkIcon);
        });
    }
}

function updateThemeIcons(isDark, lightIcon, darkIcon) {
    if (lightIcon) lightIcon.style.display = isDark ? 'none' : 'block';
    if (darkIcon) darkIcon.style.display = isDark ? 'block' : 'none';
}

function setupResizer() {
    const resizer = document.getElementById('resizer');
    const editorPane = document.getElementById('editor-pane');
    const previewPane = document.getElementById('preview-pane');
    if (!resizer || !editorPane || !previewPane) return;
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        resizer.classList.add('active');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    function onMouseMove(e) {
        const container = editorPane.parentElement;
        const newW = e.clientX - container.offsetLeft;
        const totalW = container.offsetWidth;
        if (newW > 200 && (totalW - newW) > 200) {
            editorPane.style.width = `${newW}px`;
            previewPane.style.width = `calc(100% - ${newW}px - 5px)`; 
        }
    }
    function onMouseUp() {
        resizer.classList.remove('active');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

function setupWelcomeMessage() {
    const el = document.getElementById('welcome-message');
    if (!el) return;
    const hour = new Date().getHours();
    let msg = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
    el.textContent = msg + ", 开始创作吧";
}

// 新增：侧边栏逻辑
function setupSidebar() {
    const btn = document.getElementById('about-btn');
    const sidebar = document.getElementById('about-sidebar');
    const overlay = document.getElementById('about-sidebar-overlay');
    const closeBtn = document.getElementById('close-about');

    if (!btn || !sidebar) return;

    const toggleSidebar = (show) => {
        if (show) {
            sidebar.classList.add('visible');
            overlay.classList.add('visible');
        } else {
            sidebar.classList.remove('visible');
            overlay.classList.remove('visible');
        }
    };

    btn.addEventListener('click', () => toggleSidebar(true));
    closeBtn.addEventListener('click', () => toggleSidebar(false));
    overlay.addEventListener('click', () => toggleSidebar(false));
}

export function showToast(msg, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.classList.add('show'); });
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

// 🤪 标签页标题恶作剧 (优化版：即时触发 + 隐藏图标)
function setupTitlePrank() {
    const originalTitle = document.title;
    
    // 获取当前的 favicon 链接，用于恢复
    const faviconLink = document.querySelector("link[rel*='icon']");
    const originalFavicon = faviconLink ? faviconLink.href : '';
    
    // 一个透明的图片 Base64，用于“隐藏”图标
    const blankFavicon = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // 🚫 用户离开了：立即变身
            document.title = "😭 糟糕！页面崩溃了...";
            if (faviconLink) faviconLink.href = blankFavicon; // 隐藏图标
        } else {
            // 👋 用户回来了
            document.title = "😊 骗你的，嘿嘿";
            if (faviconLink) faviconLink.href = originalFavicon; // 恢复图标
            
            // 1.3秒后恢复成正经标题
            setTimeout(() => {
                // 只有当用户还在当前页面时才恢复，防止用户快速切出去又切回来导致逻辑混乱
                if (!document.hidden) {
                    document.title = originalTitle;
                }
            }, 1300);
        }
    });
}