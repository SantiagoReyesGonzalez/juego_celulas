import * as THREE from 'three';

/**
 * Material de membrana celular biológica de máxima velocidad sin sobrecarga de shaders.
 * Utiliza MeshBasicMaterial 100% libre de cálculos de iluminación PBR / Cook-Torrance en GPU.
 */
export function createMembraneShaderMaterial(
  color: number = 0x00ff88,
  _emissive: number = 0x059669,
  _coreOpacity: number = 0.88,
  _rimOpacity: number = 0.96
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
}
