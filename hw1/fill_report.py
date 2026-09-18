# -*- coding: utf-8 -*-
"""把 HW1-报告模板.docx 的三节正文与标题填写好，保留原有字体与段落格式。

实现方式：不重建整份文档，只在 word/document.xml 文本上，
按占位符文字用正则定位到"整段 <w:p>...</w:p>"并整段替换，
因此模板原有的字体、缩进、页眉等设置完全不受影响。
"""
import html
import re
import zipfile

SRC = r"HW1_todo\HW1-报告模板.docx"
DST = r"HW1_todo\HW1-报告.docx"

FONT = ('<w:rFonts w:hint="eastAsia" w:ascii="微软雅黑" w:hAnsi="微软雅黑" '
        'w:eastAsia="微软雅黑"/>')


def run(text):
    return ('<w:r><w:rPr>' + FONT + '</w:rPr>'
            '<w:t xml:space="preserve">' + html.escape(text) + '</w:t></w:r>')


def para(text):
    """与模板正文一致：首行缩进 420、行距 360、微软雅黑"""
    return ('<w:p><w:pPr><w:ind w:firstLine="420"/>'
            '<w:spacing w:line="360" w:lineRule="auto"/></w:pPr>'
            + run(text) + '</w:p>')


TITLE = ("2D图形的交互绘制——分形图的鼠标交互绘制"
         "（附加项②：分形图 + slider控制递归次数）")

THOUGHT = [
    "本次作业采用 WebGL 2.0 + 原生 JavaScript 在浏览器中实现，全部功能不依赖任何第三方框架。整体思路是："
    "先用 HTML 建立一个铺满窗口的 canvas，在 init() 中获取 WebGL 2.0 上下文、编译顶点与片元着色器、"
    "创建顶点缓冲区（VBO）并把顶点数据上传给 GPU，之后所有的绘制都只走 render() 这一个出口。",

    "基本要求的实现分三步。第一步是几何数据准备：把点、线、面所需的基本图元顶点统一放在全局数组 points 中，"
    "用 vec2 表示每个顶点，再通过 MVnew.js 提供的 flatten() 转换成扁平化的 Float32Array 才能上传到 GPU。"
    "第二步是把鼠标的屏幕像素坐标转换成 NDC 坐标：屏幕坐标原点在画布左上角、y 轴向下、范围为 0~canvas.width，"
    "而 NDC 原点在画布中心、y 轴向上、范围为 -1~1，因此 x 方向做 (x/width)*2-1 的映射，"
    "y 方向在同样映射后还要用 1-(y/height)*2 翻转一次。第三步是重绘：把新的中心坐标和新的随机色"
    "（vec4(Math.random(), Math.random(), Math.random(), 1.0)）通过 uniform 变量传给着色器，"
    "然后调用 render() 清屏并重新绘制。之所以把平移放在顶点着色器里做"
    "（gl_Position.x = aPosition.x + centerX），而不是每次点击都重算顶点数组，"
    "是因为图形形状不变、只有位置变，用 uniform 更新比重新上传顶点数据代价小得多。",

    "附加项选做的是第②项：把几何图形换成分形图，并用 slider 滑动条交互控制递归次数。"
    "我选用 Sierpinski 三角垫片，它的生成规则很简洁：对任意三角形，取三边中点并互相连接，"
    "就得到 3 个与原三角形相似、面积为原来 1/4 的小三角形，再对这 3 个小三角形递归执行同样的操作；"
    "当递归次数减到 0 时，把当前三角形作为最终图元输出到 points 中。"
    "这样递归 n 次就得到 3^n 个三角形，n 从 0 到 7 分别是 1、3、9、27、81、243、729、2187 个三角形，"
    "最大也只有 6561 个顶点，GPU 完全能实时重绘。",

    "交互上，页面左上角放置一个 range 类型的 slider（范围 0~7），监听它的 input 事件："
    "一旦滑动就更新全局变量 depth 并置标志位 depthChangedFlag = true，"
    "render() 检测到该标志后调用 initFractalGeometry() 按新的递归次数重新生成顶点数组、"
    "重新上传给 VBO，最后仍由 gl.drawArrays(gl.TRIANGLES, 0, points.length) 统一绘制。"
    "由于这里用的是 points.length 作为顶点个数，顶点数量随递归次数变化时无需修改绘制语句。"
    "另外，为了让点击改变中心和分形递归两个功能不冲突，"
    "分形的基准三角形顶点是用相对于图形中心的 NDC 坐标定义的，"
    "实际位置仍由顶点着色器统一加上 centerX/centerY，所以点击画布时整个分形会平移到点击位置，"
    "递归次数保持不变；反过来拖动滑块时，分形也始终以当前点击位置为中心。",
]

