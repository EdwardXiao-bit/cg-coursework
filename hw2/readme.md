# HW2 3D 物体建模与场景漫游

计算机图形学 编程作业2 · 小组作业（第 6 组）

## 一、实现的功能

| 项目 | 分值 | 完成情况 |
|---|---|---|
| TODO1：生成墨西哥帽的高度场网格（11×11） | 20 | 已完成 |
| TODO2：模型变换矩阵 M（Z/C 缩放物体） | 20 | 已完成 |
| TODO3：视图变换矩阵 V（W/S 绕 X 轴、A/D 绕 Y 轴转动视点） | 20 | 已完成 |
| TODO4：投影变换矩阵 P（P 切换正交/透视，M/N 调 fov） | 20 | 已完成 |
| 附加项①：复杂模型——太阳系（太阳 + 6 个天体，含卫星） | — | 已完成 |
| 附加项②：鼠标拖动实现绕任意轴旋转（虚拟跟踪球，旋转可累积） | — | 已完成 |
| 附加项④：层次建模 + 动画 + 可配置消隐（后向面剔除、深度缓存） | — | 已完成 |

我们选择附加项 **①（复杂模型：太阳系）、②（鼠标任意轴旋转）、④（层次建模与可配置消隐）**，
并把三项合在一起演示：太阳系是层次模型，月球跟随地球公转；整个场景可以用鼠标虚拟跟踪球绕着
任意轴转动；后向面剔除与深度缓存都做成了可实时开关，方便观察它们各自的作用。

## 二、运行方法

### 必须通过本地服务器访问

```bash
# 进入源码目录
cd hw2Code

# 任选一种方式启动本地服务器
python -m http.server 8000        # Python 3
# 或
npx http-server -p 8000           # Node.js
# 或使用 VS Code 的 Live Server 插件直接打开 3d-wandering.html
```

然后在浏览器中访问：**http://localhost:8000/3d-wandering.html**

> **不要直接双击 `3d-wandering.html`。**
> 本项目通过 `Common/initShaders2.js` 用同步 AJAX（`XMLHttpRequest`）读取着色器源码文件，
> 在 `file://` 协议下会被浏览器的同源策略（CORS）拦截，导致弹出
> `Could not find shader source` 而无法运行。

要求的运行环境：支持 **WebGL 2.0** 的现代浏览器（Chrome / Edge / Firefox 均可），无需安装任何开发环境或依赖。

### 一键启动（推荐）

`executable/`（或 `可执行程序/`）里带了启动脚本，双击 **`start-server.bat`** 即可：

- 自动找到 `hw2Code/` 与其中的 `3d-wandering.html`，不需要手敲路径；
- 若 8000 端口已被别的程序占用，会自动改用 8001、8002…，不会打开一个 404 页面；
- 先等到页面真正返回 HTTP 200 才打开浏览器，所以看到的不会是 `File not found`；
- 服务器在单独的窗口里运行，关掉那个窗口即停止。

`start-server.ps1` 是同一逻辑的 PowerShell 版本；若系统禁止运行 `.ps1`（提示"未数字签名"），用 `.bat` 即可。

## 三、操作说明

| 操作 | 效果 |
|---|---|
| 左上角"模型"下拉框 | 切换显示立方体 / 球体 / 墨西哥帽 / 太阳系 |
| 鼠标左键在画布上拖动 | 虚拟跟踪球：物体绕任意轴旋转，连续拖动可累积旋转 |
| `Z` / `C` | 物体整体放大（×1.1）/ 缩小（×0.9） |
| `W` / `S` | 视点上下俯仰，φ 每次 ∓5°（相机在半径 2 的球面上绕 X 轴转） |
| `A` / `D` | 视点左右环绕，θ 每次 ∓5°（相机绕 Y 轴转） |
| `P` | 在正交投影与透视投影之间切换 |
| `M` / `N` | 透视投影的 fov 每次 +5° / -5°，范围限制在 5°~170° |
| `B` | 切换后向面剔除（等价于顶部"后向面剔除"复选框） |
| `F` | 切换深度缓存（等价于顶部"深度缓存"复选框） |
| 空格 | 复位所有交互参数（缩放、视角、投影、跟踪球旋转、消隐开关） |
| 改变浏览器窗口大小 | 画布保持 1:1 自适应，图形不变形 |

