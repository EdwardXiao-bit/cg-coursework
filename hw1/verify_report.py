# -*- coding: utf-8 -*-
import re
import zipfile
import xml.etree.ElementTree as ET

P = r"HW1_todo\HW1-报告.docx"
z = zipfile.ZipFile(P)

# 1) zip 结构完整性
bad = z.testzip()
print("zip 完好:", bad is None)

# 2) XML 是否合法
root = ET.fromstring(z.read("word/document.xml"))
print("document.xml 解析: OK")

# 3) 提取纯文本
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
paras = []
for p in root.iter(W + "p"):
    txt = "".join(t.text or "" for t in p.iter(W + "t"))
    if txt.strip():
        paras.append(txt)

print("非空段落数:", len(paras))
print()
for i, t in enumerate(paras, 1):
    print("[%02d] %s" % (i, t[:78] + ("..." if len(t) > 78 else "")))

print()
full = "\n".join(paras)
for bad_marker in ["[描述一下", "[你认为实验", "[实验的总结", "xxxx", "XX", "xxxxxxxxxxxx"]:
    print("残留占位符 %-14s : %s" % (bad_marker, bad_marker in full))

# 4) 字体格式是否保留
doc = z.read("word/document.xml").decode("utf-8")
print()
print("微软雅黑 run 数:", doc.count("微软雅黑"))
print("原有红色标注 run 数:", doc.count('w:color w:val="FF0000"'))
print("段落总数:", doc.count("<w:p>") + doc.count("<w:p "))
