import { initEditor, handleDownload, handleClear } from './editor.js';
import { initUI } from './ui.js';
import { initChat } from './chat.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化界面交互 (Resizer, Theme, Modals)
    initUI();

    // 2. 初始化编辑器 (Markdown 解析, 预览)
    const editor = initEditor();

    initChat(); // 2. 启动聊天

    // 3. 绑定全局按钮事件
    document.getElementById('download-btn').addEventListener('click', handleDownload);
    document.getElementById('clear-btn').addEventListener('click', () => handleClear(editor));
    document.getElementById('pdf-btn').addEventListener('click', () => window.print());
});