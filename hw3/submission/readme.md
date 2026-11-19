# HW3 光栅化渲染着色 3D 场景

计算机图形学 编程作业3 · 小组作业（第 6 组）

## 一、实现的功能

| 项目 | 分值 | 完成情况 |
|---|---|---|
| 基本要求 1：场景物体具有简单光照颜色（Phong Model，ambient/diffuse/specular 三分量） | 80 | 已完成 |
| 基本要求 2：场景物体具有纹理细节（容器与木地板两张 2D 纹理） | 80 | 已完成 |
| 基本要求 3：光线遮挡阴影（Shadow Map，光源视角深度图 + 比较） | 80 | 已完成 |
| 附加项①：cubeMap 环境贴图反射（反射向量采样天空盒 + Fresnel 混合） | 20 | 已完成 |
| 附加项②：场景雾化（指数雾，与天空盒自然衔接） | 20 | 已完成 |
| 附加项③：阴影反走样（3×3 PCF，可按键切回单点硬阴影对比） | 20 | 已完成 |

基本要求的三项都在 fragment shader 里完成：光照色在 `shaders/box.frag` 的 `main()` 里按 Phong 模型算，
纹理色由 `texture(diffuseTexture, TexCoord)` 采样，阴影色由 `shadowCalculation()` 返回的 0/1（PCF 下是 0~1 的覆盖比例）参与混合。
附加项按题目要求「实现两个即可」，我们做了 ①、②、③ 三项，并都做成运行时可切换，方便现场演示。

## 二、运行方法

### 必须通过本地服务器访问

```bash
cd hw3Code
python -m http.server 8000        # 或 npx http-server -p 8000
```

然后访问 **http://localhost:8000/Phongshading.html**。

> **不要直接双击 `Phongshading.html`。**
> 框架用 `Common/initShaders2.js` 同步 XHR 读取 `shaders/*.vert|frag`，`file://` 协议下会被同源策略拦截，
> 页面会报 `Could not find shader source` 并且只画出一个黑屏。
> 另外天空盒与两个贴图是从 `skybox/`、`container.png`、`wood.png` 读的，同样要求 HTTP 环境。

要求的运行环境：支持 **WebGL 2.0** 的现代浏览器（Chrome / Edge / Firefox 均可），无需安装依赖。
`gl.texImage2D` 的 mipmap、`textureSize()`、`samplerCube` 等都用到了 WebGL 2 的特性。

### 一键启动（可选）

提交包的 `executable/`（或 `可执行程序/`）里带了 `start-server.bat`：双击后会自动找到
`hw3Code/Phongshading.html`、挑一个空闲端口、等到页面返回 HTTP 200 再打开浏览器。
`.ps1` 是同一逻辑的 PowerShell 版本，若系统禁止运行（提示"未数字签名"），用 `.bat` 即可。

## 三、操作说明

| 操作 | 效果 |
|---|---|
| `C` / `V` | 光源类型：点光源（`lightPosition.w = 1`）/ 平行光（`w = 0`） |
| `Y` / `U` | 拉大 / 缩小光源到场景中心的距离（`lightRadius`） |
| `W`/`S`、`A`/`D` | 光源绕 X / Y 轴旋转（`lightPhi`、`lightTheta`），用来观察阴影方向 |
| `I`/`K`、`J`/`L`、`<`/`>` | 相机俯仰、环绕、拉近拉远 |
| `M`/`N` | 透视投影的视场角 `fov` 加减 5° |
| 鼠标左键拖动 | 旋转相机（改变 `eyeTheta` / `eyePhi`） |
| 鼠标中键拖动 | 平移观察目标点 |
| 鼠标右键拖动 / 滚轮 | 拉近拉远相机 |
| `O` | 显示 / 关闭阴影（对比基本要求 3 的效果） |
| `T` | 切换 PCF 反走样 / 单点硬阴影（附加项③） |
| `G` | 开启 / 关闭场景雾（附加项②） |
| `H` | 增强 / 恢复 cubeMap 反射强度（附加项①） |
| 空格 | 复位到初始的相机与光源位置 |
| 改变窗口大小 | 画布随之自适应，视口保持正方形、画面不变形 |

## 四、实现原理

### 1. 渲染流程：两遍 shadow map + 一遍主渲染

`render()` 每帧做两件事：

1. **深度 pass（只写深度）**：把相机换成光源——
   `lightProjection = perspective(90°, 1, 0.1, 50)`、`lightView = lookAt(lightPos, (0,0,0), (0,1,0))`、
   `lightSpaceMatrix = lightProjection · lightView`；绑定 1024×1024 的 `DEPTH_COMPONENT32F` 深度纹理作
   `DEPTH_ATTACHMENT` 的帧缓冲，用只输出位置的 `depth.vert` 画一遍立方体和地板，得到「从光源看谁在最前面」。
