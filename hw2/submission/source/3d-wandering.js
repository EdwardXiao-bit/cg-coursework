var canvas;
var gl;
var program;

var vBuffer, cBuffer;//顶点属性数组

// 交互可调参数及根据参数生成的三个变换：M,V,P（全局变量）
var modelScale; //物体整体缩放的因子
var theta; // 视点（眼睛）绕Y轴旋转角度，参极坐标θ值，
var phi; // 视点（眼睛）绕X轴旋转角度，参极坐标φ值，
var isOrth; // 投影方式设置参数
var fov; // 透视投影的俯仰角，fov越大视野范围越大
var ModelMatrix; // 模型变换矩阵
var ViewMatrix; // 视图变换矩阵
var ProjectionMatrix; // 投影变换矩阵

// 附加项相关状态（①太阳系 ②虚拟跟踪球 ④可配置消隐）
var currentModel = 'cube';   // 当前显示的模型
var trackballMatrix;         // 附加项②：鼠标拖动累积的旋转矩阵（虚拟跟踪球）
var isCulling = false;       // 附加项④：后向面剔除开关
var isDepthTest = true;      // 附加项④：深度缓存消隐开关
var isAxisVisible = true;    // 附加项④：是否画各天体的自转轴（太阳系模型）
var initialized = false;     // 初始化完成后 resize() 才渲染，避免对空缓冲区渲染产生告警
var animating = false;       // 附加项④：太阳系动画是否在播放
var lastFrameTime = 0;
var dragging = false;
var lastMouseX = 0, lastMouseY = 0;
var viewFromQuery = false;   // 初始视角是否由 URL 参数指定（指定了就不再自动调整）

// shader里的统一变量在本代码里的标识变量
var u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_Flag;//用来区分绘制坐标还是物体，坐标轴不需要进行M变换

/* ***********窗口加载时调用:程序环境初始化程序****************** */
window.onload = function() {
    canvas = document.getElementById("canvas");
    gl = canvas.getContext('webgl2');
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    program = initShaders( gl, "shaders/3d-wandering.vert", "shaders/3d-wandering.frag" );
    gl.useProgram( program );
    
	//调整画布大小为正方形以保证图形长宽比例正确,设置视口viewport大小与画布一致
    resize();
	
	// 开启深度缓存，以正确渲染物体被遮挡部分，3D显示必备
    gl.enable(gl.DEPTH_TEST); 
	// 设置canvas画布背景色 -白色-
    gl.clearColor(1.0, 1.0, 1.0, 1.0); 
	
	// 附加项④：后向面剔除默认关闭，打开时保留逆时针绕序（外表面）为正面
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
	
    // 初始化数据缓冲区，并关联attribute 着色器变量
    vBuffer = gl.createBuffer();//为points存储的缓存
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );  	
    cBuffer = gl.createBuffer();//为colors存储的缓存
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
		
	// 关联uniform着色器变量
    u_ModelMatrix = gl.getUniformLocation(program,"u_ModelMatrix");
    u_ViewMatrix = gl.getUniformLocation( program, "u_ViewMatrix" );
    u_ProjectionMatrix = gl.getUniformLocation( program, "u_ProjectionMatrix" );
    u_Flag = gl.getUniformLocation(program, "u_Flag");

	//初始化交互界面上的相关参数
	initViewingParameters();

	// 附加项②：注册鼠标事件，实现虚拟跟踪球式的任意轴旋转
    canvas.onmousedown = onMouseDown;
    canvas.onmousemove = onMouseMove;
    canvas.onmouseup = onMouseUp;
    canvas.onmouseleave = onMouseUp;
	
	// 支持用 URL 参数指定初始状态，便于自动化截图验证（如 ?model=hat&cull=1&orth=0）
    applyQueryParameters();
	
    // 生成XYZ坐标轴，调用models-data.js中函数//返回points和colors数组 
    vertextsXYZ(); 	
	// 生成立方体模型数据，调用models-data.js中函数//返回points和colors数组 
    generateCube(); 
	
    initialized = true;
    if (currentModel === 'cube') {
        // 发送顶点属性数据points和colors给GPU
        SendData(); 	
        // 调用绘制函数进行渲染
        render(); 
    } else {
        // URL 参数指定了其它模型：重新生成该模型并渲染
        modelChange(currentModel);
    }
}

