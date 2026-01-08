import io, datetime, json
from flask import Flask, request, send_file, render_template, jsonify, Response, stream_with_context
from services.docx_service import DocxGenerator
from openai import OpenAI, APIError

app = Flask(__name__)
# --- 🚀 配置区：模型自动切换策略 ---
# 你的 ModelScope Token
API_KEY = "ms-ee053112-72cc-4ee7-8e05-4437e1cde575"
BASE_URL = "https://api-inference.modelscope.cn/v1"

# 📋 模型备选列表 (优先级从上到下)
# 当第一个报错时，自动尝试第二个，以此类推
MODEL_LIST = [
    "Qwen/Qwen3-Next-80B-A3B-Instruct",
    "Qwen/Qwen3-VL-30B-A3B-Instruct",         # 首选：你指定的视觉增强版
    "Qwen/Qwen3-30B-A3B-Instruct-2507",       # 备选1：通义千问 2.5 72B (目前最强开源之一)
    "Qwen/Qwen3-32B",                         # 备选2：32B (速度与质量平衡)
    "Qwen/Qwen2.5-7B-Instruct",               # 备选3：7B (速度极快，保底)
]

# 初始化 Client 
client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    try:
        md_text = request.form.get('markdown', '').strip()
        if not md_text:
            return jsonify({'error': '内容为空'}), 400

        # 从 form 提取所有配置
        config = request.form.to_dict()
        
        # 调用服务层
        generator = DocxGenerator(md_text, config)
        doc = generator.generate()

        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)

        filename = f'Markdown_Export_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.docx'
        return send_file(
            file_stream, 
            as_attachment=True, 
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        app.logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

# 配置 OpenAI Client
client = OpenAI(
    api_key="ms-ee053112-72cc-4ee7-8e05-4437e1cde575", 
    base_url="https://api-inference.modelscope.cn/v1/"
)

@app.route('/chat_stream', methods=['POST'])
def chat_stream():
    # 获取前端历史记录
    data = request.get_json()
    messages = data.get('messages', [])
    
    # 系统提示词补全
    if not messages or messages[0].get('role') != 'system':
        messages.insert(0, {
            'role': 'system', 
            'content': 'You are a helpful Markdown assistant.'
        })

    def generate():
        # 🔄 核心逻辑：模型轮询重试
        for model_name in MODEL_LIST:
            try:
                # print(f"Trying model: {model_name}...") # 调试用
                
                response = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    stream=True
                )
                
                # 开始流式传输
                # 注意：一旦开始 yield 数据，说明连接成功，就不再切换模型了
                # 除非是在 yield 过程中断开（较少见，通常是连接时报错）
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                
                # 如果代码能走到这里，说明整个流传输成功完成
                return 

            except Exception as e:
                # 捕获错误，打印日志
                print(f"❌ Model [{model_name}] failed: {str(e)}")
                
                if model_name == MODEL_LIST[-1]:
                    yield f"Error: All models are busy or quota exceeded. Last error: {str(e)}"
                else:
                    # 还有备用模型，继续循环，尝试下一个
                    continue

    return Response(stream_with_context(generate()), content_type='text/plain; charset=utf-8')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)