## 四、实现原理

### 1. 渲染流程与 MVP 变换

`render()` 每帧依次做三件事：算出三个变换矩阵 → 作为 uniform 传给着色器 → 分两遍绘制。

- **三个矩阵**：`formModelMatrix()`、`formViewMatrix()`、`formProjectMatrix()` 分别返回 M、V、P，
  用 `MVnew.js` 的 `flatten()` 展平后 `gl.uniformMatrix4fv` 上传。
  （`flatten` 对矩阵做的是转置式展开，正好匹配 WebGL 列主序的要求。）
- **两种绘制**：顶点着色器用 `u_Flag` 区分——
  `u_Flag == 0` 时 `gl_Position = P·V·v`，用来画固定在场景原点的 XYZ 坐标轴；
  `u_Flag == 1` 时 `gl_Position = P·V·M·v`，用来画物体，物体才会跟着 M 缩放/旋转。
- **数据组织**：所有顶点放在全局数组 `points`、颜色放在 `colors`，每个顶点是 `vec4`；
  `SendData()` 用 `gl.bufferData` 一次性上传，切换模型时重建数组再重新上传。
  坐标轴占前 18 个顶点（3 轴 × 每轴 2 点），物体顶点从下标 18 开始。

### 2. TODO1：墨西哥帽高度场

- **网格划分**：`nRows = nColumns = 11`，位置域 `x = 2i/nRows - 1`、`z = 2j/nColumns - 1`，
  落在 `[-1, 1] × [-1, 1]`。
- **数据域**：位置再乘 `2π`——`u = 2πx`、`v = 2πz`，`r = √(u² + v²)`，
  高度 `y = sin(r)/r`，`r == 0` 时取极限 `1.0`。
- **为什么必须乘 2π**：`sin(r)/r` 的零点在数据域 `r = π`、`2π`，映射回位置域正好是 `r = 0.5`、`1.0`，
  画面上才会出现"中央帽顶 — 一圈凹槽 — 外圈帽檐"的形状；若忘记乘 `2π`，`r` 最大只有 `1.414`，
  只能看到帽顶的一小块。
- **三角形与颜色**：每个网格单元拆成两个三角形（每格 6 个顶点），
  颜色按高度 `t = (y - ymin)/(ymax - ymin)` 从蓝 `(0.15, 0.35, 0.95)` 渐变到红 `(0.95, 0.25, 0.1)`，
  便于观察高度起伏。

### 3. TODO2：模型矩阵 M

```js
var modelMatrix = mult(trackballMatrix, scale(modelScale, modelScale, modelScale));
```

`modelScale` 由 Z/C 键每次乘 1.1 / 0.9 改变，`scale` 是 `MVnew.js` 提供的缩放矩阵。
左侧的 `trackballMatrix` 是附加项②的鼠标旋转矩阵，这样缩放与鼠标旋转可以同时生效
（均匀缩放与旋转可交换，所以顺序不影响结果）。

### 4. TODO3：视图矩阵 V

相机位置用球面极坐标参数化，`radius = 2`（物体坐标范围在 `[-1, 1]` 内，半径必须大于 1）：

```js
var eye = vec3(radius * Math.sin(ph) * Math.cos(th),
               radius * Math.cos(ph),
               radius * Math.sin(ph) * Math.sin(th));
// ph = radians(phi)，phi 是从 +Y 轴量起的极角；th = radians(theta)，theta 是绕 Y 轴的方位角
```

