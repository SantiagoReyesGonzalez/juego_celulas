import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';

/**
 * Adipocito: Depósito lipídico tisular de gran tamaño con física elástica de cuerpo rígido.
 * Actúa como "asteroide biológico" que libera orbes de ATP mediante lisis celular al ser impactado.
 */
export class Adipocyte {
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  public mesh: THREE.Group;
  private outerMembrane: THREE.Mesh;
  private lipidDrops: THREE.Mesh[] = [];

  public radius: number;
  public health: number;
  public maxHealth: number;
  public isLysed = false;

  private hitFlashTimer = 0;
  private originalColor = 0xd97706;
  private originalEmissive = 0x78350f;

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    x: number,
    y: number,
    radius = 2.4
  ) {
    this.radius = radius;
    // La integridad escala con el volumen del adipocito
    this.maxHealth = Math.round(3 + (radius / 2.0) * 3);
    this.health = this.maxHealth;

    // 1. Cuerpo físico elástico en Rapier2D (gran inercia y amortiguamiento viscoso)
    this.body = physicsWorld.createDynamicBody(x, y, 0.4, 1.2);
    // Masa proporcional al radio al cuadrado
    this.body.setAdditionalMass(Math.PI * radius * radius * 0.8, true);

    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setRestitution(0.75) // Alta elasticidad para rebotes biofísicos orgánicos
      .setFriction(0.2);
    this.collider = physicsWorld.rawWorld.createCollider(colliderDesc, this.body);

    // 2. Malla Visual Three.js: Gota lipídica con inclusiones de lípidos
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, y, 0);

    // Membrana del adipocito (Amarillo-Ámbar bioluminiscente translúcido)
    const geo = new THREE.SphereGeometry(radius, 20, 20);
    const mat = new THREE.MeshStandardMaterial({
      color: this.originalColor,
      emissive: this.originalEmissive,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
    });
    this.outerMembrane = new THREE.Mesh(geo, mat);
    this.mesh.add(this.outerMembrane);

    // Gotículas de lípidos internas que dan sensación de profundidad celular
    const dropGeo = new THREE.SphereGeometry(radius * 0.35, 12, 12);
    const dropMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    });

    const numDrops = Math.floor(3 + Math.random() * 3);
    for (let i = 0; i < numDrops; i++) {
      const drop = new THREE.Mesh(dropGeo, dropMat);
      const angle = (i / numDrops) * Math.PI * 2;
      const dist = radius * 0.45;
      drop.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, (Math.random() - 0.5) * 0.4);
      drop.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8);
      this.lipidDrops.push(drop);
      this.mesh.add(drop);
    }

    scene.add(this.mesh);
  }

  /**
   * Aplica daño enzimático al adipocito con retroalimentación visual de impacto
   */
  public hit(damage: number, impactForce?: { x: number; y: number }): boolean {
    if (this.isLysed) return true;

    this.health -= damage;
    this.hitFlashTimer = 0.15; // Destello de impacto

    // Efecto visual de destello blanco-rojizo
    (this.outerMembrane.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
    (this.outerMembrane.material as THREE.MeshStandardMaterial).emissive.setHex(0xef4444);
    (this.outerMembrane.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0;

    // Aplicar fuerza de empuje si viene del proyectil
    if (impactForce) {
      this.body.applyImpulse(impactForce, true);
    }

    if (this.health <= 0) {
      this.isLysed = true;
      return true; // Ha muerto -> disparar lisis celular
    }
    return false;
  }

  public update(dt: number, time: number): void {
    if (this.isLysed) return;

    // Sincronizar posición con Rapier2D
    const pos = this.body.translation();
    const rot = this.body.rotation();
    this.mesh.position.set(pos.x, pos.y, 0);
    this.mesh.rotation.z = rot;

    // Restaurar color tras el destello de impacto
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer <= 0) {
        (this.outerMembrane.material as THREE.MeshStandardMaterial).color.setHex(this.originalColor);
        (this.outerMembrane.material as THREE.MeshStandardMaterial).emissive.setHex(this.originalEmissive);
        (this.outerMembrane.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
      }
    }

    // Ondulación sutil de las gotas lipídicas internas
    this.lipidDrops.forEach((drop, idx) => {
      drop.position.x += Math.sin(time * 2.0 + idx) * 0.003;
      drop.position.y += Math.cos(time * 2.0 + idx) * 0.003;
    });
  }

  public dispose(scene: THREE.Scene, physicsWorld: PhysicsWorld): void {
    scene.remove(this.mesh);
    this.outerMembrane.geometry.dispose();
    (this.outerMembrane.material as THREE.Material).dispose();
    this.lipidDrops.forEach((drop) => {
      drop.geometry.dispose();
      (drop.material as THREE.Material).dispose();
    });
    physicsWorld.rawWorld.removeCollider(this.collider, false);
    physicsWorld.rawWorld.removeRigidBody(this.body);
  }
}

/**
 * Gránulo de Glucógeno: Recurso menor flotante de carbohidratos estáticos en el tejido.
 */
export class GlycogenGranule {
  public mesh: THREE.Mesh;
  public position: THREE.Vector2;
  public radius = 0.6;
  public atpValue = 4;
  public isConsumed = false;

  constructor(scene: THREE.Scene, x: number, y: number) {
    this.position = new THREE.Vector2(x, y);

    const geo = new THREE.DodecahedronGeometry(this.radius);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.1,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, 0.1);
    scene.add(this.mesh);
  }

  public update(_dt: number, time: number): void {
    if (this.isConsumed) return;
    this.mesh.rotation.x += 0.02;
    this.mesh.rotation.y += 0.03;
    this.mesh.position.y = this.position.y + Math.sin(time * 2.0 + this.position.x) * 0.15;
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/**
 * Orbe de ATP: Moneda energética liberada durante la lisis de adipocitos.
 * Responde a quimiotaxis magnética hacia el jugador y amortiguamiento viscoso.
 */
export class AtpOrb {
  public mesh: THREE.Mesh;
  public position: THREE.Vector2;
  public velocity: THREE.Vector2;
  public atpValue: number;
  public life = 0;
  public maxLife = 40.0;
  public isCollected = false;
  public isAttracted = false;

  constructor(scene: THREE.Scene, x: number, y: number, vx: number, vy: number, value = 6) {
    this.position = new THREE.Vector2(x, y);
    this.velocity = new THREE.Vector2(vx, vy);
    this.atpValue = value;

    // Orbe bioluminiscente dorado con núcleo cian
    const geo = new THREE.SphereGeometry(0.35, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 2.5,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, 0.3);
    scene.add(this.mesh);
  }

  public update(dt: number, time: number): void {
    if (this.isCollected) return;

    this.life += dt;

    // Amortiguamiento hidrodinámico en medio líquido si no está siendo atraído agresivamente
    if (!this.isAttracted) {
      this.velocity.x *= 0.94;
      this.velocity.y *= 0.94;
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.mesh.position.set(this.position.x, this.position.y, 0.3);

    // Efecto de pulso bioluminiscente de energía ATP
    const pulse = 1.0 + Math.sin(time * 6.0 + this.position.x) * 0.2;
    this.mesh.scale.set(pulse, pulse, pulse);
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
