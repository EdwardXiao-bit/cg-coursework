# HW1 2D 图形的交互绘制

计算机图形学 编程作业1 · 小组作业

## 一、实现的功能

| 项目 | 分值 | 完成情况 |
|---|---|---|
| 基本要求：以鼠标点击画布任意位置为中心重绘图形，填充随机色 | 80 | 已完成 |
| 附加项②：将几何图形换成分形图，用 slider 滑动条交互控制递归次数 | 20 | 已完成 |

本项目选择附加项 **②（分形图）**。

## 二、运行方法

### 必须通过本地服务器访问

```bash
# 进入源码目录
cd hw1Code

# 任选一种方式启动本地服务器
python -m http.server 8000        # Python 3
# 或
npx http-server -p 8000           # Node.js
# 或使用 VS Code 的 Live Server 插件直接打开 hw1.html
```

然后在浏览器中访问：**http://localhost:8000/hw1.html**

> **不要直接双击 `hw1.html`。**
> 本项目通过 `Common/initShaders2.js` 用同步 AJAX（`XMLHttpRequest`）读取着色器源码文件，
> 在 `file://` 协议下会被浏览器的同源策略（CORS）拦截，导致弹出
> `Could not find shader source` 而无法运行。

要求的运行环境：支持 **WebGL 2.0** 的现代浏览器（Chrome / Edge / Firefox 均可），无需安装任何开发环境或依赖。

## 三、操作说明

| 操作 | 效果 |
|---|---|
| 鼠标点击画布任意位置 | 分形图以点击位置为中心重新绘制，同时填充一个新的随机色 |
| 拖动左上角"递归次数"滑块（0 ~ 7） | 改变分形图的递归细分次数，图形实时变化 |
| 改变浏览器窗口大小 | 画布与视口自适应，图形按新画布比例重绘 |

## 四、实现原理

### 1. 基本要求：点击重绘 + 随机色

- **坐标转换**：鼠标事件的 `clientX/clientY` 是屏幕像素坐标（原点在画布左上角、y 轴向下、范围 `0 ~ width`），
  而 WebGL 的 NDC 坐标原点在画布中心、y 轴向上、范围 `-1 ~ 1`，转换公式为：

  ```
  ndcX =  (x / canvas.width)  * 2.0 - 1.0
  ndcY = 1.0 - (y / canvas.height) * 2.0      // y 轴需要翻转
  ```

- **图形平移**：顶点数据本身不重新计算，而是在顶点着色器中统一加上中心偏移量：

  ```glsl
  gl_Position.x = aPosition.x + centerX;
  gl_Position.y = aPosition.y + centerY;
  ```

  从而把"改变图形位置"变成一次 uniform 更新，避免重算顶点。

- **随机色**：每次 `mousedown` 时用 `vec4(Math.random(), Math.random(), Math.random(), 1.0)`
  生成新的随机颜色，在 `render()` 中通过 `gl.uniform4fv` 传给片元着色器。

### 2. 附加项②：分形图（Sierpinski 三角垫片）

- **递归细分**：对三角形取三边中点，连接后得到 3 个与原三角形相似、面积为 1/4 的小三角形，递归处理这 3 个小三角形；
  当递归次数减到 0 时，把当前三角形作为最终图元输出（`divideTriangle` 函数）。

- **顶点数增长**：递归 n 次得到 `3^n` 个三角形，顶点数为 `3 × 3^n`。
  递归次数 0 ~ 7 分别对应 1、3、9、27、81、243、729、2187 个三角形，最大 6561 个顶点。

- **slider 交互**：滑块滑动（`input` 事件）时更新全局变量 `depth`，并置 `depthChangedFlag = true`；
  `render()` 检测到该标志后调用 `initFractalGeometry()` 重新生成顶点数组，
  并**重新上传给 VBO**，最后交给 `gl.drawArrays` 绘制。

- **为何要重新上传缓冲区**：`points` 是静态上传到 GPU 顶点缓冲区的，
  递归次数改变后顶点数会成倍变化，因此必须 `gl.bufferData` 重新传输数据；
  且重建前必须清空 `points`，否则新老三角形会叠加。