/* 注册键盘按键事件，修改变换矩阵中的各项参数，并重新进行渲染render */
window.onkeydown = function(e){
    switch (e.keyCode) { 
		case 90:    // Z-物体整体放大
            modelScale *=1.1;
            break;
        case 67:    // C-物体整体缩小
            modelScale *= 0.9;
            break;

        case 87:    // W-视点绕X轴顺时针旋转5度
            phi -= 5;
            break;
        case 83:    // S-视点绕X轴逆时针旋转5度
            phi += 5;
            break;
        case 65:    // A-视点绕Y轴顺时针旋转5度
            theta -= 5;
            break;
        case 68:    // D-视点绕Y轴逆时针旋转5度
            theta += 5;
            break;
                
        case 80:    // P-切换投影方式
            isOrth = !isOrth;
            break;
        case 77:    // M-放大俯仰角，给了一个限制范围
            fov = Math.min(fov + 5, 170);
            break;
        case 78:    // N-较小俯仰角
            fov = Math.max(fov - 5, 5);
            break; 			
			
		case 66:    // B-切换后向面剔除（附加项④）
            isCulling = !isCulling;
            syncToggleUI();
            break;
			
		case 70:    // F-切换深度缓存消隐（附加项④）
            isDepthTest = !isDepthTest;
            syncToggleUI();
            break;

		case 76:    // L-显示/隐藏各天体的自转轴（附加项④）
            isAxisVisible = !isAxisVisible;
            syncToggleUI();
            break;
			
		case 32:    // 空格-复位
            initViewingParameters();
            break;
    }        
    render();//参数变化后需要重新绘制画面
}

/* 绘图界面随窗口交互缩放而相应变化，保持1:1防止图形变形 */
window.onresize = resize;
function resize(){
    var size = Math.min(document.body.clientWidth, document.body.clientHeight);
    canvas.width = size;
    canvas.height = size;
    gl.viewport( 0, 0, canvas.width, canvas.height );
    if (initialized) render(); // 初始化尚未完成时缓冲区为空，跳过这一帧渲染
}


/* ****************************************
*  渲染函数render 
*******************************************/
function render(){    
    // 用背景色清屏（颜色 + 深度都要清，否则相机转动后深度残影会造成错误遮挡）
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	
	// 附加项④：按开关实时启用/关闭后向面剔除与深度缓存
    if (isCulling) { gl.enable(gl.CULL_FACE); } else { gl.disable(gl.CULL_FACE); }
    if (isDepthTest) { gl.enable(gl.DEPTH_TEST); } else { gl.disable(gl.DEPTH_TEST); }
    
    // 构造观察流程中需要的三各变换矩阵
    ModelMatrix=formModelMatrix();//M:模型变换矩阵
    ViewMatrix=formViewMatrix(); //V:视点变换矩阵
    ProjectionMatrix=formProjectMatrix(); //投影变换矩阵
    
    // 传递变换矩阵    
    gl.uniformMatrix4fv( u_ModelMatrix, false, flatten(ModelMatrix) );     
    gl.uniformMatrix4fv( u_ViewMatrix, false, flatten(ViewMatrix) ); 
    gl.uniformMatrix4fv( u_ProjectionMatrix, false, flatten(ProjectionMatrix) ); 
	
    // 标志位设为0，用顶点数据绘制坐标系
    gl.uniform1i( u_Flag, 0 );
    gl.drawArrays( gl.LINES, 0, 6 ); // 绘制X轴，从0开始，读6个点
    gl.drawArrays( gl.LINES, 6, 6 ); // 绘制y轴，从6开始，读6个点
    gl.drawArrays( gl.LINES, 12, 6 ); // 绘制z轴，从12开始，读6个点        

    // 标志位设为1，用顶点数据绘制物体
    gl.uniform1i( u_Flag, 1 );
    if (currentModel === 'solar') {
        // 附加项①④：太阳系是层次模型，每个天体用自己的模型矩阵单独绘制
        drawSolarSystem(ModelMatrix);
    } else {
        gl.uniformMatrix4fv( u_ModelMatrix, false, flatten(ModelMatrix) );
        gl.drawArrays( gl.TRIANGLES, 18, points.length - 18 ); // 绘制物体,都是三角形网格表面
    }
}


