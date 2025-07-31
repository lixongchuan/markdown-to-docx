# app.py (V37.0 - Stable Core & Refined Details Edition)
import io, datetime, re, requests, uuid
from flask import Flask, request, send_file, render_template, jsonify
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import OxmlElement
from markdown_it import MarkdownIt

app = Flask(__name__)
md = MarkdownIt("gfm-like")

# --- V36: 恢复您原始的、精美的样式定义 ---
def define_final_styles(doc):
    # 正文样式
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(12)
    style._element.rPr.rFonts.set(qn('w:eastAsia'), u'宋体')
    p_format = style.paragraph_format
    p_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p_format.first_line_indent = Inches(0.25 * 1.2)
    p_format.space_before = Pt(0)
    p_format.space_after = Pt(0)
    
    # 一级标题 (居中, 黑体)
    style = doc.styles.add_style('Final Heading 1', 1)
    style.font.name = 'Times New Roman'; style.font.size = Pt(16); style.font.bold = True
    style._element.rPr.rFonts.set(qn('w:ascii'), u'Times New Roman'); style._element.rPr.rFonts.set(qn('w:hAnsi'), u'Times New Roman'); style._element.rPr.rFonts.set(qn('w:eastAsia'), u'黑体')
    p_format = style.paragraph_format
    p_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_format.space_before = Pt(24); p_format.space_after = Pt(12)

    # 二级标题 (左对齐, 黑体)
    style = doc.styles.add_style('Final Heading 2', 1)
    style.font.name = 'Times New Roman'; style.font.size = Pt(14); style.font.bold = True
    style._element.rPr.rFonts.set(qn('w:ascii'), u'Times New Roman'); style._element.rPr.rFonts.set(qn('w:hAnsi'), u'Times New Roman'); style._element.rPr.rFonts.set(qn('w:eastAsia'), u'黑体')
    p_format = style.paragraph_format
    p_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_format.space_before = Pt(12); p_format.space_after = Pt(12)
    
    # 三级标题 (左对齐, 黑体)
    style = doc.styles.add_style('Final Heading 3', 1)
    style.font.name = 'Times New Roman'; style.font.size = Pt(12); style.font.bold = True
    style._element.rPr.rFonts.set(qn('w:ascii'), u'Times New Roman'); style._element.rPr.rFonts.set(qn('w:hAnsi'), u'Times New Roman'); style._element.rPr.rFonts.set(qn('w:eastAsia'), u'黑体')
    p_format = style.paragraph_format
    p_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_format.space_before = Pt(6); p_format.space_after = Pt(6)

    # 代码样式
    try:
        style = doc.styles.add_style('CodeStyle', 1)
        style.font.name = 'Courier New'; style.font.size = Pt(10)
        p_format = style.paragraph_format; p_format.space_before = Pt(6); p_format.space_after = Pt(6)
        shd = OxmlElement('w:shd'); shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), 'F1F1F1')
        style.paragraph_format.element.get_or_add_pPr().append(shd)
    except ValueError: pass


# --- V36: 交叉引用与链接辅助函数 ---
def add_pageref_field(paragraph, bookmark_name):
    run = paragraph.add_run()
    fldChar_begin = OxmlElement('w:fldChar')
    fldChar_begin.set(qn('w:fldCharType'), 'begin')
    
    instrText = OxmlElement('w:instrText')
    instrText.set(nsdecls('w'), 'preserve')
    instrText.text = f' PAGEREF {bookmark_name} \\h '
    
    fldChar_separate = OxmlElement('w:fldChar')
    fldChar_separate.set(qn('w:fldCharType'), 'separate')
    
    # 在 separate 和 end 之间添加一个 run，用于显示默认的页码（例如 "1"）
    # 这能让用户在更新域之前看到一个占位符
    run_text = OxmlElement('w:r')
    t = OxmlElement('w:t')
    t.text = '1' # 默认占位页码
    run_text.append(t)
    
    fldChar_end = OxmlElement('w:fldChar')
    fldChar_end.set(qn('w:fldCharType'), 'end')

    run._r.append(fldChar_begin)
    run._r.append(instrText)
    run._r.append(fldChar_separate)
    run._r.append(run_text) # 添加占位页码的 run
    run._r.append(fldChar_end)

