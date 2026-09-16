import * as THREE from 'three';

export const MembraneVertexShader = /* glsl */ `
uniform float uTime;
uniform float uNoiseFreq;
uniform float uNoiseAmp;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);

  // Deformación viscoelástica biológica ultra-optimizada (60 FPS constante)
  vec3 pos = position;
  float wave = sin(pos.x * uNoiseFreq + uTime * 2.0) * cos(pos.y * uNoiseFreq + uTime * 1.6);
  wave += sin((pos.x + pos.z) * uNoiseFreq * 1.5 - uTime * 1.2) * 0.45;
  pos += normal * (wave * uNoiseAmp);

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

  // Efecto Fresnel 3D confocal de alta velocidad
  float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
  fresnel = pow(fresnel, uFresnelPower) * uFresnelIntensity;

  vec3 baseColor = uColor * 0.6 + uEmissive * 0.35;
  vec3 finalColor = mix(baseColor, uEmissive * 2.0, clamp(fresnel, 0.0, 1.0));
  float alpha = clamp(uOpacity * (0.45 + fresnel * 0.75), 0.0, 0.95);

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
    uNoiseAmp: { value: 0.10 },
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