/* ****************************************************
* 初始化或复位：需要将交互参数及变换矩阵设置为初始值
********************************************************/
function initViewingParameters(){
	modelScale=1.0;		
    theta = 0;     
	phi = 90;	
    isOrth = true;     
	fov = 120;
	
	ModelMatrix = mat4(); //单位矩阵
    ViewMatrix = mat4();//单位矩阵
    ProjectionMatrix = mat4();//单位矩阵

	// 附加项：复位时清空鼠标拖动的累积旋转，并把消隐开关恢复默认
    trackballMatrix = mat4();
    isCulling = false;
    isDepthTest = true;
    syncToggleUI();
};



/****************************************************************
* 初始及交互菜单选择不同图形后，需要重新发送顶点属性数据给GPU
******************************************************************/
function SendData(){
    var pointsData = flatten(points);
    var colorsData = flatten(colors);

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, pointsData, gl.STATIC_DRAW );
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, colorsData, gl.STATIC_DRAW );
}

/********************************************************
* 交互菜单选择不同图形后，需要重新生成顶点数据并渲染
******************************************************/
function modelChange(model){
    currentModel = model;
    points = [];
    colors = [];
    solarBodies = [];
    switch(model){
        case 'cube':{
            vertextsXYZ();
            generateCube();
            break;
        }
        case 'sphere':{
            vertextsXYZ();
            generateSphere();
            break;
        }
        case 'hat':{
            vertextsXYZ();
            generateHat();
            break;
        }
        case 'solar':{
            // 附加项①④：太阳系（层次建模 + 动画）
            vertextsXYZ();
            generateSolarSystem();
            if (!viewFromQuery) {
                // 切换到太阳系时把相机抬起来一点，默认视角才能看出轨道是空间中的圆
                phi = 45;
                theta = 20;
            }
            break;
        }
    }
    SendData();//重新发送数据
    if (model === 'solar') {
        startSolarAnimation(); // 太阳系需要逐帧更新公转/自转角度
    } else {
        animating = false;
        lastFrameTime = 0;
    }
	render();//重新渲染
}


/* ****************************************************
 * 生成观察流水管线中的 M,V,P矩阵  
********************************************************/
function formModelMatrix(){
//===================TODO2：生成中心物体的模型变换矩阵M============================
/*这里主要添加缩放矩阵 */
//note: modify the `modelMatrix` to the correct value using `modelScale`
// 附加项②：鼠标拖动累积的虚拟跟踪球旋转也并进模型矩阵，
// 即 M = R_trackball · S(modelScale)，这样物体既能被鼠标绕任意轴转动，又保留 Z/C 的缩放。
    var modelMatrix = mult(trackballMatrix, scale(modelScale, modelScale, modelScale));
    return modelMatrix;
}

