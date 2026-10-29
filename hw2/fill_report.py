# -*- coding: utf-8 -*-
"""把 HW2-报告模板.docx 的标题、组信息与三节正文填写好，保留原有字体与段落格式。

实现方式：不重建整份文档，只在 word/document.xml 上按“段落”定位——把模板里的
占位段落整段替换成新生成的段落，其余内容（样式、页眉、节属性）完全不动，
因此模板原有的字体、缩进、页面设置都不受影响。

用法（在仓库根目录）：
    python hw2\\fill_report.py
前提：HW2_todo\\HW2-报告模板.docx 存在（模板不入库，只入库生成好的报告）。
"""
import html
import re
import zipfile

SRC = r"HW2_todo\HW2-报告模板.docx"
DST = r"hw2\report\HW2-报告.docx"

# 小组信息：第 6 组，组长肖铭皓，组员张原野
GROUP = "第 6 组"
LEADER = ("肖铭皓", "2024141460455")
MEMBERS = [("张原野", "2024141460416")]

FONT = ('<w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑" '
        'w:hint="eastAsia"/>')


def run(text, bold=False, size=None):
    """生成一个 run。注意 OOXML 中 w:rPr 的子元素有固定顺序：rFonts → b → sz → szCs。"""
    rpr = "<w:rPr>" + FONT
    if bold:
        rpr += "<w:b/>"
    if size:
        rpr += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (size, size)
    rpr += "</w:rPr>"
    return '<w:r>' + rpr + '<w:t xml:space="preserve">' + html.escape(text) + "</w:t></w:r>"


def center_para(text, bold=False, size=None):
    """居中段落（标题、组信息用），行距与模板一致 360"""
    return ('<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/>'
            '<w:jc w:val="center"/></w:pPr>' + run(text, bold, size) + "</w:p>")


def body_para(text):
    """正文段落：首行缩进 420、行距 360，与模板正文一致"""
    return ('<w:p><w:pPr><w:ind w:firstLine="420"/>'
            '<w:spacing w:line="360" w:lineRule="auto"/></w:pPr>' + run(text) + "</w:p>")


TITLE = ("编程作业2 建立3D场景并进行漫游观察"
         "——3D物体建模与场景漫游"
         "（附加项：①太阳系 ②虚拟跟踪球 ④层次建模与可配置消隐）")