DIFFICULTY = [
    "1、鼠标坐标到 NDC 坐标的转换，尤其是 y 轴方向。屏幕坐标的 y 轴向下，NDC 的 y 轴向上，"
    "一开始只做了线性映射而忘了翻转，结果点击画布上方图形却跑到下方。"
    "解决办法是推导两端点的对应关系：屏幕 y=0（上边）对应 NDC y=+1，屏幕 y=height（下边）对应 NDC y=-1，"
    "由此得到 ndcY = 1 - (y/height)*2。同时要注意用 event.clientX 减去 getBoundingClientRect().left，"
    "这样即使 canvas 不在窗口左上角也能取到正确的画布内坐标。",

    "2、递归次数改变后必须重新上传顶点数据。顶点数据是在 init() 中一次性 bufferData 上传到 GPU 的，"
    "一开始只改了 depth 就直接重绘，画面毫无变化，因为 GPU 里还是旧的那批顶点。"
    "后来明白 VBO 不会自己跟着 CPU 端的数组走，必须重新 bindBuffer + bufferData 把新数据传上去。"
    "同时还有一个更隐蔽的坑：重建前必须先 points = [] 清空数组，否则新生成的三角形会追加在旧的后面，"
    "新旧图形叠加在一起越画越乱。",

    "3、slider 控件被全屏 canvas 遮挡，拖不动甚至看不到。canvas 使用了 position: fixed 且宽高铺满整个窗口，"
    "它在 DOM 中位于控制面板之前，会盖住控制面板并吃掉鼠标事件。"
    "解决办法是给控制面板容器设置 position: fixed 配合 z-index: 10，让它稳定浮在 canvas 之上；"
    "调试期间还遇到过浏览器缓存旧版 hw1.html 导致页面里根本没有控件的情况，用 Ctrl+F5 强制刷新即可。",

    "4、着色器中 uniform 变量名必须与 JS 中 getUniformLocation 的字符串完全一致。"
    "题目注释里把颜色变量写成了 colorRandom，而片元着色器中实际声明的是 randomColor，"
    "名字对不上时 getUniformLocation 返回 null、程序不会报错，但颜色永远不变，属于很难发现的静默错误。"
    "我的处理原则是：一切以着色器源码中的声明为准。",

    "5、直接用浏览器打开 hw1.html 无法运行。课程提供的 initShaders2.js 使用同步 XMLHttpRequest 读取着色器文件，"
    "在 file:// 协议下会被同源策略拦截，弹出 Could not find shader source。"
    "解决办法是通过 python -m http.server 之类的本地服务器以 http 协议访问页面，这一点也写进了 readme。",

    "6、性能与规模的权衡。递归次数越高三角形越多，虽然 3^7 = 2187 个三角形对 GPU 而言仍很轻松，"
    "但每次滑动都要在 CPU 端重新递归生成全部顶点，所以我把上限设为 7，"
    "在视觉效果与交互流畅度之间取了一个平衡。",
]