### 3. 变量与着色器对应关系

| JS 全局变量 | 着色器变量 | 位置 |
|---|---|---|
| `centerX` / `centerY` | `uniform float centerX/centerY` | 顶点着色器 |
| `colorRandom` | `uniform vec4 randomColor` | 片元着色器 |

## 五、关键代码结构

```
hw1Code/
├── hw1.html              入口页面：引入库与脚本、递归次数控制面板 <div id="ui">、全屏 canvas
├── hw1.js                主程序：初始化、鼠标交互、分形递归、渲染
└── shaders/
    ├── hw1.vert          顶点着色器：aPosition + (centerX, centerY)
    └── hw1.frag          片元着色器：输出 randomColor
```

`hw1.js` 主要函数：

| 函数 | 作用 |
|---|---|
| `init()` | 初始化 WebGL、编译着色器、创建 VBO、关联顶点属性、装配 slider |
| `initFractalGeometry()` | 按当前 `depth` 生成分形顶点数组并重新上传到 VBO |
| `divideTriangle(a,b,c,n)` | 分形递归核心：按三边中点细分三角形 |
| `onDepthSliderChange()` | 滑块事件处理：更新递归次数并触发重绘 |
| `render()` | 清屏 → 按需更新 uniform → 按需重建几何体 → `drawArrays` 绘制 |

## 六、开发中遇到的问题与解决（供参考）

1. **直接用 `file://` 打开报 `Could not find shader source`**
   —— `XMLHttpRequest` 读取本地文件被同源策略拦截，改用本地 HTTP 服务器访问解决。

2. **滑块拖不动、看不到控件**
   —— canvas 是 `position: fixed` 且铺满全屏，会吞掉上层鼠标事件。
   给控制面板设置 `position: fixed; z-index: 10` 使其位于 canvas 之上后解决。
   另外若浏览器缓存了旧版 `hw1.html`，页面不会有控件，需强制刷新（`Ctrl + F5`）。

3. **着色器中 uniform 变量名写错**
   —— TODO3 注释里写的是 `colorRandom`，而片元着色器实际声明的是 `randomColor`，
   `getUniformLocation` 取不到位置且不会报错，颜色不会改变。以着色器中的声明为准解决。

4. **修改递归次数后图形不变**
   —— 顶点数据只在 `init()` 中上传过一次，改变递归次数必须重新 `bufferData`；
   且重建前要清空 `points` 数组，否则新旧三角形叠加绘制。

5. **`gl.drawArrays` 的顶点数**
   —— `points` 中每个元素是一个 `vec2`，共 `points.length` 个顶点，
   因此 `drawArrays(gl.TRIANGLES, 0, points.length)` 可直接适配顶点数变化。

## 七、说明

- `Common/` 下的 `webgl-utils.js`、`initShaders2.js`、`MVnew.js` 为课程提供的公共库，未作修改。
- 全部功能仅依赖浏览器原生 WebGL 2.0，无需安装依赖即可运行。

## 八、提交包目录结构

`submission/submit.zip` 解压后（`submission/` 目录下也有同样的一份）：

```
submission/
├── source/            源码（仅源文件：hw1.html、hw1.js、shaders/）
├── executable/        可执行程序（完整可运行页面 + 一键启动脚本）
│   ├── hw1Code/       含 Common/ 公共库，保证无开发环境也能直接运行
│   ├── start-server.bat   双击即启动本地服务器并打开页面
│   └── start-server.ps1
├── 可执行程序/        与 executable/ 内容相同，便于按中文目录名查找
├── readme.md          说明文档
├── HW1-报告.docx       实验报告
├── 2024HW1基本功能完成效果.mp4  功能演示视频
└── submit.zip         本压缩包自身（上传雨课堂用）
```

> 运行提示：`executable/` 下双击 `start-server.bat` 即可（自动启动本地 HTTP 服务器并打开浏览器）。
> 直接双击 `hw1Code/hw1.html` 会因浏览器同源策略拦截 AJAX 读取着色器而无法运行，这是本项目唯一的运行注意事项。

