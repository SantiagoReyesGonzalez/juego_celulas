import * as THREE from 'three';

const SIMPLEX_NOISE_GLSL = /* glsl */ `
// Simplex 3D noise (Ashima Arts / Ian McEwan)
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}
`;

export const MembraneVertexShader = /* glsl */ `
${SIMPLEX_NOISE_GLSL}

uniform float uTime;
uniform float uNoiseFreq;
uniform float uNoiseAmp;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);

  // Deformación viscoelástica continua de la membrana ameboide
  vec3 pos = position;
  float noise = snoise(pos * uNoiseFreq + vec3(uTime * 0.9, uTime * 0.6, 0.0));
  pos += normal * (noise * uNoiseAmp);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const MembraneFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform float uFresnelPower;
uniform float uFresnelIntensity;
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // Efecto Fresnel 3D: el resplandor confocal aumenta en las tangentes
  float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
  fresnel = pow(fresnel, uFresnelPower) * uFresnelIntensity;

  // Centro citoplasmático translúcido y bordes perimetrales bioluminiscentes
  vec3 baseColor = uColor * 0.6 + uEmissive * 0.35;
  vec3 finalColor = mix(baseColor, uEmissive * 2.4, clamp(fresnel, 0.0, 1.0));

  float alpha = clamp(uOpacity * (0.4 + fresnel * 0.8), 0.0, 0.95);
  gl_FragColor = vec4(finalColor, alpha);
}
`;

export interface MembraneUniforms {
  uTime: { value: number };
  uNoiseFreq: { value: number };
  uNoiseAmp: { value: number };
  uColor: { value: THREE.Color };
  uEmissive: { value: THREE.Color };
  uFresnelPower: { value: number };
  uFresnelIntensity: { value: number };
  uOpacity: { value: number };
}

export function createMembraneShaderMaterial(
  color: number = 0x00ff88,
  emissive: number = 0x059669,
  opacity: number = 0.88
): THREE.ShaderMaterial {
  const uniforms: MembraneUniforms = {
    uTime: { value: 0 },
    uNoiseFreq: { value: 1.25 },
    uNoiseAmp: { value: 0.12 },
    uColor: { value: new THREE.Color(color) },
    uEmissive: { value: new THREE.Color(emissive) },
    uFresnelPower: { value: 2.2 },
    uFresnelIntensity: { value: 1.8 },
    uOpacity: { value: opacity },
  };

  return new THREE.ShaderMaterial({
    vertexShader: MembraneVertexShader,
    fragmentShader: MembraneFragmentShader,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}
