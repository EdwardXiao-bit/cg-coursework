// 材质与光照参数：ambient/diffuse/specular 三个系数、高光指数、雾与反射强度
// 这些值会传给 box.frag（lamp/skybox 程序里没有对应 uniform，getUniformLocation 返回 null，调用会被忽略）
var ambientStrength = 0.22;   // ka
var diffuseStrength = 0.90;   // kd
var specularStrength = 0.45;  // ks
var materialShininess = 48.0; // 材质镜面反射抛光系数
var lightColor = vec3(1.0, 1.0, 1.0); // 入射光拟定为白光

// 附加项②：雾色取天空盒的浅灰蓝，密度控制可见距离
var fogColor = vec3(0.737, 0.745, 0.753);
var fogDensity = 0.022;
// 附加项①：cubeMap 反射强度
var reflectStrength = 0.35;
// 演示/截图用：1=显示阴影，0=关闭；1=PCF 3×3，0=硬阴影单点采样
var shadowStrength = 1.0;
var pcfOn = 1.0;

function configurePhongModelMeterialParameters(program) {
	// 关键：gl.uniform* 只会作用在“当前正在使用的 program”上。
	// 键盘改参数时，上一次 render 结束时 current program 是天空盒，这里必须先切回来，
	// 否则 getUniformLocation(program, …) 拿到的 location 与当前 program 不匹配，uniform 上传会静默失败。
	gl.useProgram(program);

	//----------传递材质的常量参数给shader--------------------------------------------------------
	gl.uniform1f( gl.getUniformLocation(program,  "ambientStrength"), ambientStrength);// 原名 ambientKaStrength 与 shader 不一致，已修正
	gl.uniform1f( gl.getUniformLocation(program,  "diffuseStrength"), diffuseStrength );
	gl.uniform1f( gl.getUniformLocation(program,  "specularStrength"), specularStrength );
	gl.uniform1f( gl.getUniformLocation(program,  "shininess"),materialShininess );
	
	gl.uniform3fv( gl.getUniformLocation(program,  "lightColor"), flatten(lightColor));

	// 附加项①/②：雾与反射参数
	gl.uniform3fv( gl.getUniformLocation(program,  "fogColor"), flatten(fogColor));
	gl.uniform1f( gl.getUniformLocation(program,  "fogDensity"), fogDensity);
	gl.uniform1f( gl.getUniformLocation(program,  "reflectStrength"), reflectStrength);
	gl.uniform1f( gl.getUniformLocation(program,  "shadowStrength"), shadowStrength);
	gl.uniform1f( gl.getUniformLocation(program,  "pcfOn"), pcfOn);
}
