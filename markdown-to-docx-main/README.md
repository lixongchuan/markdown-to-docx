# Markdown Master <sup>R</sup>

> 一个优雅、强大且充满“灵性”的 Markdown 编辑器与转换工具。
> Crafted with ❤️ by LXC.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8+-green.svg)](https://www.python.org/)

## ✨ 核心亮点

Markdown Master 不仅仅是一个编辑器，它是你写作与排版的得力助手：

- **🎨 极致的 Word 导出**：告别乱码和格式错乱。支持自定义字体（宋体/黑体/Times等）、页边距、行距、段间距，完美适配公文与学术论文格式。
- **🤖 内置 AI 智慧引擎**：集成 **Qwen (通义千问)** 大模型。支持多轮对话、流式响应、代码高亮，随时为你提供灵感或检查代码。
- **⚡ 实时预览**：所见即所得，支持 MathJax 数学公式渲染 (`$E=mc^2$`)。
- **🥚 隐藏彩蛋**：
  - **像素模式**：连续点击 Logo 5 次。
  - **独角兽模式**：输入 Konami 秘籍 (`↑↑↓↓←→←→ba`)。
  - **摸鱼检测**：发呆 30 秒，看看会发生什么？
  - **崩溃恶作剧**：切出标签页试试看？

## 🛠️ 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/lixongchuan/markdown-to-docx.git
cd markdown-to-docx
```

### 2. 安装依赖
建议使用 Python 3.8+ 环境。
```bash
pip install -r requirements.txt
```

### 3. 配置 AI 模型 (可选)
打开 `app.py`，找到 `API_KEY`，填入你的 ModelScope Token（如果需要使用 AI 功能）。
```python
API_KEY = "your-modelscope-token-here"
```

### 4. 运行
```bash
python app.py
```
访问 `http://127.0.0.1:5000` 开始创作！

## 📂 项目结构

```text
markdown-master/
├── app.py                  # Flask 后端入口 (处理路由与 AI 流)
├── config.py               # 字体与排版配置
├── services/               # 业务逻辑层 (Word 生成核心)
├── static/                 # 静态资源
│   ├── css/                # 模块化样式 (base, layout, chat, themes...)
│   └── js/                 # 模块化脚本 (editor, ui, chat...)
└── templates/
    └── index.html          # 前端入口
```

## 👨‍💻 作者

**LXC**
- 📧 Email: lixongchuan@outlook.com
- 🐱 GitHub: [@lixongchuan](https://github.com/lixongchuan)

---
*“代码是写给人看的，顺便给机器运行。”*
```