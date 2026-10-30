var points = []; //顶点的属性：坐标数组
var colors = []; //顶点的属性：颜色数组

const VertexColors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 0.0, 0.5, 0.0, 1.0 ),  // light-green        
    vec4( 0.0, 0.0, 0.5, 1.0 ),  // light-blue
    vec4( 0.5, 0.0, 0.0, 1.0 ),  // light-red
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.5, 0.5, 0.5, 1.0 )   // grey
];// 常量颜色

/****************************************************
 * 坐标轴模型：X轴，Y轴，Z轴的顶点位置和颜色,(-1,1)范围内定义 
 ****************************************************/
function vertextsXYZ()
{
    const len = 0.9;
    var XYZaxis = [
        vec4(-len,  0.0,  0.0, 1.0), // X
        vec4( len,  0.0,  0.0, 1.0),
        vec4( len, 0.0, 0.0, 1.0),
        vec4(len-0.01, 0.01, 0.0, 1.0),
        vec4(len, 0.0, 0.0, 1.0),
        vec4(len-0.01, -0.01, 0.0, 1.0),
        
        vec4( 0.0, -len,  0.0, 1.0), // Y
        vec4( 0.0,  len,  0.0, 1.0),
        vec4( 0.0, len,0.0, 1.0),
        vec4(0.01, len-0.01, 0.0, 1.0),
        vec4(0.0, len, 0.0, 1.0),
        vec4(-0.01, len-0.01, 0.0, 1.0),
        
        vec4( 0.0,  0.0, -len, 1.0), // Z
        vec4( 0.0,  0.0,  len, 1.0),
        vec4( 0.0, 0.0, len, 1.0),
        vec4( 0.01, 0.0,  len-0.01, 1.0),
        vec4( 0.0, 0.0, len, 1.0),
        vec4( -0.01,0.0,  len-0.01, 1.0)
    ];
    
    var XYZColors = [
        vec4(1.0, 0.0, 0.0, 1.0),  // red
        vec4(0.0, 1.0, 0.0, 1.0),  // green
        vec4(0.0, 0.0, 1.0, 1.0),  // blue
    ];
    
    for (var i = 0; i < XYZaxis.length; i++){    
        points.push(XYZaxis[i]);
        var j = Math.trunc(i/6); // JS取整运算Math.trunc//每个方向轴用6个顶点
        colors.push(XYZColors[j]);
    }
}

/****************************************************
 * 立方体模型生成
 ****************************************************/
function generateCube()
{
    quad( 1, 0, 3, 2 ); //Z正-前
    quad( 4, 5, 6, 7 ); //Z负-后
    
    quad( 2, 3, 7, 6 ); //X正-右
    quad( 5, 4, 0, 1 ); //X负-左
    
    quad( 6, 5, 1, 2 ); //Y正-上
    quad( 3, 0, 4, 7 ); //Y负-下
} 

function quad(a, b, c, d) 
{
	const vertexMC = 0.5; // 顶点分量X,Y,Z到原点距离
    var vertices = [
        vec4( -vertexMC, -vertexMC,  vertexMC, 1.0 ), //Z正前面左下角点V0，顺时针四点0~3
        vec4( -vertexMC,  vertexMC,  vertexMC, 1.0 ),
        vec4(  vertexMC,  vertexMC,  vertexMC, 1.0 ),
        vec4(  vertexMC, -vertexMC,  vertexMC, 1.0 ),
        vec4( -vertexMC, -vertexMC, -vertexMC, 1.0 ),   //Z负后面左下角点V4，顺时针四点4~7
        vec4( -vertexMC,  vertexMC, -vertexMC, 1.0 ),
        vec4(  vertexMC,  vertexMC, -vertexMC, 1.0 ),
        vec4(  vertexMC, -vertexMC, -vertexMC, 1.0 )
    ];

    var indices = [ a, b, c, a, c, d ];
    for ( var i = 0; i < indices.length; ++i ) {
        points.push(vertices[indices[i]]);  // 保存一个顶点坐标到定点给数组vertices中        
        colors.push(VertexColors[a]); // 立方体每面为单色
    }
}

/****************************************************
 * 球体模型生成：由四面体递归生成
 ****************************************************/
