import { showToast } from './ui.js';

let md;

export function initEditor() {
    const input = document.getElementById('markdown-input');
    const preview = document.getElementById('preview-pane');
    const formulaToggle = document.getElementById('formula-toggle');

    // 1. 检查依赖库是否加载
    if (typeof window.markdownit === 'undefined') {
        console.error("错误：markdown-it 库未加载。请检查网络或 index.html 中的 CDN 链接。");
        document.getElementById('preview-placeholder').innerHTML = '<p style="color:red">核心库加载失败，请刷新页面重试</p>';
        return;
    }

    // 2. 初始化 Markdown 解析器
    try {
        md = window.markdownit({
            html: true,
            linkify: true,
            typographer: true,
            highlight: highlightCode
        });
    } catch (e) {
        console.error("Markdown-it 初始化失败:", e);
        return;
    }
    
    // 3. 初始渲染
    input.value = getInitialText();
    updatePreview(); 

    // 4. 绑定输入事件 (使用防抖)
    // 注意：这里移除了 input 变量的重复声明，直接使用上面的 const input
    input.addEventListener('input', debounce(() => {
        updatePreview();
    }, 300));

    // 5. 绑定公式开关
    if (formulaToggle) {
        formulaToggle.addEventListener('change', updatePreview);
    }

    console.log("编辑器初始化成功！"); // 调试信息
    return { input, preview };
}

function updatePreview() {
    const input = document.getElementById('markdown-input');
    const output = document.getElementById('preview-pane');
    const placeholder = document.getElementById('preview-placeholder');
    
    if (!input || !output) return;

    const text = input.value;
    
    // 空内容处理
    if (!text.trim()) {
        output.innerHTML = '';
        if (placeholder) {
            output.appendChild(placeholder);
            placeholder.style.display = 'block';
        }
        return;
    }
    
    if (placeholder) placeholder.style.display = 'none';
    
    // 渲染 Markdown
    try {
        output.innerHTML = md.render(text);
    } catch (e) {
        console.error("渲染错误:", e);
    }
    
    // 公式渲染 (MathJax)
    const formulaToggle = document.getElementById('formula-toggle');
    if (formulaToggle && formulaToggle.checked && window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([output]).catch(err => console.log('MathJax 渲染中或报错:', err));
    }
    
    // 增强代码块
    enhanceCodeBlocks(output);
}

// --- 导出功能 ---
export function handleDownload() {
    const btn = document.getElementById('download-btn');
    const text = document.getElementById('markdown-input').value;
    
    if (!text.trim()) return showToast('内容为空', 'error');
    
    btn.classList.add('loading');
    btn.disabled = true;

    const formData = new URLSearchParams();
    formData.append('markdown', text);
    
    // 自动收集设置
    document.querySelectorAll('[id^="set-"]').forEach(el => {
        const key = el.id.replace('set-', '').replace(/-/g, '_');
        formData.append(key, el.value);
    });

    fetch('/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
    })
    .then(res => {
        if (!res.ok) return res.json().then(json => { throw new Error(json.error || '导出失败') });
        return res.blob();
    })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'_')}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('导出成功');
    })
    .catch(err => showToast(err.message, 'error'))
    .finally(() => {
        btn.classList.remove('loading');
        btn.disabled = false;
    });
}

export function handleClear() {
    const input = document.getElementById('markdown-input');
    input.value = '';
    updatePreview();
    showToast('已清空');
}

// --- 辅助函数 ---

function highlightCode(str, lang) {
    // 安全检查
    if (!md) return `<pre><code>${str}</code></pre>`;
    
    let langClass = lang ? `class="language-${lang}"` : '';
    try {
        return `<pre><code ${langClass}>${md.utils.escapeHtml(str)}</code></pre>`;
    } catch (e) {
        return `<pre><code>${str}</code></pre>`;
    }
}

function enhanceCodeBlocks(container) {
    container.querySelectorAll('pre > code').forEach(codeBlock => {
        const pre = codeBlock.parentElement;
        if (pre.querySelector('.code-toolbar')) return;

        const langMatch = codeBlock.className.match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : 'text';

        const toolbar = document.createElement('div');
        toolbar.className = 'code-toolbar';
        
        const langSpan = document.createElement('span');
        langSpan.textContent = lang;
        
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

        toolbar.appendChild(langSpan);
        toolbar.appendChild(copyBtn);
        
        // 包装结构
        const wrapper = document.createElement('div');
        wrapper.className = `language-${lang}`;
        
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(toolbar);
        wrapper.appendChild(pre);
    });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function getInitialText() {
    return `# Welcome to Markdown Master\n\n开始输入您的内容...`;
}