- `φ = 90°、θ = 0°` 时 `eye = (2, 0, 0)`，`φ` 越小越接近正上方，`θ` 改变时相机绕 Y 轴环绕。
- **up 向量不能用固定的 `(0, 1, 0)`**：当 φ 接近 0° 或 180°（相机正对顶部/底部）时，
  视线方向与 `(0, 1, 0)` 共线，`lookAt` 内部 `cross(视线, up)` 得到零向量，归一化后出现 NaN，整屏变白。
  我们改取球面上与视线垂直的切线方向：

  ```js
  var up = vec3(-Math.cos(ph) * Math.cos(th),
                 Math.sin(ph),
                -Math.cos(ph) * Math.sin(th));
  ```

  它在任意 φ 都严格垂直于视线方向；`φ = 90°、θ = 0°` 时恰好退化为 `(0, 1, 0)`，与直觉一致。

### 5. TODO4：投影矩阵 P

```js
const near = 0.5, far = 10.0;
const left = -2.0, right = 2.0, bottom = -2.0, ytop = 2.0;
const aspect = 1.0;              // 画布是 1:1，纵横比取 1
return isOrth ? ortho(left, right, bottom, ytop, near, far)
              : perspective(fov, aspect, near, far);
```

- 相机在半径 2 的球面上，物体（含太阳系轨道半径 1.3 + 天体半径 0.15）都在 ±1.6 内，
  `near = 0.5`、`far = 10` 能把景物完整包含进视见体。
- `MVnew.js` 的 `perspective` 是 OpenGL 式投影矩阵（`result[3][2] = -1`），**near/far 必须取正值**；
  `fov` 传角度值，函数内部会调用 `radians()` 转成弧度。
- `fov = 120°` 是纵向视野张角，M/N 每次 ±5°，并限制在 5°~170° 以免出现退化或翻转。

### 6. 附加项①：太阳系（复杂模型 + 分段绘制）

- **单位球生成**：`pushUnitSphere(subdiv, color)` 从正四面体出发递归细分，每个三角形取三边中点并
  归一化回球面，拆成 4 个小三角形；最后按固定顺序压入 `points/colors`，返回该球占用的顶点区间
  `{start, count}`。
- **共用一份缓冲区**：太阳、水星、金星、地球、火星、木星，加上地球的卫星月球，共 7 个天体都放进
  同一个 `points` 数组，绘制时用

  ```js
  gl.drawArrays(gl.TRIANGLES, body.start, body.count);
  ```

  按区间分段取用，每个天体单独上传自己的模型矩阵。
- **轨道线**：公转轨道用 `LINES` 画成 96 段圆（`pushOrbitCircle`），同样记录区间，在父天体的坐标系里绘制。
- **天体参数**：尺寸、轨道半径、公转/自转速度、轨道倾角都作为数据写在 `generateSolarSystem()` 里，
  太阳居中（半径 0.22），其余天体半径 0.03~0.15、轨道半径 0.42~1.30，月球绕地球轨道半径 0.17。

### 7. 附加项②：鼠标虚拟跟踪球（arcball）

- **屏幕坐标 → 单位半球**：把画布上的鼠标点归一化到 `[-1, 1]`（canvas 的 y 轴向下，需要翻转），
  落在单位圆内的点取 `z = √(1 - x² - y²)` 得到球面点；单位圆外的点压到赤道圆周上（`z = 0`），
  这样鼠标拖出球外也不会突然跳变。
- **半球坐标 → 世界坐标**：`(屏幕右, 屏幕上, 指向观察者)` 是一组**左手系**分量，直接当世界坐标求叉积，
  旋转方向会镜像。所以先用当前 θ/φ 算出相机的一组基向量 `u`（屏幕右）、`v`（屏幕上）、`n`（原点指向相机，
  与 TODO3 的 `lookAt` 内部定义一致），球面点按 `p = u·sx + v·sy + n·sz` 换到世界坐标。
- **旋转轴与旋转角**：取前一帧球面点 `w0` 与当前点 `w1`（都已换成世界坐标），
  旋转轴 = `cross(w0, w1)` 归一化，旋转角 = `acos(dot(w0, w1))` 转成角度。