function generateSphere(){
    // 细分次数和顶点
    const numTimesToSubdivide = 5; // 球体细分次数
    var va = vec4(0.0, 0.0, -1.0, 1.0);
    var vb = vec4(0.0, 0.942809, 0.333333, 1.0);
    var vc = vec4(-0.816497, -0.471405, 0.333333, 1.0);
    var vd = vec4(0.816497, -0.471405, 0.333333, 1.0);
    
    function triangle(a, b, c) {
        // 注意顶点顺序为 a, c, b：本框架里基准四面体三角形的原始顺序使法线朝向球心（即外表面是顺时针），
        // 这里翻转成 a,c,b 让球的外表面为逆时针(CCW)，打开“后向面剔除”时才能正确保留外表面
        points.push(a);
        points.push(c);
        points.push(b);

        colors.push(vec4(0.0, 1.0, 1.0, 1.0));
        colors.push(vec4(0.0, 1.0, 0.0, 1.0));
        colors.push(vec4(1.0, 0.0, 1.0, 1.0));
    };

    function divideTriangle(a, b, c, count) {
        if ( count > 0 ) {
            var ab = mix( a, b, 0.5);
            var ac = mix( a, c, 0.5);
            var bc = mix( b, c, 0.5);

            ab = normalize(ab, true);
            ac = normalize(ac, true);
            bc = normalize(bc, true);

            divideTriangle(  a, ab, ac, count - 1 );
            divideTriangle( ab,  b, bc, count - 1 );
            divideTriangle( bc,  c, ac, count - 1 );
            divideTriangle( ab, bc, ac, count - 1 );
        }
        else {
            triangle( a, b, c );
        }
    }

    function tetrahedron(a, b, c, d, n) {
        divideTriangle(a, b, c, n);
        divideTriangle(d, c, b, n);
        divideTriangle(a, d, b, n);
        divideTriangle(a, c, d, n);
    };

    tetrahedron(va, vb, vc, vd, numTimesToSubdivide); // 递归细分生成球体
}

/****************************************************
* TODO1: 墨西哥帽模型生成，等距细分得z,x，函数计算得到y
****************************************************/
function generateHat()
{
    
    // 这里(x,z)是区域（-1，-1）到（1，1）平均划分成nRows*nColumns得到的交点坐标；
    var nRows = 11; // 线数，实际格数=nRows-1,
    var nColumns = 11; // 线数,实际格数=nColumns-1

    // 嵌套数组data用于存储网格上交叉点的高值(y)值。
    var data = new Array(nRows);
    for(var i = 0; i < nRows; i++) {
        data[i] = new Array(nColumns);
    };
    
    // 遍历网格上每个点，求点的高度(即Y值)。
    // 墨西哥帽函数是 y = sin(rData)/rData（rData 为数据域半径，rData=0 时取极限 1）。
    // 位置域 [-1,1] 按 hat.js 的写法放大到数据域 [-2π,2π]，即 rData = 2π·rPos：
    // 这样零点正好落在位置域半径 rPos = 0.5、1.0 处，得到"中央峰 + 四周一圈帽檐"的经典形状；
    // 若直接用 rPos 当 rData，[-1,1] 内走不到零点，只会得到一个圆鼓包。
    for(var i = 0; i < nRows; i++) {
        for(var j = 0; j < nColumns; j++) {
            var xPos = 2.0 * i / nRows - 1.0;    // 位置域坐标 x ∈ [-1, 1)
            var zPos = 2.0 * j / nColumns - 1.0; // 位置域坐标 z ∈ [-1, 1)
            var xData = xPos * 2.0 * Math.PI;    // 数据域坐标
            var zData = zPos * 2.0 * Math.PI;
            var rData = Math.sqrt(xData * xData + zData * zData);
            data[i][j] = rData ? Math.sin(rData) / rData : 1.0;
        }
    }

    // 按高度取颜色：谷底偏蓝、峰顶偏红，便于观察帽子的起伏
    function hatColor(y) {
        var t = Math.min(Math.max((y + 0.2172) / 1.2172, 0.0), 1.0); // y ∈ [-0.2172, 1] → t ∈ [0,1]
        return vec4(0.15 + 0.8 * t, 0.35 - 0.1 * t, 0.95 - 0.85 * t, 1.0);
    }

    // 顶点数据按每四个片元构成一个四边形网格图元，存放顶点属性用points.push(),colors.push()
    // 每个格子 (i,j) 拆成两个三角形、共 6 个顶点；顶点顺序保证从 +Y 方向看是逆时针，
    // 这样打开"后向面剔除"时帽子顶面不会被误剔掉。
    function pushHatVertex(x, y, z) {
        points.push(vec4(x, y, z, 1.0));
        colors.push(hatColor(y));
    }

    for(var i = 0; i < nRows - 1; i++) {
        for(var j = 0; j < nColumns - 1; j++) {
            var x0 = 2.0 * i / nRows - 1.0;
            var x1 = 2.0 * (i + 1) / nRows - 1.0;
            var z0 = 2.0 * j / nColumns - 1.0;
            var z1 = 2.0 * (j + 1) / nColumns - 1.0;

            var y00 = data[i][j];
            var y01 = data[i][j + 1];
            var y10 = data[i + 1][j];
            var y11 = data[i + 1][j + 1];

            // 三角形 1：(i,j) → (i,j+1) → (i+1,j+1)
            pushHatVertex(x0, y00, z0);
            pushHatVertex(x0, y01, z1);
            pushHatVertex(x1, y11, z1);

            // 三角形 2：(i,j) → (i+1,j+1) → (i+1,j)
            pushHatVertex(x0, y00, z0);
            pushHatVertex(x1, y11, z1);
            pushHatVertex(x1, y10, z0);
        }
    }
}