2. **主 pass**：正常相机画立方体（容器纹理）、地板（木纹纹理）、光源小方块和天空盒。
   `box.vert` 里额外把片元位置变换到光源裁剪空间存进 `FragPosLightSpace`，供 `box.frag` 比较深度。

`gl.drawBuffers([gl.NONE])` + `gl.readBuffer(gl.NONE)` 让帧缓冲只保留深度，不需要颜色附件。

### 2. TODO1：纹理对象（2D 纹理 + cubeMap）

`configureTexture(image)` 负责 2D 纹理：

```js
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);   // 图片 y 轴朝下，纹理坐标朝上，需要翻转
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
gl.generateMipmap(gl.TEXTURE_2D);               // 缩小到远处时减少闪烁
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
```

天空盒用的 cubeMap 在 `configureCubeMap(program)` 里：给 six faces 的 `TEXTURE_CUBE_MAP_POSITIVE_X/NEGATIVE_X/
POSITIVE_Y/NEGATIVE_Y/POSITIVE_Z/NEGATIVE_Z` 分别 `texImage2D` 六张 `skybox/*.jpg`，过滤用 `LINEAR`、
`WRAP_S/T/R` 用 `CLAMP_TO_EDGE`（避免立方体边缘出现接缝）。

两个细节：

- cubeMap 放在**独立的纹理单元 3**（`CUBE_MAP_UNIT`）。WebGL 2 规定同一采样器位置不能同时被
  `sampler2D` 和 `samplerCube` 使用，而主程序的 `diffuseTexture` / `depthTexture` 已占了单元 0、1。
- 图片是异步加载的，`image.onload` 执行时当前激活的纹理单元可能已经变了，所以回调里必须重新
  `gl.activeTexture` + `gl.bindTexture` 再 `texImage2D`（框架原代码缺这两句，六张图会漏掉）。

### 3. TODO2：Phong 光照模型

`box.frag` 里先按光源类型算光线方向：`u_lightPosition.w == 1` 时是点光源，`lightDir = normalize(lightPos - FragPos)`；
否则是平行光，`lightDir = normalize(lightPos)`。然后三个分量：

```glsl
vec3 ambient  = ambientStrength * lightColor;                                  // 环境光：只和材质/光色有关
float diff    = max(dot(norm, lightDir), 0.0);                                  // Lambert 漫反射
vec3 diffuse  = diffuseStrength * diff * lightColor;
vec3 halfDir  = normalize(viewDir + lightDir);                                  // Blinn-Phong 半程向量
float spec    = pow(max(dot(norm, halfDir), 0.0), max(shininess, 1.0));
vec3 specular = specularStrength * spec * lightColor;
vec3 lightReflectColor = ambient + diffuse + specular;
```

`box.vert` 里法线是 `transpose(inverse(mat3(M))) * vNormal`，模型矩阵有缩放时法线方向才不会被拉歪。
漫反射与高光再乘 `(1 - shadow)`，环境光不受遮挡，最终 `resultColor` 再乘纹理色 / 混合后的反射色。

### 4. TODO3：Shadow Map 阴影计算

```glsl
vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;  // 透视除法
projCoords = projCoords * 0.5 + 0.5;                            // [-1,1] → [0,1]
if (projCoords.z > 1.0 || 越界) return 0.0;                      // 光源视角外不算阴影
float closestDepth = texture(depthTexture, projCoords.xy).r;
shadow = (projCoords.z - SHADOW_BIAS > closestDepth) ? 1.0 : 0.0;
```

即：把当前片元投影到光源视角，取深度图里该处最近遮挡物的深度，如果片元比它更远就落在阴影里。
`SHADOW_BIAS = 0.0025` 用来抵消浮点误差造成的自阴影（shadow acne）。

两点经验：深度贴图的精度要 `DEPTH_COMPONENT32F`（16 位在远处会抖动）；
光源的虚拟相机视锥不能太广——框架原来用 155°，1024² 的深度图铺开后每个 texel 覆盖的面积很大，
阴影被糊成一大块，我们把 `fov` 收到 90°、`far` 收到 50 后阴影轮廓才清楚。

### 5. 附加项①：cubeMap 环境反射

```glsl
vec3 incident   = normalize(FragPos - viewPos);
vec3 reflectDir = reflect(incident, norm);                 // 入射方向关于法线反射
vec3 envColor   = texture(cubeSampler, reflectDir).xyz;    // 采样天空盒
float fresnel   = pow(1.0 - max(dot(norm, viewDir), 0.0), 3.0);  // 掠射角反射更强
vec3 albedo     = mix(TextureColor, envColor, clamp(reflectStrength * (0.25 + 0.75 * fresnel), 0.0, 1.0));
```

