"use strict";

var canvas;
var gl;
var program;

var points = []; //保存“点，线，面”基本图元所需要的顶点属性数据，每个顶点是矢量数据
var bufferId;  //顶点属性缓冲区，用于传递数据给GPU

//附加项②：分形（Sierpinski三角垫片）的基准三角形
//顶点用相对于图形中心的NDC坐标表示，实际绘制位置由着色器加上centerX/centerY得到
var baseTriangle = [
	vec2(  0.35,  0.35 ),   // 顶点
	vec2( -0.35, -0.35 ),   // 左下
	vec2(  0.35, -0.35 )    // 右下
];

//递归次数（=slider的值），以及"需要重建几何体"的标志
var depth = 0;
var depthMax = 7;
var depthChangedFlag = true;
var depthSlider;   //slider的DOM对象
var depthValue;    //显示当前递归次数的span

//初始化绘制的矩形中心的NDC坐标，填充的随机色
var centerX=0.0; 
var centerY=0.0; 
var colorRandom=vec4(1.0,0.0,0.0,1.0);

//鼠标点击画布时，图形的中心发生变化时，设置此标志便于重新传递中心（centerX，centerY）
var centerChageFlag=false;  

//初始化函数init，相当于JS中执行的开始的地方，相当于main()
window.onload = function init()
{
	//加载webGL到画布对象中
	canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert( "WebGL 2.0 isn't available" );

    //加载顶点着色器和片元着色器
    program = initShaders(gl, "shaders/hw1.vert", "shaders/hw1.frag");
    gl.useProgram(program);

    //初始化：“画布Canvas”的大小
    canvas.width = window.innerWidth; //document.body.clientWidth;   
    canvas.height = window.innerHeight; //document.body.clientHeight;	

    //初始化："视口viewport"在“画布canvas”中的位置和大小，一般和画布等大小。
    gl.viewport( 0, 0, canvas.width, canvas.height );

	//初始化：设置背景色，即设置画布canvas的默认填充颜色
    gl.clearColor( 0.5, 0.5, 0.5, 1.0 );

	

    // 附加项②：按当前递归次数depth生成分形（Sierpinski三角垫片）的三角形顶点数组points
	// 注意：必须在下面创建VBO之后再调用，因为它内部要用bufferData把顶点数据传给VBO


	/*******************************************************************************
	*   TODO1: ---将顶点属性缓冲对象数据VBO 传给vertex shader,补全下面//后的代码
	*******************************************************************************/
	/*创建顶点缓冲区bufferId；让gl绑定该缓冲区*/
    bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );	
	
	/*将points中的矢量顶点数据扁平化化放入缓存（用./Common/MVnew.js中的flattern()转换为浮点数)*/
	//此处不需要再写bufferData：initFractalGeometry()内部已经把points上传到VBO了
	initFractalGeometry();

	/*将缓冲区的顶点属性数据和program的shader中的属性变量aPosition进行关联*/
    /* gl.vertexAttribPointer(index, size, type, normalized, stride, pointer)*/
    let vPosition = gl.getAttribLocation( program, "aPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
	
	//--将全局变量传给向相应的shader--
	gl.uniform1f(gl.getUniformLocation( program, "centerX" ), centerX);
	gl.uniform1f(gl.getUniformLocation( program, "centerY" ), centerY);
	gl.uniform4fv(gl.getUniformLocation( program, "randomColor" ),colorRandom);	
	

	//附加项②：装配递归次数slider（max取自depthMax，避免两处硬编码不一致）
	depthSlider = document.getElementById("depth-slider");
	depthValue  = document.getElementById("depth-value");
	if ( depthSlider ) {
		depthSlider.max = depthMax;
		depthSlider.value = depth;
		depthSlider.addEventListener("input", onDepthSliderChange);
	} else {
		alert("没有找到 id=depth-slider 的元素：请确认hw1.html是最新版（含<div id=\"ui\">控制面板）并强制刷新缓存");
	}

	//窗口加载时，以NDC坐标（0，0）为中心绘制分形，颜色也随机取一个
	colorRandom = vec4( Math.random(), Math.random(), Math.random(), 1.0 );
	render();
};

function triangle( a, b, c )
{
    points.push( a, b, c );	
};

function retangle(a,b,c,d)
{
	triangle(a,b,c);
	triangle(a,c,d);
}


//--------------------------------------------------------------------------------
// 附加项②：分形图（Sierpinski三角垫片）+ slider控制递归次数
//--------------------------------------------------------------------------------

//取两点中点（vec2是普通数组，故可这样分量运算）
function midPoint( a, b )
{
	return vec2( (a[0]+b[0])*0.5, (a[1]+b[1])*0.5 );
}