INSIGHT = [
    "通过这次作业，我最主要的收获是把 WebGL 的绘制流程真正串了起来："
    "数据从 CPU 端的普通数组出发，经 flatten() 转成类型化数组，再通过 VBO 上传到 GPU，"
    "由顶点属性 aPosition 进入顶点着色器完成坐标变换，最后经图元装配、光栅化和片元着色器输出颜色。"
    "以前只是零散地记 API 名字，现在能清楚地知道每一步在整条管线中的位置，以及少了哪一步会出什么现象，"
    "比如漏掉 enableVertexAttribArray 就是整屏空白，属性名字写错就是静默失效。",

    "其次，我对交互式图形程序的更新代价有了直观认识。同样是响应用户操作，"
    "改变图形中心只需要更新一个 uniform，代价极小；而改变递归次数需要重建几千个顶点并重新上传缓冲区，"
    "代价大得多。这让我理解了为什么实际渲染引擎要区分变换和几何重建两类更新，"
    "也为后面学习更复杂的场景管理打下了直觉基础。",

    "第三，分形的递归实现让我体会到用极简规则生成复杂图形的思想。"
    "短短十行左右的 divideTriangle 递归，就能在 7 次递归后产生 2187 个三角形构成的精细图案，"
    "而且整个过程完全由程序自动生成，不需要任何人工建模。"
    "这也让我理解了分形自相似性的含义，以及递归次数与细节层次、数据规模之间的指数关系。",

    "最后是一些工程习惯上的体会：坐标系约定（屏幕坐标与 NDC）必须一开始就搞清楚，"
    "否则错误会以方向反了这种直观但难定位的形式出现；"
    "GUI 控件与全屏画布共存时要注意层叠顺序；"
    "而浏览器缓存、本地文件协议限制这类环境问题，也提醒我要养成先确认运行环境和文件版本的排查习惯。"
    "这些经验对后续的图形学实验同样适用。",
]


def replace_placeholder_para(doc, marker, texts):
    """定位包含 marker 的整段 <w:p>...</w:p>，整段换成 texts 生成的若干段落

    注意：模板里提示语常被拆到多个 <w:t> 文本节点中（例如 "[" 单独一段），
    因此不能做跨节点的字面匹配，改为允许字符之间夹杂任意 XML 标签。
    """
    fuzzy = "(?:<[^>]*>)*".join(re.escape(ch) for ch in marker)
    pattern = re.compile(r"<w:p\b[^>]*>(?:(?!</w:p>).)*?" + fuzzy + r".*?</w:p>", re.S)
    hits = pattern.findall(doc)
    assert len(hits) == 1, "占位段落定位失败: %s (匹配到 %d 个)" % (marker, len(hits))
    return pattern.sub(lambda m: "".join(para(t) for t in texts), doc, count=1)


def main():
    zin = zipfile.ZipFile(SRC, "r")
    doc = zin.read("word/document.xml").decode("utf-8")

    # 1) 标题：模板原有 "编程作业1~xxxx"，去掉波浪号后接标题正文，避免出现两个"编程作业1"
    assert "<w:t>xxxx</w:t>" in doc
    doc = doc.replace('<w:t xml:space="preserve"> </w:t>', "<w:t/>", 1)
    doc = doc.replace("<w:t>xxxx</w:t>", "<w:t>%s</w:t>" % html.escape(TITLE), 1)

    # 2) 三节正文（注意文档中提示语的原文写法）
    doc = replace_placeholder_para(doc, "描述一下你是如何完成实验的", THOUGHT)
    doc = replace_placeholder_para(
        doc, "你认为实验中比较重要的地方，以及遇到了什么难点、如何解决难点", DIFFICULTY)
    doc = replace_placeholder_para(doc, "实验的总结，以及你学到了什么", INSIGHT)

    # 3) 姓名/学号 → 显眼的红字占位（由本人替换）
    doc = doc.replace("<w:t>XX</w:t>", "<w:t>【请填写姓名】</w:t>", 1)
    doc = doc.replace("<w:t>xxxxxxxxxxxx</w:t>", "<w:t>【请填写学号】</w:t>", 1)

    for bad in ("[描述一下你是如何完成实验的", "[实验的总结", "以及你学到了什么]"):
        assert bad not in doc, "仍残留占位符: " + bad

    with zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = doc.encode("utf-8")
            zout.writestr(item, data)
    zin.close()
    print("written:", DST)


main()