/* ****************************************************************
 * 附加项①④：太阳系（层次建模 + 复杂模型 + 动画）
 * ****************************************************************/
var solarBodies = []; // 每个天体在 points/colors 中的绘制区间，以及它的运动/层次参数

// 把 [x,y,z] 顶点连同颜色一起 push 进全局 points/colors 数组
function pushSphereVertex(p, color) {
    points.push(vec4(p[0], p[1], p[2], 1.0));
    colors.push(color);
}

// 把两个单位球面点连线取中点后再归一化回单位球面，保证细分后的所有顶点都在球面上
function unitMidpoint(p, q) {
    var x = (p[0] + q[0]) * 0.5;
    var y = (p[1] + q[1]) * 0.5;
    var z = (p[2] + q[2]) * 0.5;
    var len = Math.sqrt(x * x + y * y + z * z);
    return [x / len, y / len, z / len];
}

/****************************************************
 * 单位球：从正四面体出发递归细分 subdiv 次
 * color 既可以是固定的 vec4，也可以是函数 dir → vec4：后者按顶点方向算颜色，
 * 行星表面的纬度带、经度条纹、斑点就靠它画出来，自转时花纹跟着转，才看得出在转。
 * 返回该球体在 points 数组中的 [start, count] 区间，
 * 这样多个球体可以共用同一个缓冲区，绘制时按区间分别上传模型矩阵
 ****************************************************/
function pushUnitSphere(subdiv, color) {
    var start = points.length;
    var v = [
        [0.0, 0.0, -1.0],
        [0.0, 0.942809, 0.333333],
        [-0.816497, -0.471405, 0.333333],
        [0.816497, -0.471405, 0.333333]
    ];
    var tris = [[v[0], v[1], v[2]], [v[0], v[2], v[3]], [v[0], v[3], v[1]], [v[1], v[3], v[2]]];

    for (var s = 0; s < subdiv; s++) {
        var next = [];
        for (var t = 0; t < tris.length; t++) {
            var a = tris[t][0], b = tris[t][1], c = tris[t][2];
            var ab = unitMidpoint(a, b);
            var ac = unitMidpoint(a, c);
            var bc = unitMidpoint(b, c);
            next.push([a, ab, ac]);
            next.push([ab, b, bc]);
            next.push([ac, bc, c]);
            next.push([ab, bc, ac]);
        }
        tris = next;
    }

    // 固定颜色时包一层函数，后面统一按方向取色
    var colorAt = (typeof color === 'function') ? color : function () { return color; };

    for (var t = 0; t < tris.length; t++) {
        var p0 = tris[t][0], p1 = tris[t][2], p2 = tris[t][1];
        // 顶点顺序取 a,c,b：翻转基准四面体三角形的朝向，使球的外表面为逆时针(CCW)，
        // 打开“后向面剔除”时才保留外表面而剔除背面
        pushSphereVertex(p0, colorAt(p0));
        pushSphereVertex(p1, colorAt(p1));
        pushSphereVertex(p2, colorAt(p2));
    }
    return { start: start, count: points.length - start };
}

// 颜色分量限幅到 [0,1]，避免明暗调制后溢出
function clampColor(c) {
    return vec4(Math.min(Math.max(c[0], 0.0), 1.0),
                Math.min(Math.max(c[1], 0.0), 1.0),
                Math.min(Math.max(c[2], 0.0), 1.0),
                1.0);
}

