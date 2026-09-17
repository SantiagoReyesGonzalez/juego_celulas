import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import RAPIER from '@dimforge/rapier2d';

/**
 * Fragmento de Biopelícula: Trozo biológico desprendido tras golpear el núcleo cáustico.
 * Flota a la deriva con física amortiguada y puede ser engullido por el jugador.
 */
export class BiofilmChunk {
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  public mesh: THREE.Mesh;
  public radius: number;
  public isConsumed = false;
  public massValue = 0.55; // Nutriente celular
  public atpValue = 16;    // Ganancia de ATP

  private originalColor = 0x14b8a6;
  private originalEmissive = 0x0f766e;

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius = 1.15
  ) {
    this.radius = radius;

    // 1. Cuerpo dinámico Rapier con sensor para engullimiento suave
    this.body = physicsWorld.createDynamicBody(x, y, 0.6, 1.8);
    this.body.setLinvel({ x: vx, y: vy }, true);

    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setSensor(true)
      .setRestitution(0.6);
    this.collider = physicsWorld.rawWorld.createCollider(colliderDesc, this.body);

    // 2. Malla Three.js: Dodecaedro cristalizado verdoso-turquesa
    const geo = new THREE.DodecahedronGeometry(radius, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: this.originalColor,
      emissive: this.originalEmissive,
      emissiveIntensity: 1.2,
      roughness: 0.25,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
  }

  public update(_dt: number, time: number): void {
    if (this.isConsumed) return;

    const pos = this.body.translation();
    this.mesh.position.set(pos.x, pos.y, 0);

    this.mesh.rotation.x += 0.02;
    this.mesh.rotation.y += 0.035;

    // Pulsación bioluminiscente sutil
    const pulse = 1.0 + Math.sin(time * 4.0 + pos.x) * 0.08;
    this.mesh.scale.set(pulse, pulse, pulse);
  }

  public dispose(scene: THREE.Scene, physicsWorld: PhysicsWorld): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    physicsWorld.rawWorld.removeCollider(this.collider, false);
    physicsWorld.rawWorld.removeRigidBody(this.body);
  }
}