- **符号**：`MVnew.rotate(θ, axis)` 的矩阵其实是标准旋转的转置（顺时针约定），所以取 `-angle`，
  否则"被抓住的那个点"会朝鼠标的反方向跑。
- **累积**：新旋转左乘到累积矩阵，世界坐标系下连续拖动即可绕任意轴旋转：

  ```js
  trackballMatrix = mult(rotate(-angle, normalize(axis)), trackballMatrix);
  ```

  最终模型矩阵 `M = trackballMatrix · S`（见 TODO2），所以鼠标旋转与 Z/C 缩放同时有效。

### 8. 附加项④：层次建模、动画与可配置消隐

- **层次建模**：每个天体拆成两个矩阵——
  `solarFrame(i)`：父坐标系 × 轨道倾角 × 公转角 × 平移到轨道半径处，只描述"这个天体的坐标系在哪里"
  （公转角写成 `rotate(-orbitAngle, …)`：`MVnew.rotate()` 是转置约定，取负号后从 +Y 俯视才是逆时针公转，
  与真实太阳系一致；太阳自身没有公转角，验证时给太阳也赋 `orbitAngle` 会把子天体再转一次）；
  `solarModelMatrix(i)`：在 frame 上再叠加自转与半径缩放。
  月球的父坐标系取地球的 **frame**（公转坐标系），而不是地球叠加自转后的矩阵，
  因此月球跟随地球绕太阳公转，但不会被地球自转甩着转，轨道保持圆形。
- **动画**：`requestAnimationFrame` 逐帧回调，按两帧时间差 `dt` 更新各天体的公转角/自转角；
  `dt` 限制在 0.1 秒以内，避免浏览器切到后台再回来时行星瞬移。
  月球只跟随地球公转（`parent >= 0`），自转对所有天体都更新。
- **可配置消隐**：`render()` 每帧按开关显式设置

  ```js
  if (isCulling) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
  if (isDepthTest) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
  ```

  顶部两个复选框与 B/F 键都会修改这两个全局变量。
  关掉深度缓存可以看到"后画的物体盖住前面物体"的错误遮挡（坐标轴压在所有天体上）；
  后向面剔除则依赖三角形绕序——我们已在初始化时设置 `gl.frontFace(gl.CCW)`、`gl.cullFace(gl.BACK)`，
  并把课程 `generateSphere()` 的绕序修正为外表面逆时针，否则球体会被当成背面剔掉。

### 9. 变量与着色器对应关系

| JS 全局变量 | 着色器变量 | 位置 |
|---|---|---|
| `ModelMatrix` / `ViewMatrix` / `ProjectionMatrix` | `uniform mat4 u_ModelMatrix / u_ViewMatrix / u_ProjectionMatrix` | 顶点着色器 |
| `u_Flag`（0 画坐标轴，1 画物体） | `uniform int u_Flag` | 顶点着色器 |

## 五、关键代码结构

```
hw2Code/
├── 3d-wandering.html    入口页面：模型下拉框、后向面剔除/深度缓存复选框、操作提示栏、全屏 canvas
├── 3d-wandering.js      主程序：初始化、MVP 矩阵、键盘/鼠标事件、太阳系动画与分段绘制
├── models-data.js       几何数据：立方体、球体、墨西哥帽、单位球递归细分、太阳系天体与轨道
├── Common/              课程提供的公共库（webgl-utils.js、initShaders2.js、MVnew.js，未修改）
└── shaders/
    ├── 3d-wandering.vert  顶点着色器：按 u_Flag 计算 PV 或 PVM，传递颜色
    └── 3d-wandering.frag  片元着色器：直接输出顶点颜色
```

`3d-wandering.js` 主要函数：

