#version 300 es
precision mediump float;

out vec4 FragColor;

uniform float ambientStrength, diffuseStrength, specularStrength,shininess;

in vec3 Normal;//法向量
in vec3 FragPos;//相机观察的片元位置
in vec2 TexCoord;//纹理坐标
in vec4 FragPosLightSpace;//光源观察的片元位置

uniform vec3 viewPos;//相机位置
uniform vec4 u_lightPosition; //光源位置	
uniform vec3 lightColor;//入射光颜色

uniform sampler2D diffuseTexture;
uniform sampler2D depthTexture;
uniform samplerCube cubeSampler;//盒子纹理采样器

// 附加项②：场景雾化
uniform vec3 fogColor;
uniform float fogDensity;
// 附加项①：cubeMap 环境反射
uniform float reflectStrength;
// 演示用开关：阴影强度（0 关闭阴影）与 PCF 开关（0 用单次采样，可对比走样）
uniform float shadowStrength;
uniform float pcfOn;

// shadow map 的深度偏移，避免自阴影（shadow acne）
const float SHADOW_BIAS = 0.0025;

float shadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir)
{
    float shadow=0.0;  //非阴影

    /*TODO3: 添加阴影计算，返回1表示是阴影，返回0表示非阴影*/
    // 1) 光源裁剪空间 → 透视除法 → NDC → [0,1] 的纹理坐标
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;

    // 超出光源视角范围的片元不受该光源阴影影响
    if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 ||
        projCoords.y < 0.0 || projCoords.y > 1.0) {
        return 0.0;
    }

    // 附加项③：3×3 PCF 反走样——比较片元深度与邻域深度图的平均值，边缘更柔和
    vec2 texelSize = 1.0 / vec2(textureSize(depthTexture, 0));
    if (pcfOn < 0.5) {
        // 单点采样：阴影边界是硬边，能看到锯齿，用来和 PCF 对比
        float closestDepth = texture(depthTexture, projCoords.xy).r;
        shadow = (projCoords.z - SHADOW_BIAS > closestDepth) ? 1.0 : 0.0;
    } else {
        float lit  = 0.0;
        int   samples = 0;
        for (int x = -1; x <= 1; ++x) {
            for (int y = -1; y <= 1; ++y) {
                float closestDepth = texture(depthTexture, projCoords.xy + vec2(float(x), float(y)) * texelSize).r;
                // 当前片元比深度图里记录的遮挡物更远 → 落在阴影里
                if (projCoords.z - SHADOW_BIAS > closestDepth) lit += 1.0;
                samples += 1;
            }
        }
        shadow = lit / float(samples);
    }

    return shadow;
}

void main()
{
    //采样纹理颜色
    vec3 TextureColor = texture(diffuseTexture, TexCoord).xyz;

    //计算光照颜色
 	vec3 norm = normalize(Normal);
	vec3 lightDir;
	if(u_lightPosition.w==1.0) 
        lightDir = normalize(u_lightPosition.xyz - FragPos);
	else lightDir = normalize(u_lightPosition.xyz);
	vec3 viewDir = normalize(viewPos - FragPos);
	vec3 halfDir = normalize(viewDir + lightDir);

    /*TODO2:根据phong shading方法计算ambient,diffuse,specular*/
    // ambient：环境光只和材质/入射光有关
    vec3 ambient  = ambientStrength * lightColor;
    // diffuse：Lambert 漫反射，法线与光线夹角越小越亮
    float diff    = max(dot(norm, lightDir), 0.0);
    vec3 diffuse  = diffuseStrength * diff * lightColor;
    // specular：Blinn-Phong 半程向量，指数越大高光越集中
    float spec    = pow(max(dot(norm, halfDir), 0.0), max(shininess, 1.0));
    vec3 specular = specularStrength * spec * lightColor;

  	vec3 lightReflectColor=(ambient +diffuse + specular);

    // 附加项①：用反射向量采样天空盒 cubeMap，按视线掠射角增强（Fresnel 近似）
    vec3 incident = normalize(FragPos - viewPos);
    vec3 reflectDir = reflect(incident, norm);
    vec3 envColor = texture(cubeSampler, reflectDir).xyz;
    float fresnel = pow(1.0 - max(dot(norm, viewDir), 0.0), 3.0);
    float mixAmount = clamp(reflectStrength * (0.25 + 0.75 * fresnel), 0.0, 1.0);
    vec3 albedo = mix(TextureColor, envColor, mixAmount);

    //判定是否阴影，并对各种颜色进行混合
    float shadow = shadowCalculation(FragPosLightSpace, norm, lightDir);
	
    // 环境光不受遮挡，漫反射与高光被 shadow map 削弱
    vec3 resultColor = (ambient + (1.0 - shadow * shadowStrength) * (diffuse + specular)) * albedo;

    // 附加项②：指数雾——距离越远越接近雾色，与天空盒自然衔接
    float dist = length(viewPos - FragPos);
    float fogFactor = clamp(exp(-pow(dist * fogDensity, 2.0)), 0.0, 1.0);
    resultColor = mix(fogColor, resultColor, fogFactor);

    FragColor = vec4(resultColor, 1.f);
}
