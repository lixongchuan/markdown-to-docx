# app.py (V37.7 - 回归本源，强制居中版)
import io, datetime, re, requests, uuid
from flask import Flask, request, send_file, render_template, jsonify
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import OxmlElement
from markdown_it import MarkdownIt

app = Flask(__name__)
md = MarkdownIt("gfm-like")

# --- V37.7: 样式定义 (回归单个、干净的表格样式) ---
def define_final_styles(doc):
    # --- 正文、标题、代码样式 (无变化) ---
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'; style.font.size = Pt(12)
    style._element.rPr.rFonts.set(qn('w:eastAsia'), u'宋体')
    p_format = style.paragraph_format; p_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p_format.first_line_indent = Inches(0.25 * 1.2)
    p_format.space_before = Pt(0); p_format.space_after = Pt(0)
    
    style = doc.styles.add_style('Final Heading 1', 1)
    style.font.name = 'Times New Roman'; style.font.size = Pt(16); style.font.bold = True
    style._element.rPr.rFonts.set(qn('w:eastAsia'), u'黑体')
    p_format = style.paragraph_format; p_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_format.space_before = Pt(24); p_format.space_after = Pt(12)

    style = doc.styles.add_style('Final Heading 2', 1)
    style.font.name = 'Times New Roman'; style.font.size = Pt(14); style.font.bold = True
    style._element.rPr.rFonts.set(qn('w:eastAsia'), u'黑体')
    p_format = style.paragraph_format; p_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_format.space_before = Pt(12); p_format.space_after = Pt(12)
    
    style = doc.styles.add_style('Final Heading 3', 1)
    style.font.name = 'Times New Roman'; style.font.size = Pt(12); style.font.bold = True
    style._element.rPr.rFonts.set(qn('w:eastAsia'), u'黑体')
    p_format = style.paragraph_format; p_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_format.space_before = Pt(6); p_format.space_after = Pt(6)

    try:
        style = doc.styles.add_style('CodeStyle', 1)
        style.font.name = 'Courier New'; style.font.size = Pt(10)
        p_format = style.paragraph_format; p_format.space_before = Pt(6); p_format.space_after = Pt(6)
        shd = OxmlElement('w:shd'); shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), 'F1F1F1')
        style.paragraph_format.element.get_or_add_pPr().append(shd)
    except ValueError: pass
    
    # V37.7 关键修改: 只创建一个最基础、无任何缩进的表格单元格样式
    # 我们不再在样式中定义对齐，对齐将通过代码强制执行
    try:
        style = doc.styles.add_style('TableCellClean', WD_STYLE_TYPE.PARAGRAPH)
        style.font.name = 'Times New Roman'
        style.font.size = Pt(10.5)
        style._element.rPr.rFonts.set(qn('w:eastAsia'), u'宋体')
        p_format = style.paragraph_format
        p_format.first_line_indent = Inches(0)
        p_format.left_indent = Inches(0)
        p_format.space_before = Pt(0)
        p_format.space_after = Pt(0)
        p_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        p_format.alignment = WD_ALIGN_PARAGRAPH.LEFT # 样式默认为左对齐，后续将由代码强制覆盖
    except ValueError:
        pass

# --- 辅助函数 (无变化) ---
def add_pageref_field(paragraph, bookmark_name):
    run = paragraph.add_run()
    fldChar_begin = OxmlElement('w:fldChar'); fldChar_begin.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText'); instrText.set(nsdecls('w'), 'preserve'); instrText.text = f' PAGEREF {bookmark_name} \\h '
    fldChar_separate = OxmlElement('w:fldChar'); fldChar_separate.set(qn('w:fldCharType'), 'separate')
    run_text = OxmlElement('w:r'); t = OxmlElement('w:t'); t.text = '1'; run_text.append(t)
    fldChar_end = OxmlElement('w:fldChar'); fldChar_end.set(qn('w:fldCharType'), 'end')
    run._r.append(fldChar_begin); run._r.append(instrText); run._r.append(fldChar_separate); run._r.append(run_text); run._r.append(fldChar_end)