function formViewMatrix(){
//===================TODO3：生成物体的视点变换矩阵V=======================
/***提示1：观察者（eye）的位置计算***************************************
*观察者（eye）的位置是在绕X和Y轴转动，可以认为是在球面运动，可使用极坐标参数化表示。
*极坐标参数半径radius可直接给定,最好大于1，因为物体坐标MC范围默认在[-1,1]之间。
*极坐标参数theta和phi是交互界面中控制，
*三角函数需要用到Math库，MVnew.js提供的函数radians将三角函数中的角度值转换为弧度值。
************************************************************************/
/***提示2：UP向量的计算**********************************
*通常UP=(0,1,0),但是当相机视线方向n和UP共线时会有问题! 
解决方法：找垂直于观察方向n的某线段作为up向量
*********************************************************/
   
    var radius = 2.0; 
    const at = vec3(0.0,0.0,0.0);
	
	// θ 是绕 Y 轴的方位角，φ 是从 +Y 轴起算的极角。
	// 注意不要把 φ 和 θ 的位置写反：φ=90°、θ=0° 时应得到 eye=(2,0,0)，
	// 写成 (r·sinθ·cosφ, r·cosφ, r·sinθ·sinφ) 会让相机落到 (0,2,0)，与 up 共线导致退化。
    var th = radians(theta);
    var ph = radians(phi);
	var eye = vec3(radius * Math.sin(ph) * Math.cos(th),
	               radius * Math.cos(ph),
	               radius * Math.sin(ph) * Math.sin(th));

	// up 取球面的“纬度切线方向”(-cosφcosθ, sinφ, -cosφsinθ)：
	// 它始终垂直于视线方向，φ→0°/180° 时也不会与视线共线，避免 lookAt 返回退化矩阵（整屏空白）。
    var up = vec3(-Math.cos(ph) * Math.cos(th),
                   Math.sin(ph),
                  -Math.cos(ph) * Math.sin(th));

    return  lookAt(eye, at, up); //提示：lookAt是/common/MVnew.js中的已经写好的函数
};

function formProjectMatrix(){
   //==========TODO4: 生成投影矩阵=======================
	//提示1：可调用common目录下的MVnew.js里ortho(),perspective()函数
    //ortho正交投影需要的参数有left, right, bottom, ytop, near, far
    //perspective透视投影需要的参数有fov, aspect, near, far， 
	//注意1：fov俯仰角是交互控制变化的参数，是全局变量初始值120
	//注意2：因为参数top是js的保留字，所以这里的参数改名为ytop
	//注意3：设置的视见体参数需要考虑将场景中的景物包含进去。
    /*
    const near =;
    const far =;
	const left =; 
    const right =;
    const bottom =;
    const ytop =; // 注意：top是js全局变量，所以这里改名为ytop
	
	const aspect = ; //纵横比设置为1
	
    //note: need to switch projection mode by `isOrth` flag 
    //      and return corresponding projection matrix built by functions in MVnew.js
    //      with params above   return yourProjectionMatrix;
    */
    // 相机在半径 2 的球面上，物体（含附加项的太阳系）坐标范围约 [-1.6, 1.6]，
    // 因此取 near=0.5、far=10 都能把景物完整包含进视见体。
    // MVnew.js 的 perspective 是 OpenGL 式投影（result[3][2] = -1），near/far 必须取正值。
    const near = 0.5;
    const far = 10.0;
	const left = -2.0; 
    const right = 2.0;
    const bottom = -2.0;
    const ytop = 2.0;
	const aspect = 1.0; //纵横比设置为1

    if (isOrth) {
        return ortho(left, right, bottom, ytop, near, far);
    }
    // fov 传角度值，MVnew.js 内部会调用 radians() 转成弧度
    return perspective(fov, aspect, near, far);
}


/* ****************************************************************
 * 附加项②：鼠标拖动实现物体绕任意轴转动（虚拟跟踪球 / 弧球）
 * ****************************************************************/
// 把画布上的二维鼠标位置映射到单位半球上的一点：
// 球内点用球面坐标，球外点压到赤道圆周上，这样拖动不会突然跳变。
function trackballVector(x, y) {
    var size = Math.min(canvas.width, canvas.height);
    var nx = (2.0 * x - size) / size;   // 归一化到 [-1,1]
    var ny = (size - 2.0 * y) / size;   // canvas 的 y 向下，翻转为向上
    var d2 = nx * nx + ny * ny;
    if (d2 <= 1.0) {
        return vec3(nx, ny, Math.sqrt(1.0 - d2));
    }
    var d = Math.sqrt(d2);
    return vec3(nx / d, ny / d, 0.0);
}

function mousePosition(e) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * canvas.width / rect.width,
        y: (e.clientY - rect.top) * canvas.height / rect.height
    };
}