地板水平、视线越掠射，Fresnel 越大，地面就越像镜子；把 `reflectStrength` 调到 1、相机压低可以看到
木地板里映出天空盒的雪山和云。默认 `reflectStrength = 0.35`，只给物体表面加一层淡淡的环境色。

### 6. 附加项②：指数雾

```glsl
float dist      = length(viewPos - FragPos);
float fogFactor = clamp(exp(-pow(dist * fogDensity, 2.0)), 0.0, 1.0);
resultColor     = mix(fogColor, resultColor, fogFactor);
```

雾色取页面清屏色 `(0.737, 0.745, 0.753)`，所以远处地板会平滑融进天空盒的地平线，看不出地面边界。
`fogDensity = 0.022` 时约 45 个单位外基本全雾；按 `G` 可整开关对比。

### 7. 附加项③：阴影反走样（PCF）

深度图是 1024²，一个 texel 对应地上一小片区域，单点采样时阴影边界会出现阶梯状锯齿
（按 `T` 可以看到）。PCF 用 3×3 邻域取平均：

```glsl
vec2 texelSize = 1.0 / vec2(textureSize(depthTexture, 0));
for (int x = -1; x <= 1; ++x)
  for (int y = -1; y <= 1; ++y) {
      float d = texture(depthTexture, projCoords.xy + vec2(x, y) * texelSize).r;
      if (projCoords.z - SHADOW_BIAS > d) lit += 1.0;
  }
shadow = lit / 9.0;
```

边界上出现 0~1 之间的值，等价于一根半影带，锯齿变成渐变。

### 8. 着色器 uniform 与 JS 变量对应

| JS 变量 / 全局 | 着色器 uniform | 说明 |
|---|---|---|
| `ModelMatrix / ViewMatrix / ProjectionMatrix` | `u_ModelMatrix / u_ViewMatrix / u_ProjectionMatrix` | 顶点着色器 |
| `lightSpaceMatrix` | `u_LightSpaceMatrix` | 顶点着色器，算 `FragPosLightSpace` |
| `lightPosition` | `u_lightPosition` | `w=1` 点光源、`w=0` 平行光 |
| `eyePos` | `viewPos` | 片元着色器算视方向 |
| `ambientStrength / diffuseStrength / specularStrength / materialShininess / lightColor` | 同名 uniform | Phong 模型参数 |
| `cubeTexture / planeTexture` | `diffuseTexture`（单元 0） | 2D 纹理 |
| `depthTexture` | `depthTexture`（单元 1） | 阴影深度图 |
| `cubeMap` | `cubeSampler`（单元 3） | 天空盒采样器 |
| `fogColor / fogDensity / reflectStrength / shadowStrength / pcfOn` | 同名 uniform | 附加项②①与演示开关 |

## 五、关键代码结构

```
hw3Code/
├── Phongshading.html              入口页面：操作提示栏、canvas、两张纹理图片元素
├── Phongshading.js                主程序：初始化、两遍渲染、键盘/鼠标交互、URL 参数
├── Models.js                      几何数据：立方体（含法线与纹理坐标）、地面平面
├── configTexture.js               TODO1：2D 纹理对象、天空盒 cubeMap
├── configMaterialParameters.js    材质/光照参数（Phong 系数、雾、反射、演示开关）
├── Common/                        课程公共库（webgl-utils.js、initShaders2.js、MVnew.js，未修改）
├── shaders/
│   ├── box.vert / box.frag        主程序：MVP + 光空间变换 / Phong 光照 + 纹理 + 阴影 + 反射 + 雾
│   ├── depth.vert / depth.frag    深度 pass：只写深度
│   ├── lamp.vert / lamp.frag      光源小方块
│   └── skybox.vert / skybox.frag  天空盒（gl_Position 取 .xyww，永远在最远处）
├── container.png                  立方体纹理
├── wood.png                       地面木纹纹理
└── skybox/                        六张天空盒贴图
```

`Phongshading.js` 主要函数：

| 函数 | 作用 |
|---|---|
| `window.onload` | 初始化 WebGL/着色器/缓冲区，建 1024² 深度帧缓冲，配置材质与纹理，最后渲染 |
| `initParameters()` | 相机（半径、θ、φ、fov）与光源（类型、距离、θ、φ）的初始值，空格键复位也调它 |
| `render()` | 深度 pass + 主 pass：画立方体、地板、光源、天空盒 |
| `configureTexture / configureCubeMap` | TODO1：2D 纹理与 skybox cubeMap |
| `formViewMatrix / formProjectMatrix` | 球面极坐标算 eye，再 `lookAt`；透视投影 |
| `changeLightPositionAndType()` | 由 `lightRadius/lightPhi/lightTheta` 算光源位置向量 |
| `applyQueryParameters()` | 从 URL 参数设初始状态，便于无头浏览器截图回归 |

