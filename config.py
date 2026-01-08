from docx.enum.text import WD_ALIGN_PARAGRAPH

# 字体映射配置
FONTS_MAP = {
    'song': {'west': 'Times New Roman', 'east': u'宋体'},
    'hei':  {'west': 'Arial', 'east': u'黑体'},
    'kai':  {'west': 'Times New Roman', 'east': u'楷体'},
    'fang': {'west': 'Times New Roman', 'east': u'仿宋'},
    'yahei': {'west': 'Microsoft YaHei', 'east': u'微软雅黑'},
    'deng': {'west': 'DengXian', 'east': u'等线'},
    'times': {'west': 'Times New Roman', 'east': u'宋体'},
    'cons': {'west': 'Consolas', 'east': u'Consolas'},
    'courier': {'west': 'Courier New', 'east': u'Courier New'},
    'source': {'west': 'Source Code Pro', 'east': u'Source Code Pro'},
    'menlo': {'west': 'Menlo', 'east': u'Menlo'},
}

# 对齐方式映射
ALIGNMENT_MAP = {
    'JUSTIFY': WD_ALIGN_PARAGRAPH.JUSTIFY,
    'LEFT': WD_ALIGN_PARAGRAPH.LEFT,
    'CENTER': WD_ALIGN_PARAGRAPH.CENTER,
    'RIGHT': WD_ALIGN_PARAGRAPH.RIGHT
}

# 需要居中的特殊段落关键词
SPECIAL_CENTERED_KEYWORDS = {"附录", "引言", "目录", "摘要", "参考文献"}