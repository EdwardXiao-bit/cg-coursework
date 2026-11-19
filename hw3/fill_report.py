# -*- coding: utf-8 -*-
"""把 HW3 报告模板填充成 HW3-报告.docx。

不重建文档，只替换 word/document.xml 里的正文段落，模板的页面设置、页眉、样式全部保留。
用法：python hw3\fill_report.py
"""
import os
import re
import shutil
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "HW3_todo", "编程作业3-报告模板.docx")
DST = os.path.join(ROOT, "hw3", "report", "HW3-报告.docx")

TITLE = ("编程作业3 光栅化渲染着色3D场景——Phong 光照 + 纹理映射 + Shadow Map"
         "（附加项：①cubeMap 环境反射 ②场景雾化 ③阴影反走样）")

NAMES = [("肖铭皓", "2024141460455"), ("张原野", "2024141460416")]

FONT = '<w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/>'


def xml_escape(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def run(text, size=None, bold=False):
    text = xml_escape(text)
    rpr = "<w:rPr>%s%s%s</w:rPr>" % (
        FONT,
        "<w:b/>" if bold else "",
        ('<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (size, size)) if size else "",
    )
    return '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (rpr, text)


def para(text, size=None, bold=False, center=False, indent=None):
    """生成一个正文段落：微软雅黑、单倍行距，正文首行缩进 420（两个汉字）。"""
    ppr = ['<w:pPr><w:spacing w:line="240" w:lineRule="auto"/>']
    if center:
        ppr.append('<w:jc w:val="center"/>')
    if indent:
        ppr.append('<w:ind w:firstLine="%d"/>' % indent)
    rpr = "<w:rPr>%s%s%s</w:rPr>" % (
        FONT,
        "<w:b/>" if bold else "",
        ('<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (size, size)) if size else "",
    )
    ppr.append(rpr)
    ppr.append("</w:pPr>")
    return "<w:p>%s%s</w:p>" % ("".join(ppr), run(text, size, bold))


def heading(num, title):
    return para("%d %s" % (num, title), size=27, bold=True)


def body(paras):
    return "".join(para(t, indent=420) for t in paras)


THOUGHT = [
    "本次作业在课程提供的 Phongshading 框架上完成。框架已经搭好了双缓冲式的结构："
    "一个负责主渲染的 program、一个只写深度的 depthProgram，以及天空盒和光源小方块各自的 program；"
    "render() 里先以光源为相机渲染一遍深度，再换回主相机渲染一遍。我们先把它跑通、"
    "理清顶点着色器里 MVP 与 u_LightSpaceMatrix 分别往哪些 varying 里写，再按题目要求补三处 TODO。",

    "TODO1 是纹理对象。2D 纹理的做法是：创建纹理并绑定，把图片像素上传到 TEXTURE_2D，"
    "开启 y 轴翻转（图片原点是左上角、纹理坐标原点是左下角），生成 mipmap 并把缩小过滤设为三线性、"
    "边缘用 CLAMP_TO_EDGE；容器（container.png）用给立方体，木纹（wood.png）给地面，"
    "绘制前分别绑定到纹理单元 0。天空盒用 cubeMap，六张 jpg 按 POSITIVE_X / NEGATIVE_X / "
    "POSITIVE_Y / NEGATIVE_Y / POSITIVE_Z / NEGATIVE_Z 的顺序上传；cubeMap 单独占纹理单元 3，"
    "因为 WebGL 2 不允许同一个采样器位置既给 sampler2D 又给 samplerCube。"
    "另外图片是异步加载的，上传必须写在 onload 回调里，并在回调里重新激活、绑定纹理。",

    "TODO2 是 Phong 光照。先按光源类型取光线方向：u_lightPosition.w 为 1 时是点光源，"
    "方向为 normalize(lightPos - FragPos)；为 0 时是平行光，方向就是 normalize(lightPos)。"
    "环境光只和材质、光色有关；漫反射用 Lambert 项 max(dot(n, l), 0)；高光用 Blinn-Phong 的"
    "半程向量 h = normalize(viewDir + lightDir)，再取 pow(max(dot(n, h), 0), shininess)。"
    "三个分量乘各自的强度系数后相加，得到 lightReflectColor。顶点着色器里法线用 "
    "transpose(inverse(mat3(model))) 变换，避免模型有非均匀缩放时法线方向出错。",

    "TODO3 是阴影。光源的虚拟相机用 perspective(90°, 1, 0.1, 50) 加 lookAt(lightPos, 原点, +Y)，"
    "得到 lightSpaceMatrix；把立方体与地面用 depthProgram 画进一张 1024×1024 的 DEPTH_COMPONENT32F 深度纹理。"
    "主 pass 的顶点着色器用同一个 lightSpaceMatrix 把片元位置变换到光源裁剪空间，片元着色器里做透视除法、"
    "映射到 [0,1]，再与深度图里该处的最近遮挡物深度比较：片元更远就是阴影。"
    "比较时留一个 0.0025 的偏移，避免浮点误差造成的自阴影条纹。",

    "附加项做了三项，都做成了可在运行时开关的形式，方便现场演示和截图对比。"
    "①cubeMap 环境反射：用 reflect(入射方向, 法线) 采样天空盒，再按视线掠射角做 Fresnel 加权的 mix，"
    "把环境色混进纹理色；把反射强度调到 1、相机压低时，木地板会映出天空盒的雪山。"
    "②场景雾化：按片元到相机的距离算 exp(-(d·density)²)，与雾色混合，雾色取清屏色，"
    "远处地面会自然融进天空盒的地平线。③阴影反走样：把单点深度比较换成 3×3 邻域平均（PCF），"
    "阴影边界从阶梯锯齿变成半影渐变。",
]

DIFFICULTY = [
    "1、立方体和地面完全不显示，只剩天空盒和光源小方块。控制台报 "
    "GL_INVALID_OPERATION: glDrawArrays: Two textures of different types use the same sampler location。"
    "框架把 cubeSampler 和 diffuseTexture 都放在纹理单元 0，WebGL 2 不允许同一单元既给 sampler2D 又给 samplerCube，"
    "整个 draw call 被丢弃。把 cubeMap 挪到独立的纹理单元 3 之后正常。",

    "2、天空盒贴图漏传、或传到错误的纹理对象上。image.onload 是异步回调，执行时当前激活的纹理单元和绑定"
    "可能已经被后面的代码改掉了，框架原代码在回调里没有再 activeTexture / bindTexture，六张图会漏掉。"
    "在回调里重新激活并绑定 cubeMap 再 texImage2D 后解决。",

    "3、环境光强度设了却完全没效果。框架 configMaterialParameters.js 里环境光的 uniform 名字写成 ambientKaStrength，"
    "而 box.frag 声明的是 ambientStrength，getUniformLocation 返回 null，gl.uniform1f(null, …) 静默失败。"
    "改成一致的名字后才生效。",

    "4、阴影糊成一大团，位置还和立方体底边对不上。两个原因叠加：一是光源虚拟相机的视锥用了 155°，"
    "1024² 深度图铺开后每个 texel 覆盖的面积很大，阴影被放粗、bias 显得偏大；二是地面平移到 -1，"
    "而立方体半边长 0.5，立方体实际是悬空 0.55 的，阴影当然接不上。把光源视锥收到 90°、远平面收到 50、"
    "地面平移到 -0.45 之后，阴影贴住立方体、轮廓也清楚了。",

    "5、阴影边缘有阶梯状锯齿。深度图分辨率与地面像素密度不匹配，单点采样时边界是硬的。"
    "改用 3×3 PCF 取平均后出现 0~1 的半影带（附加项③），按 T 可以在 PCF 与硬阴影之间切换对比。",

    "6、阴影里出现条纹（shadow acne）。深度比较的浮点误差导致片元把自己判成遮挡物，"
    "加了固定偏移 SHADOW_BIAS = 0.0025，并把深度纹理精度提高到 DEPTH_COMPONENT32F 后条纹消失。",

    "7、反射和雾的叠加顺序。最初把雾放在最后、反射混在光照之后，反射强度一大整个画面就发灰；"
    "改成先在纹理色里混环境反射得到 albedo，再用它乘光照结果，最后才做雾混合，"
    "三者各管一段（颜色来源 / 光照 / 大气衰减），互不吞掉对方。",

    "8、无头浏览器里没法触发键鼠事件，回归验证成本高。给页面加了 applyQueryParameters()，"
    "可用 ?eyePhi=&eyeRadius=&lightPhi=&shadow=0&pcf=0&fogDensity=0&reflectStrength=1 等参数设定初始状态；"
    "无头 Chrome 必须加 --enable-unsafe-swiftshader 才有软件 WebGL，截图路径必须是绝对路径。"
    "然后用 Python(PIL) 统计两张截图的像素差异，确认每个开关都确有可见变化："
    "关阴影影响 22644 像素、反射弱/强差 481345 像素、关雾差 203393 像素、PCF 与硬阴影差 890 像素（阴影面积本身不大）。",
]

INSIGHT = [
    "这次作业最直接的体会是「颜色不再来自顶点，而来自片元」。前两次作业里颜色是建模时算好写进顶点的，"
    "这次光照、纹理、阴影、反射、雾全都在片元着色器里按每个像素算，所以参数的物理含义变重要了："
    "ambient/diffuse/specular 各乘什么、shininess 控制高光多尖、bias 太小会自阴影、太大阴影会脱开物体。",

    "Shadow Map 的本质是「从光源拍一张深度照片，再和主相机的深度比大小」。想通这一点之后，"
    "阴影糊、脱开、条纹这些问题的定位都变成了检查三件事：深度图分辨率够不够、光源视锥盖没盖住场景、"
    "比较时的偏移合不合适，而不是盲调参数。代价是这套方法只能得到硬阴影，边界质量取决于深度图分辨率，"
    "所以还要靠 PCF 这类滤波去补。",

    "工程方法上也有收获：三项附加特效全部做成可实时开关，并且用 URL 参数配合无头截图做对比，"
    "每个结论都有像素差数字支撑。判断「效果有没有生效」时不靠肉眼说「好像更好了」，"
    "而是先想办法把开关拨到两端、拿到可量化的差异。",
]

REFERENCES = [
    "[1] LearnOpenGL：Shadow Mapping、Cubemaps、Physically Based Rendering 章节，https://learnopengl.com",
    "[2] MDN WebGL 2.0 文档：Texture2D / TextureCubeMap / textureSize / DEPTH_COMPONENT32F，https://developer.mozilla.org/docs/Web/API/WebGL_API",
    "[3] 课程课件：《Phong 光照模型与 Phong Shading》《阴影映射 Shadow Map》",
    "[4] 课程提供的框架代码（Common/MVnew.js、Common/initShaders2.js、Models.js 等）",
    "[5] Khronos Group：《OpenGL ES 3.0 / WebGL 2.0 Specification》",
]

AI_NOTE = [
    "使用了 DeepSeek Harness（带浏览器与无头截图能力的 agentic 编码工具）辅助完成本次作业。"
    "它主要用在三件事上：一是通读课程框架、定位到三处 TODO 与框架自身的几个 bug（纹理单元冲突、"
    "uniform 名字不一致、readBuffer 传数组）；二是写 shader 与调参，每次改动后起本地服务器、"
    "用无头 Chrome 截图对比；三是把截图差异用 PIL 统计成像素数字，作为「特效确实生效」的证据。",
    "需要说明的是：所有代码改动与最终取舍都由我们逐处审阅确认，光照/阴影的公式与参数含义、"
    "阴影脱开与自阴影的成因判断，都是我们自己理解后再定下来的；报告的排版由 fill_report.py 生成，"
    "正文内容由我们撰写与修改。验证方式也都是可复现的：同一页面不同 URL 参数各截一张图做像素差。",
]


def build_document_xml(xml):
    body_start = xml.find("<w:body>") + len("<w:body>")
    sect_start = xml.find("<w:sectPr")
    if body_start < 0 or sect_start < 0:
        raise RuntimeError("模板结构不符合预期：找不到 <w:body> 或 <w:sectPr>")

    parts = []
    parts.append(para(TITLE, size=44, bold=True, center=True))
    for name, sid in NAMES:
        parts.append(para("姓名 %s 学号 %s" % (name, sid), center=True))
    parts.append(para(""))
    parts.append(heading(1, "思路"))
    parts.append(body(THOUGHT))
    parts.append(heading(2, "重点难点"))
    parts.append(para("", indent=0))
    parts.append(body(DIFFICULTY))
    parts.append(heading(3, "心得"))
    parts.append(body(INSIGHT))
    parts.append(heading(4, "参考文献"))
    parts.append(body(REFERENCES))
    parts.append(heading(5, "AI工具使用说明"))
    parts.append(body(AI_NOTE))

    return xml[:body_start] + "".join(parts) + xml[sect_start:]


def main():
    if not os.path.exists(SRC):
        raise SystemExit("模板不存在: %s" % SRC)

    with zipfile.ZipFile(SRC, "r") as zin:
        document = zin.read("word/document.xml").decode("utf-8")
        new_document = build_document_xml(document)

    checks = {
        "标题": new_document.count("编程作业3 光栅化渲染着色3D场景"),
        "姓名行": new_document.count("姓名 "),
        "学号-肖": new_document.count("2024141460455"),
        "学号-张": new_document.count("2024141460416"),
    }
    if checks["学号-肖"] != 1 or checks["学号-张"] != 1:
        raise SystemExit("姓名/学号替换异常: %r" % checks)

    paragraphs = re.findall(r"<w:p\b[^>]*>.*?</w:p>", new_document, re.S)
    section_titles = ["1 思路", "2 重点难点", "3 心得", "4 参考文献", "5 AI工具使用说明"]
    plain = ["".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S)) for p in paragraphs]
    for t in section_titles:
        if not any(x.strip() == t for x in plain):
            raise SystemExit("缺少小节: %s" % t)
    for bad in ["[描述一下", "[你认为", "[实验的总结", "[列出主要", "[说明使用", "XXXXXXXXXXXX", "xxxxxxxxxxxx"]:
        if any(bad in x for x in plain):
            raise SystemExit("模板占位符未替换: %s" % bad)

    os.makedirs(os.path.dirname(DST), exist_ok=True)
    with zipfile.ZipFile(SRC, "r") as zin, zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = new_document.encode("utf-8")
            zout.writestr(item.filename, data)

    with zipfile.ZipFile(DST, "r") as z:
        final = z.read("word/document.xml").decode("utf-8")
    txt = ["".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S)) for p in
           re.findall(r"<w:p\b[^>]*>.*?</w:p>", final, re.S)]

    print("written:", os.path.relpath(DST, ROOT))
    print("XML_LEN:", len(final), "段落数:", len(txt))
    for i, t in enumerate(txt):
        print("[%02d] %s" % (i, t[:50]))


if __name__ == "__main__":
    main()
