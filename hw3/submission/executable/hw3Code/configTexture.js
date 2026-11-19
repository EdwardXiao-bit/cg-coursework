/*******************生成立方体纹理对象*******************************/
// cubeMap 单独占一个纹理单元（TEXTURE3）：WebGL2 规定同一单元不能同时给 sampler2D 和 samplerCube，
// 而主程序里 diffuseTexture/depthTexture 已经占了 0/1，所以 cubeSampler 必须换一个单元
var CUBE_MAP_UNIT = 3;

function configureCubeMap(program) {
    // uniform1i 修改的是"当前 program"，所以先切到传进来的 program（主程序与天空盒各有一份 cubeSampler）
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0 + CUBE_MAP_UNIT);

    cubeMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    gl.uniform1i(gl.getUniformLocation(program, "cubeSampler"), CUBE_MAP_UNIT);

	var faces = [
	    ["./skybox/right.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
        ["./skybox/left.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
        ["./skybox/top.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
        ["./skybox/bottom.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
        ["./skybox/front.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
        ["./skybox/back.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
		];

    for (var i = 0; i < 6; i++) {
        var face = faces[i][1];
        var image = new Image();
        image.src = faces[i][0];
        // 图片是异步加载的，onload 执行时当前激活的纹理单元/绑定可能已经变了，
        // 所以必须在回调里重新 activeTexture + bindTexture，否则六张图会传到别的纹理对象上
        image.onload = function (cubeMap, face, image) {
            return function () {
                gl.activeTexture(gl.TEXTURE0 + CUBE_MAP_UNIT);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
		        gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            }
        }(cubeMap, face, image);
    }
}

/*TODO1:创建一般2D颜色纹理对象并加载图片*/
function configureTexture(image) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 图片坐标原点在左上角，而纹理坐标原点在左下角，翻转一下 y 轴贴图才不是倒的
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // 把图片像素上传成 2D 纹理：内部格式/外部格式都用 RGB，每通道 1 字节
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    // WebGL2 允许非二次幂纹理生成 mipmap；缩小过滤用三线性，放大用线性
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    return texture;
}