def create_bookmark(paragraph, name):
    bookmark_start = OxmlElement('w:bookmarkStart')
    bookmark_start.set(qn('w:id'), '0')
    bookmark_start.set(qn('w:name'), name)
    paragraph._p.insert(0, bookmark_start)
    
    bookmark_end = OxmlElement('w:bookmarkEnd')
    bookmark_end.set(qn('w:id'), '0')
    paragraph._p.append(bookmark_end)

def add_hyperlink(paragraph, text, url):
    part = paragraph.part
    r_id = part.relate_to(url, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', is_external=True)
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)
    new_run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    c_style = OxmlElement('w:rStyle')
    c_style.set(qn('w:val'), 'Hyperlink')
    rPr.append(c_style)
    new_run.append(rPr)
    text_element = OxmlElement('w:t')
    text_element.text = text
    new_run.append(text_element)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)

def _process_inline(paragraph, inline_token):
    style_stack = {'bold': False, 'italic': False}
    if not inline_token.children:
        paragraph.add_run(inline_token.content)
        return

    for child in inline_token.children:
        if child.type == 'text':
            run = paragraph.add_run(child.content)
            run.bold = style_stack['bold']; run.italic = style_stack['italic']
        elif child.type == 'strong_open': style_stack['bold'] = True
        elif child.type == 'strong_close': style_stack['bold'] = False
        elif child.type == 'em_open': style_stack['italic'] = True
        elif child.type == 'em_close': style_stack['italic'] = False
        elif child.type == 'link_open':
            url = child.attrs.get('href', '')
            link_text = child.children[0].content if child.children else url
            if not url.startswith('#'):
                add_hyperlink(paragraph, link_text, url)
            else:
                # 对于内部链接（如目录中的），只显示文本
                paragraph.add_run(link_text)
        elif child.type == 'image':
             # 图片处理...
             pass
        else:
             # 其他 token...
             pass