/****************************************************
 * 行星表面着色：输入是单位球上的方向 (x, y, z)，输出这个顶点的颜色。
 *   bandAmp/bandFreq    —— 纬度方向的明暗带（木星条纹、金星云带）
 *   stripeAmp/stripeFreq—— 经度方向的分块明暗，让“转没转”一眼能看出来
 *   land/landCos        —— 以若干方向为中心的地块（地球陆地、火星暗区）
 *   spotDir/spotCos     —— 单个斑点（木星大红斑、太阳黑子）
 *   poleCap/poleColor   —— 南北极冠
 * 这些只是明暗与换色，不改变几何，顶点数不变。
 ****************************************************/
function planetColor(dir, cfg) {
    var lat = dir[1];
    var lon = Math.atan2(dir[2], dir[0]);
    var r = cfg.base[0], g = cfg.base[1], b = cfg.base[2];

    var shade = 1.0;
    if (cfg.bandAmp) shade += cfg.bandAmp * Math.sin(cfg.bandFreq * Math.PI * lat);
    if (cfg.stripeAmp) shade += cfg.stripeAmp * Math.sin(cfg.stripeFreq * lon);
    r *= shade; g *= shade; b *= shade;

    if (cfg.land && cfg.landCos) {
        for (var i = 0; i < cfg.land.length; i++) {
            var c = cfg.land[i];
            if (dir[0] * c[0] + dir[1] * c[1] + dir[2] * c[2] > cfg.landCos) {
                r = cfg.landColor[0]; g = cfg.landColor[1]; b = cfg.landColor[2];
                break;
            }
        }
    }
    if (cfg.spotDir) {
        var s = cfg.spotDir;
        if (dir[0] * s[0] + dir[1] * s[1] + dir[2] * s[2] > cfg.spotCos) {
            r = cfg.spotColor[0]; g = cfg.spotColor[1]; b = cfg.spotColor[2];
        }
    }
    if (cfg.poleCap && Math.abs(lat) > cfg.poleCap) {
        r = cfg.poleColor[0]; g = cfg.poleColor[1]; b = cfg.poleColor[2];
    }
    return clampColor([r, g, b]);
}

// 自转轴：局部坐标里沿 Y 轴的一条线段。太阳系里所有天体都绕自身 Y 轴自转，
// 这条线就是自转轴；轴的倾斜由坐标系里的 tilt 决定，所以画在模型矩阵里会自动跟着倾斜。
// halfLength 是单位球坐标下的半长，绘制时会随天体半径一起缩放。
function pushSpinAxis(halfLength, color) {
    var start = points.length;
    points.push(vec4(0.0, -halfLength, 0.0, 1.0));
    points.push(vec4(0.0,  halfLength, 0.0, 1.0));
    colors.push(color);
    colors.push(color);
    return { start: start, count: 2 };
}

// 行星轨道线：半径 orbitR 的圆（XZ 平面），用 LINES 画，仅作视觉参考
function pushOrbitCircle(orbitR, segments) {
    var start = points.length;
    var orbitColor = vec4(0.70, 0.70, 0.70, 1.0);
    for (var s = 0; s < segments; s++) {
        var t0 = 2.0 * Math.PI * s / segments;
        var t1 = 2.0 * Math.PI * (s + 1) / segments;
        points.push(vec4(orbitR * Math.cos(t0), 0.0, orbitR * Math.sin(t0), 1.0));
        points.push(vec4(orbitR * Math.cos(t1), 0.0, orbitR * Math.sin(t1), 1.0));
        colors.push(orbitColor);
        colors.push(orbitColor);
    }
    return { start: start, count: points.length - start };
}

// 增加一个天体：细分次数、半径、轨道半径、父天体索引（-1表示绕太阳）、
// 公转角速度、自转角速度（度/秒）、轨道倾角、表面配置 surface（底色、花纹、自转轴外观）
function addSolarBody(name, subdiv, radius, orbitR, parent, orbitSpeed, spinSpeed, tilt, surface) {
    var range = pushUnitSphere(subdiv, function (dir) { return planetColor(dir, surface); });
    var axisColor = surface.axisColor ? clampColor(surface.axisColor) : vec4(0.0, 0.62, 0.95, 1.0);
    var axis = pushSpinAxis(surface.axisLength || 2.3, axisColor);
    var orbit = { start: -1, count: 0 };
    if (parent >= 0) {
        orbit = pushOrbitCircle(orbitR, 96); // 有父天体才有公转轨道线
    }
    solarBodies.push({
        name: name,
        radius: radius,
        orbitR: orbitR,
        parent: parent,
        orbitSpeed: orbitSpeed,
        spinSpeed: spinSpeed,
        tilt: tilt,
        surface: surface,
        start: range.start,
        count: range.count,
        axisStart: axis.start,
        axisCount: axis.count,
        orbitStart: orbit.start,
        orbitCount: orbit.count,
        orbitAngle: solarBodies.length * 47.0, // 初始相位错开，避免所有行星排在一条直线上
        spinAngle: 0.0
    });
    return solarBodies.length - 1;
}