//递归把三角形细分：连接三边中点，得到3个与原三角形相似（面积1/4）的小三角形
//depth为0时不再细分，把当前三角形作为最终图元压入points
function divideTriangle( a, b, c, n )
{
	if ( n === 0 ) {
		triangle( a, b, c );
		return;
	}
	let ab = midPoint( a, b );
	let bc = midPoint( b, c );
	let ca = midPoint( c, a );
	divideTriangle( a, ab, ca, n-1 );
	divideTriangle( ab, b, bc, n-1 );
	divideTriangle( ca, bc, c, n-1 );
}

//根据当前depth重建几何体：重新生成points，并把数据重新上传给已有的VBO
function initFractalGeometry()
{
	points = [];   //每次重建都要清空，否则旧三角形会残留
	divideTriangle( baseTriangle[0], baseTriangle[1], baseTriangle[2], depth );

	//VBO已在init()中创建，这里只需重新绑定并把新数据传上去
	gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

	//递归次数的显示值同步更新
	if ( depthValue ) depthValue.innerHTML = depth;
}

//slider滑动事件：改变递归次数后重建几何体并重绘
function onDepthSliderChange()
{
	depth = parseInt( depthSlider.value );
	depthChangedFlag = true;   //通知render()重建几何体
	render();
}


//当窗口发生变化时，画布大小随着改变，并且视口viewport也随之改变，且重新绘制场景
window.onresize = function() {
	canvas.width=window.innerWidth;
	canvas.height=window.innerHeight;
	gl.viewport(0, 0, canvas.width, canvas.height);
	//如果想快速调试看变量值，可采用下面两种方式
	//alert("canvas.width="+canvas.width+" canvas.height="+canvas.height);
	//console.log("canvas.width="+canvas.width+" canvas.height="+canvas.height);
	render();
 };


document.addEventListener('DOMContentLoaded', function() {
		//需要获取文档中的canvas对象后，才能为其添加事件监听程序
	    canvas = document.getElementById('gl-canvas');
		
		/*******************************************************************************
		*   TODO2: 为画布canvas添加鼠标mousedown事件，
		*          获得屏幕点击位置的屏幕像素坐标，将其转换为将要绘制的图形的新中心NDC坐标	 
		*          传递新中心，并重新绘制。补全下面//注释掉的代码
		*******************************************************************************/
		canvas.addEventListener("mousedown", function(event){
			//获取画布点击位置，返回画布像素整数坐标
			let rect = event.target.getBoundingClientRect();
			let x = event.clientX - rect.left;
			let y = event.clientY - rect.top;
			
			// 将画布屏幕坐标转换为NDC坐标
			//屏幕坐标原点在左上角、y轴向下；NDC原点在画布中心、y轴向上，故y要翻转
			let ndcX = ( x / canvas.width ) * 2.0 - 1.0;
			let ndcY = 1.0 - ( y / canvas.height ) * 2.0;
			
			//交互绘制图形中心发生变化，设置标志为true 且重新绘制render()
			centerChageFlag = true;
			centerX = ndcX;
			centerY = ndcY;
			//每次点击都换一个新的随机色
			colorRandom = vec4( Math.random(), Math.random(), Math.random(), 1.0 );
			render();

		});

});
 
function render()
{
	//清屏，即用前面gl.clearColor()设置的背景色进行填充
    gl.clear(gl.COLOR_BUFFER_BIT);	

	/******************************************************************
	TODO3: 如果有鼠标点击事件发生，即若centerchageflag=true
	      需要传递uniform变量新值给着色器，变量是：centerX, centerY,colorRandom
		  并且处理完后，将标志设置为false。自己补全if语句中应有的代码。
	******************************************************************/
	if(centerChageFlag)
	{
		//注意：uniform变量名以着色器中的声明为准，片元着色器中是randomColor
		gl.uniform1f(gl.getUniformLocation( program, "centerX" ), centerX);
		gl.uniform1f(gl.getUniformLocation( program, "centerY" ), centerY);
		gl.uniform4fv(gl.getUniformLocation( program, "randomColor" ), colorRandom);
		//本次重绘所需的新值已传递完毕，复位标志
		centerChageFlag = false;
    };

	/******************************************************************
	附加项②: 如果slider改变了递归次数，需要按新的depth重新生成三角形
	         顶点数组并重新上传给VBO，再交给后面的drawArrays绘制。
	******************************************************************/
	if(depthChangedFlag)
	{
		initFractalGeometry();
		depthChangedFlag = false;
	};


	//调用gl的三角形图元绘制函数进行图形的绘制，（直接取顶点缓存中的顶点数据）
	gl.drawArrays(gl.TRIANGLES, 0, points.length );	

}


  