| 函数 | 作用 |
|---|---|
| `window.onload` | 初始化 WebGL、编译着色器、创建缓冲区、关联 uniform、注册事件、生成初始模型并渲染 |
| `render()` | 清屏（颜色+深度）→ 按开关设置剔除/深度 → 计算 M/V/P → 上传 uniform → 画坐标轴与物体 |
| `formModelMatrix()` | TODO2：`M = R_trackball · S(modelScale)` |
| `formViewMatrix()` | TODO3：球面极坐标算 `eye`、切线方向算 `up`，返回 `lookAt(eye, at, up)` |
| `formProjectMatrix()` | TODO4：按 `isOrth` 返回 `ortho(...)` 或 `perspective(fov, ...)` |
| `modelChange(model)` | 重新生成所选模型的顶点数据并上传，太阳系额外启动动画 |
| `trackballVector()` / `onMouseDown/Move/Up` | 附加项②：鼠标位置映射到半球，累积旋转矩阵 |
| `solarFrame()` / `solarModelMatrix()` | 附加项④：天体的层次坐标系与最终模型矩阵 |
| `drawSolarSystem()` | 分段绘制各天体轨道（`LINES`）与球体（`TRIANGLES`） |
| `solarAnimate()` | 附加项④：逐帧更新公转/自转角度并重绘 |
| `resize()` | 画布保持正方形自适应；初始化完成前不渲染，避免空缓冲区告警 |

`models-data.js` 主要函数：

| 函数 | 作用 |
|---|---|
| `vertextsXYZ()` | 生成 3 条坐标轴的 18 个顶点与颜色 |
| `generateCube()` | 生成 6 面立方体（每面一个颜色） |
| `generateSphere()` | 正四面体递归细分生成球体（绕序已修正为外表面 CCW） |
| `generateHat()` | 生成 11×11 墨西哥帽高度场网格 |
| `pushUnitSphere()` | 递归细分生成单位球，返回 `{start, count}` |
| `generateSolarSystem()` | 建立 7 个天体的参数、球体区间与轨道线 |

## 六、我们在开发中遇到的问题与解决

1. **相机抬到正上方时整屏变白**
   —— `up` 用固定的 `(0, 1, 0)`，当视线与它共线时 `lookAt` 内部叉积为零向量，归一化后出现 NaN。
   改用与视线垂直的球面切线方向作为 `up` 后解决，并用 φ = 0°/180° 截图确认不再退化。

2. **切换模型或转动相机后出现错误遮挡、黑块**
   —— 课程框架原来的 `render()` 只 `gl.clear(gl.COLOR_BUFFER_BIT)`，没有清深度缓冲，
   上一帧的深度值残留在下一帧造成错误遮挡。我们改成清 `COLOR | DEPTH`。

3. **打开后向面剔除后球体消失、能看到球体内部的坐标轴**
   —— 课程 `generateSphere()` 压入顶点的顺序使外表面为顺时针，`gl.frontFace(CCW) + cullFace(BACK)`
   时被剔除的恰好是朝向相机的外表面。把 `triangle(a, b, c)` 改为按 `a, c, b` 压入后解决。

4. **墨西哥帽画成了一圈波浪**
   —— 数据域忘记乘 `2π`，零点和起伏位置全错；另外 `r = 0` 处直接除零得到 NaN。
   改为 `y = sin(r)/r`、`r = 0` 取 1，位置域乘 `2π` 后得到正确的帽形。

5. **月球被地球自转甩着转，轨道不是圆**
   —— 月球最初直接挂在地球的模型矩阵下，公转与自转混在一起。
   拆成 `solarFrame()`（父坐标系 + 公转）与 `solarModelMatrix()`（再叠加自转）两层后，
   月球父坐标系取地球的 frame，问题解决。

6. **7 个天体都叠在原点**
   —— 所有球体共用一个顶点缓冲区，`gl.drawArrays` 必须按每个天体的 `start/count` 分段绘制，
   并每段上传各自的模型矩阵。

7. **切到后台再回来时行星瞬移**
   —— `requestAnimationFrame` 的时间戳间隔在后台会变得很大，我们把每帧 `dt` 限制在 0.1 秒以内。