/****************************************************
 * 太阳系：太阳 + 6 颗行星 + 1 颗卫星(月球)，月球是地球的子天体，
 * 体现层次建模：月球的坐标依赖地球的坐标系（地球公转到哪，月球跟到哪）
 * 每个天体的 surface 决定它表面的花纹：纬度带 + 经度条纹保证自转看得出来，
 * spot/land 给木星画大红斑、给地球画大陆、给水星和月球画暗区。
 ****************************************************/
function generateSolarSystem() {
    solarBodies = [];
    addSolarBody('太阳', 4, 0.220, 0.00, -1,   0.0,  25.0,  0.0, {
        base: [1.00, 0.82, 0.16], bandAmp: 0.05, bandFreq: 12, stripeAmp: 0.05, stripeFreq: 6,
        spotDir: [0.55, -0.35, 0.76], spotCos: 0.94, spotColor: [0.90, 0.42, 0.08],
        axisColor: [0.55, 0.25, 0.02], axisLength: 2.0
    });
    addSolarBody('水星', 3, 0.045, 0.42, 0,   62.0,   0.0,  0.0, {
        base: [0.72, 0.68, 0.62], bandAmp: 0.04, bandFreq: 8, stripeAmp: 0.09, stripeFreq: 3,
        land: [[0.60, 0.30, 0.74], [-0.55, -0.20, 0.81], [0.10, 0.70, -0.70]],
        landCos: 0.86, landColor: [0.46, 0.43, 0.40]
    });
    addSolarBody('金星', 3, 0.075, 0.60, 0,   45.0,   0.0,  3.0, {
        base: [0.95, 0.78, 0.45], bandAmp: 0.09, bandFreq: 5, stripeAmp: 0.10, stripeFreq: 4,
        axisColor: [0.85, 0.55, 0.10]
    });
    var earth = addSolarBody('地球', 3, 0.085, 0.82, 0, 34.0, 120.0, 23.5, {
        base: [0.14, 0.36, 0.80], bandAmp: 0.04, bandFreq: 3, stripeAmp: 0.03, stripeFreq: 2,
        land: [[0.45, 0.45, 0.77], [-0.60, 0.10, 0.79], [0.10, -0.35, 0.93],
               [-0.20, 0.75, 0.63], [0.85, 0.15, -0.50], [-0.30, -0.80, 0.51]],
        landCos: 0.78, landColor: [0.22, 0.52, 0.25],
        poleCap: 0.90, poleColor: [0.92, 0.96, 1.00],
        axisColor: [0.00, 0.55, 0.95]
    });
    addSolarBody('月球', 2, 0.030, 0.17, earth, 240.0,  0.0,  5.0, {
        base: [0.80, 0.80, 0.82], bandAmp: 0.04, bandFreq: 6, stripeAmp: 0.05, stripeFreq: 3,
        land: [[0.30, -0.50, 0.81], [-0.75, -0.20, 0.63], [0.20, 0.75, 0.63]],
        landCos: 0.82, landColor: [0.55, 0.55, 0.60]
    });
    addSolarBody('火星', 3, 0.060, 1.05, 0,   24.0,   0.0,  1.8, {
        base: [0.86, 0.42, 0.24], bandAmp: 0.05, bandFreq: 5, stripeAmp: 0.05, stripeFreq: 3,
        land: [[-0.40, 0.20, 0.89], [0.50, -0.30, 0.81]],
        landCos: 0.84, landColor: [0.58, 0.26, 0.15],
        poleCap: 0.92, poleColor: [0.95, 0.93, 0.90],
        axisColor: [0.85, 0.25, 0.10]
    });
    addSolarBody('木星', 3, 0.150, 1.30, 0,   15.0,  80.0,  1.3, {
        base: [0.87, 0.72, 0.53], bandAmp: 0.16, bandFreq: 9, stripeAmp: 0.04, stripeFreq: 3,
        stripeAmp: 0.05, stripeFreq: 3,
        spotDir: [0.60, 0.50, 0.62], spotCos: 0.88, spotColor: [0.76, 0.28, 0.18],
        axisColor: [0.70, 0.45, 0.15]
    });
}




