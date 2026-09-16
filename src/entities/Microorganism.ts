import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';

export enum MicroorganismType {
  TINY_COCCUS = 'TINY_COCCUS',
  SMALL_BACILLUS = 'SMALL_BACILLUS',
  CELLULAR_DEBRIS = 'CELLULAR_DEBRIS',
}

export class Microorganism {
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  public mesh: THREE.Group;

  public type: MicroorganismType;
  public mass: number;
  public radius: number;
  public atpValue: number;
  public isDead = false;

  private wanderAngle = Math.random() * Math.PI * 2;
  private wanderTimer = 0;
  private flagellum?: THREE.Line;

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    x: number,
    y: number,
    type: MicroorganismType = MicroorganismType.TINY_COCCUS
  ) {
    this.type = type;

    // Configuración morfológica y biofísica según el tipo
    switch (type) {
      case MicroorganismType.CELLULAR_DEBRIS:
        this.radius = 0.45 + Math.random() * 0.15;
        this.mass = 0.25;
        this.atpValue = 6;
        break;
      case MicroorganismType.SMALL_BACILLUS:
        this.radius = 0.85;
        this.mass = 0.85;
        this.atpValue = 18;
        break;
      case MicroorganismType.TINY_COCCUS:
      default:
        this.radius = 0.60 + Math.random() * 0.15;
        this.mass = 0.45;
        this.atpValue = 10;
        break;
    }

    // 1. Cuerpo físico en Rapier2D
    this.body = physicsWorld.createDynamicBody(x, y, 0.3, 2.0);
    this.body.setAdditionalMass(this.mass * 1.5, true);

    const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
      .setRestitution(0.5)
      .setFriction(0.2);
    this.collider = physicsWorld.rawWorld.createCollider(colliderDesc, this.body);

    // 2. Malla 3D Three.js
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, y, 0);

    this.buildVisuals();
    scene.add(this.mesh);
  }

  private buildVisuals(): void {
    let color = 0x22c55e;
    let emissive = 0x15803d;

    if (this.type === MicroorganismType.SMALL_BACILLUS) {
      color = 0x06b6d4;
      emissive = 0x0891b2;
    } else if (this.type === MicroorganismType.CELLULAR_DEBRIS) {
      color = 0xf59e0b;
      emissive = 0xb45309;
    }

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });

    if (this.type === MicroorganismType.SMALL_BACILLUS) {
      // Bacilo pequeño alargado
      const geo = new THREE.CapsuleGeometry(this.radius, 1.2, 12, 16);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.z = Math.PI / 2;
      this.mesh.add(m);

      // Flagelo posterior para natación
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < 12; i++) {
        points.push(new THREE.Vector3(-1.0 - i * 0.12, 0, 0));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
      this.flagellum = new THREE.Line(lineGeo, lineMat);
      this.mesh.add(this.flagellum);
    } else {
      // Coco esférico o detrito
      const geo = new THREE.SphereGeometry(this.radius, 16, 16);
      const m = new THREE.Mesh(geo, mat);
      this.mesh.add(m);

      // Núcleo citoplasmático interno
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius * 0.45, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
      );
      this.mesh.add(core);
    }
  }

  /**
   * Actualización biológica y comportamiento autónomo de natación / huida
   */
  public update(
    dt: number,
    time: number,
    playerPos: { x: number; y: number },
    playerMass: number
  ): void {
    if (this.isDead) return;

    const pos = this.body.translation();
    const rot = this.body.rotation();
    this.mesh.position.set(pos.x, pos.y, 0);
    this.mesh.rotation.z = rot;

    // Distancia al jugador
    const dx = playerPos.x - pos.x;
    const dy = playerPos.y - pos.y;
    const distToPlayer = Math.hypot(dx, dy);

    const isPlayerPredator = playerMass >= this.mass * 1.15;

    // IA Biológica: Huida o Exploración fluida
    if (distToPlayer < 11.0 && isPlayerPredator) {
      // Huir en dirección contraria al jugador (alerta quimiotáctica)
      const fleeX = -dx / distToPlayer;
      const fleeY = -dy / distToPlayer;
      const fleeSpeed = 16.0 * dt;

      this.body.applyImpulse({ x: fleeX * fleeSpeed, y: fleeY * fleeSpeed }, true);

      // Rotar cuerpo hacia la dirección de escape
      const targetAngle = Math.atan2(fleeY, fleeX);
      this.body.setRotation(targetAngle, true);
    } else {
      // Deambulación libre en el caldo tisular (Wander)
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 1.5 + Math.random() * 2.0;
        this.wanderAngle += (Math.random() - 0.5) * 1.2;
      }

      const moveX = Math.cos(this.wanderAngle) * 5.5 * dt;
      const moveY = Math.sin(this.wanderAngle) * 5.5 * dt;
      this.body.applyImpulse({ x: moveX, y: moveY }, true);
      this.body.setRotation(this.wanderAngle, true);
    }

    // Ondulación del flagelo si posee
    if (this.flagellum) {
      const positions = this.flagellum.geometry.attributes.position as THREE.BufferAttribute;
      const count = positions.count;
      for (let j = 0; j < count; j++) {
        const xDist = j * 0.12;
        const wave = Math.sin(time * 12.0 - xDist * 3.0) * (xDist * 0.25);
        positions.setY(j, wave);
      }
      positions.needsUpdate = true;
    }
  }

  public dispose(scene: THREE.Scene, physicsWorld: PhysicsWorld): void {
    scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    physicsWorld.rawWorld.removeCollider(this.collider, false);
    physicsWorld.rawWorld.removeRigidBody(this.body);
  }
}