8. **`resize()` 在初始化完成前触发渲染告警**
   —— 页面加载时 `resize()` 会调用 `render()`，此时 uniform 与缓冲区尚未就绪。
   加 `initialized` 标志，初始化完成后才允许 `resize()` 内渲染。

9. **鼠标向右拖，立方体却是右边的面转进来（拖动方向整体反了）**
   —— 验收时发现的。弧球向量 `(屏幕右, 屏幕上, 指向观察者)` 是左手系，直接拿它当世界坐标求叉积，
   得到的旋转轴在世界坐标里是镜像的；再叠加 `MVnew.rotate()` 的转置约定，两处符号问题叠加后，
   水平拖动变成"正面朝反方向转"，竖直拖动甚至退化成绕视线自旋。
   改为先按相机的基向量把球面点换到世界坐标，再用 `rotate(-angle, …)`。
   验证方式是写临时页合成 `mousedown/mousemove` 事件：右拖 400px 后正面（红）应转到画面右侧、左侧的蓝色面转进来；
   下拖后正面转到下方、绿色顶面转进来；左拖则相反。

10. **太阳系公转方向反了（默认视角下行星顺时针绕太阳转）**
   —— 验收时发现的。`solarFrame()` 里最初写 `rotate(orbitAngle, Y)`，而 `MVnew.rotate()` 的矩阵是标准旋转的转置，
   正角度实际是顺时针，于是从上方看行星顺时针公转，与真实太阳系（逆时针）相反。
   改成 `rotate(-orbitAngle, Y)` 后，节点坐标变成 `(r·cos a, 0, -r·sin a)`，
   从 +Y 俯视由 +X 转向 −Z，即逆时针；自转角度不受影响。
   排查时还踩了一个坑：临时页给太阳（`parent < 0`，本没有公转角）也赋了 `orbitAngle`，
   导致父坐标系先转一次、子天体再转一次，看到的方位恰好是 2 倍角度；动画里只更新 `parent >= 0` 的天体，所以正式逻辑没有这个问题。

## 七、说明

- `Common/` 下的 `webgl-utils.js`、`initShaders2.js`、`MVnew.js` 为课程提供的公共库，我们未作任何修改
  （仅在 `models-data.js` 中修正了 `generateSphere()` 的顶点绕序）。
- 为了便于自动化回归验证，页面支持通过 URL 参数指定初始状态，例如：
  `?model=solar&orth=0&cull=1&depth=0&scale=1.2&phi=45&theta=20&fov=90`。
  这些参数只是调试入口，不影响正常交互；手工运行时直接用页面控件即可。

## 八、提交包目录结构

`hw2/submission/HW2.zip` 解压后得到一层 `HW2/` 目录，结构如下：

```
HW2/
├── source/            源码（仅源文件：3d-wandering.html、3d-wandering.js、models-data.js、shaders/）
├── executable/        可执行程序（完整可运行页面 + 一键启动脚本）
│   ├── hw2Code/       含 Common/ 公共库，保证无开发环境也能直接运行
│   ├── start-server.bat   双击即启动本地服务器并打开页面
│   └── start-server.ps1
├── 可执行程序/        与 executable/ 内容相同，便于按中文目录名查找
├── readme.md          说明文档
└── HW2-报告.docx       实验报告
```

在仓库根目录执行下面的命令即可重新生成提交包：

```powershell
.\tools\build-submission.ps1 -Hw hw2                  # 生成 hw2\submission\HW2.zip（不含视频）
.\tools\build-submission.ps1 -Hw hw2 -IncludeVideo    # 附带演示视频（需先在 hw2/report/ 放 .mp4）
```

> 运行提示：`executable/` 下双击 `start-server.bat` 即可（自动启动本地 HTTP 服务器并打开浏览器）。
> 直接双击 `hw2Code/3d-wandering.html` 会因浏览器同源策略拦截 AJAX 读取着色器而无法运行，这是本作业唯一的运行注意事项。
