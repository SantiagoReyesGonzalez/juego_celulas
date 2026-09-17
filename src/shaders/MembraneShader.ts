import * as THREE from 'three';

/**
 * Material de membrana celular biológica de alto rendimiento sin sobrecarga de shaders.
 * Utiliza MeshStandardMaterial nativo optimizado con translucidez, resplandor emisivo y cero cálculos de ruido en GPU.
 */
export function createMembraneShaderMaterial(
  color: number = 0x00ff88,
  emissive: number = 0x059669,
  _coreOpacity: number = 0.88,
  _rimOpacity: number = 0.96
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity: 0.92,
    roughness: 0.22,
    metalness: 0.08,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
}