def create_bookmark(paragraph, name):
    bookmark_start = OxmlElement('w:bookmarkStart'); bookmark_start.set(qn('w:id'), '0'); bookmark_start.set(qn('w:name'), name)
    paragraph._p.insert(0, bookmark_start)
    bookmark_end = OxmlElement('w:bookmarkEnd'); bookmark_end.set(qn('w:id'), '0')
    paragraph._p.append(bookmark_end)

def add_hyperlink(paragraph, text, url):
    part = paragraph.part; r_id = part.relate_to(url, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', is_external=True)
    hyperlink = OxmlElement('w:hyperlink'); hyperlink.set(qn('r:id'), r_id)
    new_run = OxmlElement('w:r'); rPr = OxmlElement('w:rPr'); c_style = OxmlElement('w:rStyle'); c_style.set(qn('w:val'), 'Hyperlink')
    rPr.append(c_style); new_run.append(rPr); text_element = OxmlElement('w:t'); text_element.text = text; new_run.append(text_element)
    hyperlink.append(new_run); paragraph._p.append(hyperlink)

def _process_inline(paragraph, inline_token):
    style_stack = {'bold': False, 'italic': False}
    if not inline_token.children:
        paragraph.add_run(inline_token.content)
        return
    for child in inline_token.children:
        if child.type == 'text':
            run = paragraph.add_run(child.content); run.bold = style_stack['bold']; run.italic = style_stack['italic']
        elif child.type == 'strong_open': style_stack['bold'] = True
        elif child.type == 'strong_close': style_stack['bold'] = False
        elif child.type == 'em_open': style_stack['italic'] = True
        elif child.type == 'em_close': style_stack['italic'] = False
        elif child.type == 'link_open':
            url = child.attrs.get('href', ''); link_text = child.children[0].content if child.children else url
            if not url.startswith('#'): add_hyperlink(paragraph, link_text, url)
            else: paragraph.add_run(link_text)
        elif child.type == 'image': pass
        else: pass

def _trim_inline_token_whitespace(inline_token):
    if not inline_token.children:
        if inline_token.content:
             inline_token.content = inline_token.content.strip()
        return

    for child in inline_token.children:
        if child.type == 'text':
            child.content = child.content.lstrip()
            break
            
    for child in reversed(inline_token.children):
        if child.type == 'text':
            child.content = child.content.rstrip()
            break

# --- V37.7 核心转换引擎 (采用最简单、最可靠的表格处理方式) ---
def markdown_to_docx(md_text: str):
    document = Document()
    define_final_styles(document)
    tokens = md.parse(md_text)
    
    SPECIAL_CENTERED_KEYWORDS = {"附录", "引言", "目录", "摘要", "参考文献"}
    bookmark_map = {}
    is_toc_present = "目录" in md_text
    toc_heading_text = "目录"
    for i, token in enumerate(tokens):
        if token.type == 'heading_open':
            content = tokens[i+1].content.strip()
            bookmark_map[content] = f"bkmk_{uuid.uuid4().hex[:8]}"

    i = 0
    while i < len(tokens):
        token = tokens[i]
        
        is_special_centered_heading = False
        is_special_centered_paragraph = False
        if token.type == 'heading_open' and tokens[i+1].content.strip() in SPECIAL_CENTERED_KEYWORDS:
             is_special_centered_heading = True
        if token.type == 'paragraph_open' and tokens[i+1].content.strip() in SPECIAL_CENTERED_KEYWORDS:
             is_special_centered_paragraph = True

        if is_toc_present and token.type == 'heading_open' and tokens[i+1].content.strip() == toc_heading_text:
            p_toc_heading = document.add_paragraph(toc_heading_text, style='Final Heading 1')
            p_toc_heading.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER # 确保目录标题居中
            tab_stops = p_toc_heading.paragraph_format.tab_stops
            tab_stops.add_tab_stop(Inches(6.0), alignment=WD_ALIGN_PARAGRAPH.RIGHT, leader=2)
            list_start_index = i + 3
            if list_start_index < len(tokens) and tokens[list_start_index].type == 'bullet_list_open':
                j = list_start_index + 1
                while j < len(tokens) and tokens[j].type != 'bullet_list_close':
                    if tokens[j].type == 'list_item_open':
                        text = tokens[j+2].children[0].children[0].content.strip()
                        p_toc = document.add_paragraph(); p_toc.paragraph_format.tab_stops.add_tab_stop(Inches(6.0), alignment=WD_ALIGN_PARAGRAPH.RIGHT, leader=2)
                        p_toc.add_run(text); p_toc.add_run('\t')
                        bookmark_name = bookmark_map.get(text)
                        if bookmark_name: add_pageref_field(p_toc, bookmark_name)
                        j += 4
                    else: j += 1
                i = j + 1; continue
            else: i += 3; continue

        elif token.type == 'heading_open':
            level = int(token.tag[1:]); content = tokens[i+1].content.strip()
            style_name = f'Final Heading {level}' if 1 <= level <= 3 else 'Normal'
            p = document.add_paragraph(content, style=style_name)
            if is_special_centered_heading: p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
            bookmark_name = bookmark_map.get(content)
            if bookmark_name: create_bookmark(p, bookmark_name)
            i += 3; continue
        
        elif is_special_centered_paragraph:
            p = document.add_paragraph()
            p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
            _process_inline(p, tokens[i+1])
            i += 3; continue

        elif token.type == 'paragraph_open':
            p = document.add_paragraph(); _process_inline(p, tokens[i+1])
            i += 3; continue
        
        if token.type == 'table_open':
            # V37.7: 全新、极简且绝对可靠的表格数据提取逻辑
            table_data = {'header': [], 'body': []}
            current_row = []
            in_header = False

            j = i + 1
            while tokens[j].type != 'table_close':
                tok = tokens[j]
                if tok.type == 'thead_open': in_header = True
                elif tok.type == 'thead_close': in_header = False
                elif tok.type == 'tr_open': current_row = []
                elif tok.type in ('th_open', 'td_open'):
                    inline_content = tokens[j+1]
                    _trim_inline_token_whitespace(inline_content)
                    current_row.append(inline_content)
                elif tok.type == 'tr_close':
                    if in_header:
                        table_data['header'] = current_row
                    else:
                        table_data['body'].append(current_row)
                j += 1
            i = j # 主循环跳过整个表格
            
            # --- V37.7: 最核心的修改：创建表格并强制居中所有单元格 ---
            header_content = table_data['header']
            body_rows = table_data['body']

            if header_content:
                num_cols = len(header_content)
                num_rows = 1 + len(body_rows)
                table = document.add_table(rows=num_rows, cols=num_cols)
                table.style = 'Table Grid'
                table.alignment = WD_TABLE_ALIGNMENT.CENTER

                # 统一的填充函数
                def fill_and_force_center(cell, inline_token):
                    # 步骤一：获取段落并应用无缩进的干净样式
                    p = cell.paragraphs[0]
                    p.style = 'TableCellClean'
                    
                    # 步骤二：填充内容
                    _process_inline(p, inline_token)
                    
                    # 步骤三：强制将段落居中 (遵照您的指示)
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    
                    # 步骤四：设置垂直居中
                    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

                # 填充表头
                for col_idx, inline_token in enumerate(header_content):
                    fill_and_force_center(table.rows[0].cells[col_idx], inline_token)
                
                # 填充表体
                for row_idx, row_data in enumerate(body_rows):
                    for col_idx, inline_token in enumerate(row_data):
                        fill_and_force_center(table.rows[row_idx + 1].cells[col_idx], inline_token)

            continue
        
        elif token.type == 'fence':
            p = document.add_paragraph(token.content, style='CodeStyle'); i += 1; continue
            
        else:
            i += 1
            
    return document

# --- API 路由 (无变化) ---
@app.route('/')
def index(): return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    try:
        markdown_text = request.form['markdown']
        if not markdown_text.strip(): return jsonify({'error': '内容不能为空.'}), 400
        document_obj = markdown_to_docx(markdown_text)
        file_stream = io.BytesIO()
        document_obj.save(file_stream)
        file_stream.seek(0)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        return send_file(
            file_stream, as_attachment=True, download_name=f'Markdown_Doc_{timestamp}.docx',
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        import traceback; traceback.print_exc() 
        return jsonify({'error': f'服务器内部错误: {e}'}), 500

if __name__ == '__main__': app.run(host='0.0.0.0', port=5000, debug=True)