# --- V37 核心转换引擎 (返回逻辑修正) ---
def markdown_to_docx(md_text: str):
    document = Document()
    define_final_styles(document)
    tokens = md.parse(md_text)
    
    # 步骤一: 预扫描标题创建书签映射
    bookmark_map = {}
    is_toc_present = "目录" in md_text
    toc_heading_text = "目录"
    for i, token in enumerate(tokens):
        if token.type == 'heading_open':
            content = tokens[i+1].content.strip()
            bookmark_map[content] = f"bkmk_{uuid.uuid4().hex[:8]}"

    # 步骤二: 逐个Token进行转换
    i = 0
    while i < len(tokens):
        token = tokens[i]

        # 处理目录
        if is_toc_present and token.type == 'heading_open' and tokens[i+1].content.strip() == toc_heading_text:
            document.add_paragraph(toc_heading_text, style='Final Heading 1')
            tab_stops = document.paragraphs[-1].paragraph_format.tab_stops
            tab_stops.add_tab_stop(Inches(6.0), alignment=WD_ALIGN_PARAGRAPH.RIGHT, leader=2)
            
            list_start_index = i + 3
            if list_start_index < len(tokens) and tokens[list_start_index].type == 'bullet_list_open':
                j = list_start_index + 1
                while j < len(tokens) and tokens[j].type != 'bullet_list_close':
                    if tokens[j].type == 'list_item_open':
                        text = tokens[j+2].children[0].children[0].content.strip()
                        p_toc = document.add_paragraph()
                        p_toc.paragraph_format.tab_stops.add_tab_stop(Inches(6.0), alignment=WD_ALIGN_PARAGRAPH.RIGHT, leader=2)
                        p_toc.add_run(text)
                        p_toc.add_run('\t')
                        bookmark_name = bookmark_map.get(text)
                        if bookmark_name:
                            add_pageref_field(p_toc, bookmark_name)
                        j += 4
                    else: j += 1
                i = j + 1
                continue
            else: i += 3; continue

        elif token.type == 'heading_open':
            level = int(token.tag[1:])
            content = tokens[i+1].content.strip()
            style_name = f'Final Heading {level}' if 1 <= level <= 3 else 'Normal'
            p = document.add_paragraph(content, style=style_name)
            bookmark_name = bookmark_map.get(content)
            if bookmark_name: create_bookmark(p, bookmark_name)
            i += 3; continue
        
        elif token.type == 'paragraph_open':
            p = document.add_paragraph()
            _process_inline(p, tokens[i+1])
            i += 3; continue

        elif token.type == 'table_open':
            header_content, body_rows, alignments = [], [], []
            j = i + 1
            # 1. 提取所有表格内容
            while tokens[j].type != 'table_close':
                if tokens[j].type == 'tr_open':
                    current_row, is_sep_row = [], False
                    k = j + 1
                    while tokens[k].type != 'tr_close':
                        if tokens[k].type in ('th_open', 'td_open'):
                            inline_content = tokens[k+1]
                            current_row.append(inline_content)
                            if re.match(r'^:?-+:?$', inline_content.content.strip()): is_sep_row = True
                        k += 1
                    if not is_sep_row:
                        if tokens[j-1].type == 'thead_open': header_content = current_row
                        else: body_rows.append(current_row)
                    else: # 这是对齐行
                        for cell in current_row:
                            align_text = cell.content.strip()
                            if align_text.startswith(':') and align_text.endswith(':'): alignments.append(WD_ALIGN_PARAGRAPH.CENTER)
                            elif align_text.endswith(':'): alignments.append(WD_ALIGN_PARAGRAPH.RIGHT)
                            else: alignments.append(WD_ALIGN_PARAGRAPH.LEFT)
                j += 1
            i = j + 1 # 跳过整个表格
            
            # 2. 创建并填充表格
            if header_content:
                num_rows = 1 + len(body_rows); num_cols = len(header_content)
                table = document.add_table(rows=num_rows, cols=num_cols); table.style = 'Table Grid'; table.alignment = WD_TABLE_ALIGNMENT.CENTER
                
                # 填充表头
                hdr_cells = table.rows[0].cells
                for col_idx, inline_token in enumerate(header_content):
                    p = hdr_cells[col_idx].paragraphs[0]
                    _process_inline(p, inline_token)
                    hdr_cells[col_idx].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                    if alignments: p.alignment = alignments[col_idx]

                # 填充表体
                for row_idx, row_data in enumerate(body_rows):
                    row_cells = table.rows[row_idx + 1].cells
                    for col_idx, inline_token in enumerate(row_data):
                        p = row_cells[col_idx].paragraphs[0]
                        _process_inline(p, inline_token)
                        row_cells[col_idx].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                        if alignments: p.alignment = alignments[col_idx]
            continue
        
        elif token.type == 'fence': # 代码块
            p = document.add_paragraph(token.content, style='CodeStyle')
            i += 1; continue
            
        else:
            # 处理其他所有类型的 token...
            i += 1
            
    # V37 FIX: 确保函数最后返回 document 对象
    return document

# --- API 路由 (核心修正) ---
@app.route('/')
def index(): return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    try:
        markdown_text = request.form['markdown']
        if not markdown_text.strip():
            return jsonify({'error': '内容不能为空.'}), 400
        
        # V37 FIX: 正确的调用流程
        # 1. markdown_to_docx 返回 document 对象
        document_obj = markdown_to_docx(markdown_text)
        
        # 2. 创建文件流
        file_stream = io.BytesIO()
        
        # 3. 将 document 对象保存到文件流
        document_obj.save(file_stream)
        
        # 4. 将文件流指针移到开头
        file_stream.seek(0)

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        return send_file(
            file_stream, as_attachment=True, download_name=f'Markdown_Doc_{timestamp}.docx',
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        import traceback
        traceback.print_exc() 
        return jsonify({'error': f'服务器内部错误: {e}'}), 500

if __name__ == '__main__': app.run(host='0.0.0.0', port=5000, debug=True)