THOUGHT = [
    "本次作业在课程给定的 3D 漫游框架上完成：入口 3d-wandering.html 负责建立铺满窗口的 canvas "
    "与交互控件（模型下拉框、两个消隐复选框、提示栏），3d-wandering.js 负责初始化、事件与渲染，"
    "models-data.js 负责生成几何数据。渲染流程是典型的 MVP 流水线：render() 中先由 formModelMatrix()、"
    "formViewMatrix()、formProjectMatrix() 算出模型矩阵 M、视图矩阵 V、投影矩阵 P，"
    "用 MVnew.js 的 flatten() 展平后以 uniform 传给顶点着色器；顶点着色器用 u_Flag 区分两种绘制——"
    "画坐标轴时只做 VP（坐标轴固定在场景原点，不随物体缩放旋转），画物体时才做 MVP。"
    "顶点数据统一放在全局数组 points/colors 中（每个顶点是 vec4），SendData() 用 gl.bufferData "
    "一次性上传到 GPU，之后每次重绘只更新 uniform，不重复传顶点。",

    "TODO1 的墨西哥帽本质上是一个高度场。我们把参数域等分成 11×11 的网格（nRows=nColumns=11），"
    "位置域取 x=2i/nRows-1、z=2j/nColumns-1，正好落在 [-1,1]×[-1,1]；数据域再把位置乘以 2π，"
    "得 u=2πx、v=2πz，r=√(u²+v²)，高度 y=sin(r)/r，r=0 时按极限取 1。"
    "之所以要乘 2π，是因为 sin(r)/r 的零点出现在数据域 r=π、2π 处，映射回位置域正好是 r=0.5 和 1.0，"
    "这样画面里才会出现“中间帽顶、外面一圈凹槽、最外圈帽檐”的墨西哥帽形状；"
    "如果不乘 2π，r 最大只有 1.414，只能看到帽顶的一小块。"
    "每个网格单元拆成两个三角形共 6 个顶点，颜色按高度从蓝渐变到红，便于观察高度起伏。",

    "TODO2 的模型矩阵 M 就是缩放 scale(modelScale, modelScale, modelScale)，"
    "Z/C 键每次把 modelScale 乘 1.1 或 0.9。TODO3 的视图矩阵 V 用球面极坐标描述相机位置："
    "eye=(r·sinφ·cosθ, r·cosφ, r·sinφ·sinθ)，半径 r=2；θ 是绕 Y 轴的方位角，"
    "φ 是从 +Y 轴量起的极角，W/S 改变 φ（俯仰）、A/D 改变 θ（左右环绕）。"
    "为了避免相机正对 +Y 轴时 up 与视线共线，up 取球面上与视线垂直的切线方向 "
    "(-cosφ·cosθ, sinφ, -cosφ·sinθ)：φ=90°、θ=0° 时 eye=(2,0,0)、up=(0,1,0)，与直觉一致，"
    "φ 取 0° 或 180° 也不会退化。TODO4 的投影矩阵：视见体取 near=0.5、far=10、"
    "left/right/bottom/ytop=±2、aspect=1，isOrth 为真时调用 ortho()，否则调用 "
    "perspective(fov, aspect, near, far)；P 键切换投影方式，M/N 每次把 fov 加减 5°并限制在 5°~170°。",

    "附加项我们完成了①、②、④三项。①复杂模型：models-data.js 里新写了 pushUnitSphere()，"
    "从正四面体出发递归细分生成单位球（细分后顶点归一化回球面），并记录每个球体在 points 中的"
    "区间 [start, count]；太阳、水星、金星、地球、火星、木星六颗行星，加上地球的卫星月球共 7 个天体，"
    "共用同一份顶点缓冲区，绘制时用 gl.drawArrays(gl.TRIANGLES, start, count) 分段取用，"
    "另外用 LINES 画了各自的公转轨道圆。②鼠标任意轴旋转：实现了虚拟跟踪球（arcball），"
    "把画布上的鼠标位置映射到单位半球（球外的点压到赤道圆上），"
    "并先用当前 θ/φ 算出相机的基向量（屏幕右、屏幕上、指向相机），把两个球面点换到世界坐标，"
    "再用它们的叉积作旋转轴、点积的反余弦作旋转角，把新旋转左乘到累积矩阵 trackballMatrix 上，"
    "最终 M = R_trackball·S；这样物体既能被鼠标绕任意轴转动，也保留 Z/C 的缩放。"
    "④层次建模与复杂动画、可配置消隐：每个天体都有轨道倾角、公转角、自转角，"
    "solarFrame(i) 递归地由父天体的坐标系、轨道倾角和公转角、轨道半径拼出，"
    "solarModelMatrix(i) 再在其上叠加自转与半径缩放；月球的父坐标系取地球的公转坐标系"
    "（而不是地球自转后的坐标系），所以地球绕太阳转时月球跟着走、但不会被地球自转甩出去。"
    "动画用 requestAnimationFrame 按帧间时间差更新角度。消隐做成可开关：复选框与 B/F 键分别控制"
    "gl.CULL_FACE（后向面剔除）和 gl.DEPTH_TEST（深度缓存），关掉深度缓存就能看到后画的物体"
    "盖住前面物体的错误遮挡，关掉后向面剔除也能看出绕序对剔除结果的影响。",
]