## 六、我们在开发中遇到的问题与解决

1. **立方体和地面完全不显示，只有天空盒和光源小方块**
   —— 控制台报 `GL_INVALID_OPERATION: glDrawArrays: Two textures of different types use the same sampler location.`。
   框架把 `cubeSampler` 和 `diffuseTexture` 都放在纹理单元 0，WebGL 2 不允许同一单元既给 `sampler2D` 又给 `samplerCube`，
   于是整个 draw call 被丢弃。把 cubeMap 挪到独立的单元 3（`CUBE_MAP_UNIT`）后正常。

2. **天空盒贴图传到了错误的纹理对象上**
   —— `image.onload` 是异步回调，执行时当前激活单元/绑定已经不是 cubeMap 了，六张图会漏。
   在回调里重新 `gl.activeTexture` + `gl.bindTexture` 再上传。

3. **环境光强度设了却没生效**
   —— 框架 `configMaterialParameters.js` 里 uniform 名字写成 `ambientKaStrength`，而 `box.frag` 声明的是
   `ambientStrength`，`getUniformLocation` 返回 null，`gl.uniform1f(null, …)` 静默失败。改成一致的名字后生效。

4. **阴影糊成一大团、位置也和物体脱开**
   —— 两个原因叠加：一是光源虚拟相机视锥用了 155°，1024² 深度图铺开后每 texel 覆盖面积太大，
   阴影边界被放粗、bias 显得偏大；二是地面平移 -1，而立方体半边长 0.5，立方体其实是"悬空 0.55"的，
   阴影自然和底边对不上。把视锥收到 90°/far=50、地面平移到 -0.45 后阴影就贴住立方体了。

5. **阴影边缘有阶梯状锯齿**
   —— 深度图分辨率与地面像素密度不匹配。用 3×3 PCF 取平均后边界变成半影渐变（附加项③），
   按 `T` 可在硬阴影 / PCF 之间切换对比。

6. **阴影里出现条纹（shadow acne）**
   —— 深度比较时的浮点精度问题。加了固定偏移 `SHADOW_BIAS = 0.0025`，并把深度图精度提高到
   `DEPTH_COMPONENT32F`，条纹消失。

7. **`gl.readBuffer([gl.NONE])` 报 INVALID_ENUM**
   —— `readBuffer` 接受枚举值而不是数组（`drawBuffers` 才需要数组）。改成 `gl.readBuffer(gl.NONE)`。

8. **无头浏览器截图验证**
   —— 键盘/鼠标事件在无头模式下没法真实触发，于是给页面加了 `applyQueryParameters()`：
   `?eyePhi=&eyeRadius=&lightPhi=&lightTheta=&shadow=0&pcf=0&fogDensity=0&reflectStrength=1` 等参数可以直接设定初始状态，
   再用 `chrome --headless=new --enable-unsafe-swiftshader --screenshot` 截不同配置的图逐一对比。
   无头 Chrome 默认没有 GPU，必须加 `--enable-unsafe-swiftshader` 才会跑软件 WebGL。

## 七、说明

- `Common/` 下三个公共库未改；改动集中在 `configTexture.js`、`configMaterialParameters.js`、
  `shaders/box.frag`、`Phongshading.js`（渲染流程与交互）与 `Phongshading.html`（提示栏）。
- 除了题目要求的三处 TODO，还顺手修了框架里的三个小 bug：`ambientKaStrength` 名字、cubeMap 上传时未重新绑定、
  `readBuffer` 传数组。
- URL 调试参数只用于截图/回归验证，正常使用直接用键鼠交互即可。
- 截图与对比图的生成方式：同一页面用不同 URL 参数各截一张，再用 Python(PIL) 统计像素差异，
  确认每个附加项开关都确有可见变化（阴影开/关 22644 像素、反射弱/强 481345 像素、雾开/关 203393 像素、PCF 开/关 890 像素）。

## 八、提交包目录结构

`hw3/submission/HW3.zip` 解压后是一层 `HW3/` 目录：

```
HW3/
├── source/            源码（Phongshading.html、Phongshading.js、Models.js、configTexture.js、configMaterialParameters.js、shaders/）
├── executable/        可执行程序（完整 hw3Code，含 Common/、skybox/ 与两张贴图）+ start-server.bat / .ps1
├── 可执行程序/        与 executable/ 内容相同
├── readme.md          说明文档
└── HW3-报告.docx       实验报告
```

在仓库根目录执行下面的命令即可重新生成提交包：

```powershell
.\tools\build-submission.ps1 -Hw hw3
```