// 当前相机的一组世界坐标基向量：u = 屏幕右、v = 屏幕上、n = 由原点指向相机。
// 与 TODO3 中 lookAt(eye, at, up) 的 n/u/v 保持一致，这样弧球向量才能换到世界坐标。
function viewerBasis() {
    var th = radians(theta), ph = radians(phi);
    var n = vec3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    var up = vec3(-Math.cos(ph) * Math.cos(th), Math.sin(ph), -Math.cos(ph) * Math.sin(th));
    var u = normalize(cross(up, n));
    var v = normalize(cross(n, u));
    return { u: u, v: v, n: n };
}

// 把 (屏幕右, 屏幕上, 指向观察者) 三个分量合成世界坐标向量
function screenToWorld(basis, s) {
    return vec3(
        basis.u[0] * s[0] + basis.v[0] * s[1] + basis.n[0] * s[2],
        basis.u[1] * s[0] + basis.v[1] * s[1] + basis.n[1] * s[2],
        basis.u[2] * s[0] + basis.v[2] * s[1] + basis.n[2] * s[2]
    );
}

function onMouseDown(e) {
    var p = mousePosition(e);
    lastMouseX = p.x;
    lastMouseY = p.y;
    dragging = true;
    e.preventDefault();
}

function onMouseMove(e) {
    if (!dragging) return;
    var p = mousePosition(e);
    var basis = viewerBasis();
    var v0 = trackballVector(lastMouseX, lastMouseY);
    var v1 = trackballVector(p.x, p.y);
    // 半球上的两个点先换到世界坐标，再求旋转轴：屏幕上是左手系，直接用叉积方向会反
    var w0 = screenToWorld(basis, v0);
    var w1 = screenToWorld(basis, v1);
    var axis = cross(w0, w1); // 旋转轴 = 两个球面点的叉积
    var axisLen = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
    if (axisLen > 1e-6) {
        var cosAngle = Math.min(1.0, Math.max(-1.0, dot(w0, w1)));
        var angle = Math.acos(cosAngle) * 180.0 / Math.PI; // 旋转角 = 两点的球面夹角
        // MVnew 的 rotate() 用 R^T（顺时针）约定，取 -angle 才是"抓住的点跟着鼠标走"的方向；
        // 新旋转乘在左边（世界坐标系下旋转），拖动产生的旋转可以不断累积
        trackballMatrix = mult(rotate(-angle, normalize(axis)), trackballMatrix);
    }
    lastMouseX = p.x;
    lastMouseY = p.y;
    render();
}

function onMouseUp() {
    dragging = false;
}


/* ****************************************************************
 * 附加项①④：太阳系的层次建模与动画
 * ****************************************************************/
// 取某个天体的“坐标系”矩阵（不含自身自转与缩放），供子天体继承：
// 父坐标系 → 轨道倾角 → 绕 Y 轴公转角 → 平移到轨道半径处
// 注意：MVnew 的 rotate() 矩阵是标准旋转的转置（顺时针约定，见鼠标跟踪球一节），
// 这里写 -orbitAngle 才等于标准右手系 R_y(+angle)，从 +Y 俯视是逆时针公转（与真实太阳系一致）。
function solarFrame(index) {
    var body = solarBodies[index];
    var parentFrame = (body.parent >= 0) ? solarFrame(body.parent) : mat4();
    return mult(parentFrame,
           mult(rotate(body.tilt, vec3(1.0, 0.0, 0.0)),
           mult(rotate(-body.orbitAngle, vec3(0.0, 1.0, 0.0)),
                translate(body.orbitR, 0.0, 0.0))));
}

// 某个天体最终的模型矩阵：坐标系 → 自转 → 缩放到天体半径
function solarModelMatrix(index) {
    var body = solarBodies[index];
    return mult(solarFrame(index),
           mult(rotate(body.spinAngle, vec3(0.0, 1.0, 0.0)),
                scale(body.radius, body.radius, body.radius)));
}

// 某个天体公转轨道的模型矩阵：父坐标系 → 轨道倾角（不含公转角，因为整条轨道线是固定的）
function solarOrbitMatrix(index) {
    var body = solarBodies[index];
    var parentFrame = (body.parent >= 0) ? solarFrame(body.parent) : mat4();
    return mult(parentFrame, rotate(body.tilt, vec3(1.0, 0.0, 0.0)));
}