DIFFICULTY = [
    "1、up 向量与视线共线导致 lookAt 退化。一开始照搬 up=(0,1,0)，当相机抬到接近正上方（φ→0）时，"
    "视线方向几乎与 up 平行，lookAt 内部做叉积得到的侧向量接近零向量，归一化后出现 NaN，整屏变白。"
    "解决办法是改用球面上的切线方向作为 up，它在任意 φ 都严格垂直于视线，φ=90° 时又正好退化成 (0,1,0)。"
    "我们最后把 φ=0°、180° 两种情况都截了图，确认不再出现空白。",

    "2、深度缓存没有清、也没有开，导致遮挡错误。课程框架原来的 render() 只调用 "
    "gl.clear(gl.COLOR_BUFFER_BIT)，没有清深度缓冲，于是切换模型或转动相机后，上一帧的深度值残留，"
    "新画的物体会被旧深度错误遮挡；同时如果初始化时漏掉 gl.enable(gl.DEPTH_TEST)，"
    "后画的三角形会直接覆盖先画的，立方体看起来像几个平面叠在一起。"
    "我们把清屏改成 COLOR|DEPTH，并把深度缓存做成可切换开关（F 键）在 render() 里显式 enable/disable。",

    "3、球体绕序朝内，打开后向面剔除后球面消失。课程提供的 generateSphere 里压入顶点的顺序是 a,b,c，"
    "我们对外表面算叉积发现法线其实指向球心（即外表面是顺时针），"
    "于是 gl.frontFace(CCW) + 剔除 BACK 时被剔除的恰好是朝向相机的外表面，看到的是远端的内表面。"
    "判断办法很直接：打开剔除后如果能看到球体内部的坐标轴、或球面看起来像透明了，就说明绕序反了。"
    "解决是把压入顺序改成 a,c,b 翻转绕序；修正后球体在剔除开启时依旧完整，并且正确遮挡穿过它的坐标轴。",

    "4、墨西哥帽的公式与坐标域一开始没对上。第一版画出来是一圈波浪而不是帽子，原因有两个："
    "一是数据域忘了乘 2π，r 最大只到 1.414，零点位置全都不对；二是 r=0 处直接除零，顶点出现 NaN。"
    "修正后令 y=sin(r)/r、r=0 时取极限 1，并且把位置域乘以 2π 之后再算 r，帽形才正确出现。"
    "另外网格太稀会让帽檐出现明显折线，最后取 11×11 兼顾形状与顶点数量。",

    "5、层次建模时月球被地球自转“甩”着转。最初我们把月球直接挂在地球的模型矩阵下，"
    "结果地球自转时月球绕地球转得飞快，公转和自转混在一起。"
    "解决办法是把每个天体拆成两个矩阵：solarFrame(i) 只包含父坐标系、轨道倾角、公转角和轨道半径，"
    "用来作为子天体的坐标系；solarModelMatrix(i) 才在 frame 上再叠加自转和缩放。"
    "月球的父坐标系取 solarFrame(地球)，于是它只跟随地球公转、不受地球自转影响，轨道也保持为圆。",

    "6、7 个球体与轨道线共用一个缓冲区，必须分段绘制。一开始把天体都画在原点，"
    "因为 gl.drawArrays 直接画了整个缓冲区。后来为每个天体记录顶点区间 [start, count]，"
    "把起点作为 drawArrays 的 first 参数、区间长度作为 count，才把每个天体分开；"
    "轨道线则单独用 LINES 画在父天体的坐标系里。",

    "7、动画步长在切标签页后跳变。requestAnimationFrame 回调的时间戳在浏览器切到后台会停顿很久，"
    "回来时两帧时间差很大，行星会瞬间跳到轨道另一侧。"
    "解决办法是把每帧的 dt 限制在 0.1 秒以内，牺牲一点实时性换取视觉上的连续。",

    "8、交互多，手工回归验证成本高。我们给页面加了 URL 参数（?model=&orth=&cull=&depth=&scale=&phi=&theta=&fov=），"
    "让脚本可以直接指定初始状态，再用无头 Chrome 截图对比不同功能；无头模式默认没有可用的 WebGL 实现，"
    "需要加 --enable-unsafe-swiftshader。键盘和鼠标事件无法在无头浏览器里真实触发，"
    "我们另外写了一个临时自测页，用合成的 KeyboardEvent / MouseEvent 驱动页面的处理函数，"
    "断言 modelScale、phi、isCulling、跟踪球矩阵的正交性、月球父节点等关键状态（29 项断言全部通过），"
    "验证完即删除。",

    "9、鼠标拖动方向与直觉相反。验收时发现向右拖，立方体却是右边的面转进来。"
    "原因是弧球向量按（屏幕右、屏幕上、指向观察者）解释，这组分量构成左手系，"
    "直接当世界坐标求叉积得到的旋转轴是镜像的；再加上 MVnew.rotate() 的矩阵实际上是标准旋转的转置，"
    "两处符号问题叠加，水平拖动变成正面朝反方向转，竖直拖动甚至退化成绕视线自旋。"
    "解决办法是先用相机基向量把球面点换到世界坐标，再用 rotate(-angle, axis) 施加旋转。"
    "验证时写了个临时页面合成 mousedown/mousemove 事件，右拖、下拖、左拖各截一张图，"
    "确认被抓住的正面中心点确实跟着鼠标移动，验证完删除临时页。",
]