// 逐个天体绘制：每次都要重新上传它自己的模型矩阵（这就是层次建模的体现）
function drawSolarSystem(baseMatrix) {
    // 先画轨道线，再画天体，这样天体球体会遮住穿过它的轨道线
    for (var i = 0; i < solarBodies.length; i++) {
        var orbitBody = solarBodies[i];
        if (orbitBody.orbitCount > 0) {
            var om = mult(baseMatrix, solarOrbitMatrix(i));
            gl.uniformMatrix4fv(u_ModelMatrix, false, flatten(om));
            gl.drawArrays(gl.LINES, orbitBody.orbitStart, orbitBody.orbitCount);
        }
    }
    for (var i = 0; i < solarBodies.length; i++) {
        var body = solarBodies[i];
        var m = mult(baseMatrix, solarModelMatrix(i));
        gl.uniformMatrix4fv(u_ModelMatrix, false, flatten(m));
        gl.drawArrays(gl.TRIANGLES, body.start, body.count);
    }
    // 最后画自转轴：轴用 LINES 画，长度是半径的 1.7 倍，球体内部那一段被深度缓存挡住，
    // 只露出两极外侧，正好能看出自转轴的方向（倾斜 23.5° 的地球、几乎竖直的水星对比明显）
    if (isAxisVisible) {
        gl.lineWidth(2.0);
        for (var j = 0; j < solarBodies.length; j++) {
            var axisBody = solarBodies[j];
            if (axisBody.axisCount <= 0) continue;
            var am = mult(baseMatrix, solarModelMatrix(j));
            gl.uniformMatrix4fv(u_ModelMatrix, false, flatten(am));
            gl.drawArrays(gl.LINES, axisBody.axisStart, axisBody.axisCount);
        }
        gl.lineWidth(1.0);
    }
}

// 附加项④：逐帧更新公转、自转角度，形成动画
function startSolarAnimation() {
    if (animating) return;
    animating = true;
    lastFrameTime = 0;
    requestAnimationFrame(solarAnimate);
}

function solarAnimate(t) {
    if (!animating || currentModel !== 'solar') {
        animating = false;
        return;
    }
    if (!lastFrameTime) lastFrameTime = t;
    var dt = Math.min((t - lastFrameTime) / 1000.0, 0.1); // 限幅：切回标签页时动画不跳变
    lastFrameTime = t;
    for (var i = 0; i < solarBodies.length; i++) {
        var body = solarBodies[i];
        if (body.parent >= 0) {
            body.orbitAngle += body.orbitSpeed * dt; // 只有绕太阳/行星公转的天体才更新公转角
        }
        body.spinAngle += body.spinSpeed * dt;
    }
    render();
    requestAnimationFrame(solarAnimate);
}


/* ****************************************************************
 * 界面状态同步 & URL 参数（便于自动化截图验证）
 * ****************************************************************/
function syncToggleUI() {
    var cull = document.getElementById('cullCheckbox');
    var depth = document.getElementById('depthCheckbox');
    var axis = document.getElementById('axisCheckbox');
    if (cull) cull.checked = isCulling;
    if (depth) depth.checked = isDepthTest;
    if (axis) axis.checked = isAxisVisible;
}

function applyQueryParameters() {
    var query = {};
    var search = window.location.search.replace(/^\?/, '');
    if (search) {
        var pairs = search.split('&');
        for (var i = 0; i < pairs.length; i++) {
            var kv = pairs[i].split('=');
            query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        }
    }
    if (query.model) currentModel = query.model;
    if (query.orth === '0') isOrth = false;
    if (query.cull === '1') isCulling = true;
    if (query.depth === '0') isDepthTest = false;
    if (query.axes === '0') isAxisVisible = false;
    if (query.scale) modelScale = parseFloat(query.scale);
    if (query.theta) theta = parseFloat(query.theta);
    if (query.phi) phi = parseFloat(query.phi);
    if (query.fov) fov = parseFloat(query.fov);
    viewFromQuery = (query.theta !== undefined || query.phi !== undefined);

    var select = document.getElementById('modelSelect');
    if (select) select.value = currentModel;
    syncToggleUI();
}