INSIGHT = [
    "通过这次作业，我们对 MVP 变换流水线有了完整而具体的认识。以前知道“模型矩阵、视图矩阵、投影矩阵”"
    "这三个名字，现在能说清楚每一种变换解决什么问题：M 把物体从自身的模型坐标搬到世界坐标，"
    "V 把世界坐标换算到以相机为原点的观察坐标（所以移动相机等价于反向移动整个世界），"
    "P 再把观察坐标压到 NDC 的视见体里。相机用球面极坐标参数化之后，theta/phi 两个角度就足以覆盖"
    "任意方位的环绕观察，这让我们理解了为什么三维软件都用“绕目标点旋转”作为默认的观察方式。",

    "其次，我们对“消隐”这件事的理解从概念变成了具体的两套手段：深度缓存解决的是“哪个面最终可见”，"
    "它需要正确的清屏和一致的近远平面；后向面剔除解决的是“哪些面根本不用画”，它靠的是三角形绕序约定，"
    "能省掉大约一半的片元计算，但绕序一旦写反，剔除就会把朝向相机的面剔掉，画面看起来像“看穿了物体”。"
    "把两者都做成可切换开关后，我们能直观看到关掉深度缓存时后画的物体错误地压在前面、"
    "关掉剔除时球体内部结构暴露出来的现象，比只看书上结论印象深刻得多。",

    "层次建模是本次附加项里收获最大的一点。太阳系里月球必须跟着地球走，但月球公转又不能受地球自转影响，"
    "这个矛盾的解决方式就是把“公转坐标系”和“自转”拆成两个矩阵，父子关系只继承前者。"
    "这和实际建模软件里把子物体挂到父物体节点下的思路完全一致，也让我们理解了场景图（scene graph）"
    "的基本结构：每个节点只关心自己相对父节点的变换，整个世界位置由沿父链相乘得到。",

    "最后是一些工程方法上的体会。第一，课程框架里也是有 bug 的（没清深度、resize 时缓冲区还没初始化就渲染），"
    "调试时不能默认“框架一定对”，要敢于看现象反推原因；第二，交互程序一定要留可脚本化的验证入口"
    "（URL 参数、自测页），否则每次改动都靠手点，回归成本会越来越高；"
    "第三，中文文档、注释与代码的一致性要一开始就注意，否则过一周自己也看不懂。"
    "这些经验对后续更复杂的图形学实验同样适用。",
]

PARA_RE = re.compile(r"<w:p\b[^>]*>(?:(?!</w:p>).)*?</w:p>", re.S)
TEXT_RE = re.compile(r"<w:t[^>]*>(.*?)</w:t>", re.S)


def para_text(xml):
    return "".join(TEXT_RE.findall(xml))


def main():
    zin = zipfile.ZipFile(SRC, "r")
    doc = zin.read("word/document.xml").decode("utf-8")
    matches = list(PARA_RE.finditer(doc))

    replacements = {}
    member_index = 0
    matched = {"title": 0, "group": 0, "leader": 0, "sections": 0}

    for m in matches:
        text = para_text(m.group(0)).strip()
        if text.startswith("编程作业2"):
            replacements[m.start()] = center_para(TITLE, bold=True, size=44)
            matched["title"] += 1
        elif re.search(r"第\s*xx\s*组", text):
            replacements[m.start()] = center_para(GROUP)
            matched["group"] += 1
        elif text.startswith("组长："):
            replacements[m.start()] = center_para(
                "组长： %s   学号 %s" % LEADER)
            matched["leader"] += 1
        elif text.startswith("组员："):
            if member_index < len(MEMBERS):
                name, sid = MEMBERS[member_index]
                replacements[m.start()] = center_para("组员： %s   学号 %s" % (name, sid))
            else:
                replacements[m.start()] = ""  # 模板里多余的组员行直接删掉
            member_index += 1
        elif "描述一下你是如何完成实验的" in text:
            replacements[m.start()] = "".join(body_para(p) for p in THOUGHT)
            matched["sections"] += 1
        elif "比较重要的地方" in text:
            replacements[m.start()] = "".join(body_para(p) for p in DIFFICULTY)
            matched["sections"] += 1
        elif "实验的总结" in text:
            replacements[m.start()] = "".join(body_para(p) for p in INSIGHT)
            matched["sections"] += 1

    assert matched["title"] == 1, "标题段落定位失败: %r" % matched
    assert matched["group"] == 1, "组号段落定位失败: %r" % matched
    assert matched["leader"] == 1, "组长段落定位失败: %r" % matched
    assert member_index >= len(MEMBERS), \
        "组员行不足: 模板 %d 行, 需要 %d 行" % (member_index, len(MEMBERS))
    assert matched["sections"] == 3, "三节正文定位失败: %r" % matched

    # 按段落位置重建 document.xml，未匹配的段落原样保留
    out = []
    pos = 0
    for m in matches:
        out.append(doc[pos:m.start()])
        out.append(replacements.get(m.start(), m.group(0)))
        pos = m.end()
    out.append(doc[pos:])
    new_doc = "".join(out)

    for bad in ("XX", "xxxxxxxxxxxx", "[描述一下", "[实验的总结", "[你认为实验中"):
        assert bad not in new_doc, "仍残留占位符: " + bad
    assert new_doc.count("组长：") == 1, "组长行数不为 1"
    assert new_doc.count("组员：") == len(MEMBERS), \
        "组员行数不符: %d" % new_doc.count("组员：")

    with zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = new_doc.encode("utf-8")
            zout.writestr(item, data)
    zin.close()
    print("written:", DST)
    print("paragraphs:", len(matches), "-> 替换/修改:", len(replacements))


main()
