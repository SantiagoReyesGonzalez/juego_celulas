import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { AtpOrb } from './Resources';

export class MacrophageBoss {
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  public group: THREE.Group;

  public radius = 3.8;
  public mass = 6.0;
  public hp = 320;
  public maxHp = 320;
  public isDead = false;

  private mainMesh!: THREE.Mesh;
  private lysosomes: THREE.Mesh[] = [];
  private pseudopods: THREE.Mesh[] = [];
  private basePositions!: Float32Array;

  private pulseSpeed = 2.2;
  private attackCooldown = 0;

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    x: number,
    y: number
  ) {
    // 1. Cuerpo rígido colosal en Rapier2D
    this.body = physicsWorld.createDynamicBody(x, y, 0.8, 3.5);
    this.body.setAdditionalMass(this.mass * 2.5, true);

    const colDesc = RAPIER.ColliderDesc.ball(this.radius)
      .setRestitution(0.2)
      .setFriction(0.4);
    this.collider = physicsWorld.rawWorld.createCollider(colDesc, this.body);

    // 2. Grupo Visual Three.js
    this.group = new THREE.Group();
    this.group.position.set(x, y, 0);

    this.buildVisuals();
    scene.add(this.group);
  }

  private buildVisuals(): void {
    // Membrana citoplasmática masiva carmesí/rosácea con ondulaciones
    const geo = new THREE.SphereGeometry(this.radius, 28, 28);
    this.basePositions = new Float32Array(geo.attributes.position.array);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0x881337,
      emissiveIntensity: 0.95,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.84,
    });
    this.mainMesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mainMesh);

    // Lisosomas y vacuolas digestivas internas
    const lysoMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < 7; i++) {
      const lyso = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), lysoMat);
      const angle = (i / 7) * Math.PI * 2;
      const dist = 1.4 + Math.random() * 0.8;
      lyso.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0.2);
      this.group.add(lyso);
      this.lysosomes.push(lyso);
    }

    // Lóbulos de pseudópodos ameboides masivos
    const lobeMat = new THREE.MeshBasicMaterial({
      color: 0xe11d48,
      transparent: true,
      opacity: 0.75,
    });

    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3;
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 14), lobeMat);
      lobe.position.set(Math.cos(ang) * (this.radius * 0.85), Math.sin(ang) * (this.radius * 0.85), 0);
      this.group.add(lobe);
      this.pseudopods.push(lobe);
    }
  }

  public update(dt: number, time: number, playerPos: { x: number; y: number }): void {
    if (this.isDead) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    const pos = this.body.translation();
    const dx = playerPos.x - pos.x;
    const dy = playerPos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Persecución inexorable lenta pero constante
    const speed = 4.2;
    if (dist > 0.05) {
      const targetVx = (dx / dist) * speed;
      const targetVy = (dy / dist) * speed;

      const vel = this.body.linvel();
      const fx = (targetVx - vel.x) * 15.0 * dt;
      const fy = (targetVy - vel.y) * 15.0 * dt;
      this.body.applyImpulse({ x: fx, y: fy }, true);
    }

    // Arrastre hidrodinámico
    const vel = this.body.linvel();
    this.body.applyImpulse({ x: -vel.x * 2.5 * dt, y: -vel.y * 2.5 * dt }, true);

    // Actualización visual
    this.group.position.set(pos.x, pos.y, 0);

    // Ondulación ameboide pesada
    const geo = this.mainMesh.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1];
      const bz = this.basePositions[i * 3 + 2];

      const deform = 1.0 + Math.sin(time * this.pulseSpeed + bx * 1.2 + by * 1.4) * 0.12;
      posAttr.setXYZ(i, bx * deform, by * deform, bz * deform);
    }
    posAttr.needsUpdate = true;

    // Rotación suave de lisosomas
    this.lysosomes.forEach((lyso, idx) => {
      const rotAng = time * 0.8 + (idx * Math.PI) / 3.5;
      const rDist = 1.4 + Math.sin(time * 1.5 + idx) * 0.3;
      lyso.position.x = Math.cos(rotAng) * rDist;
      lyso.position.y = Math.sin(rotAng) * rDist;
    });
  }

  public takeDamage(amount: number): boolean {
    if (this.isDead) return false;

    this.hp -= amount;
    // Parpadeo reactivo
    (this.mainMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
    setTimeout(() => {
      if (!this.isDead && this.mainMesh) {
        (this.mainMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x881337);
      }
    }, 90);

    if (this.hp <= 0) {
      this.isDead = true;
      return true;
    }
    return false;
  }

  public burstLysis(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    atpList: AtpOrb[]
  ): void {
    if (!this.isDead) this.isDead = true;
    const pos = this.body.translation();

    // Cascada masiva de 16-20 orbes de ATP
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const spreadDist = 1.2 + Math.random() * 1.5;
      const orbX = pos.x + Math.cos(angle) * spreadDist;
      const orbY = pos.y + Math.sin(angle) * spreadDist;
      const vx = Math.cos(angle) * 11.0;
      const vy = Math.sin(angle) * 11.0;

      const orb = new AtpOrb(scene, orbX, orbY, vx, vy, 10.0);
      atpList.push(orb);
    }

    this.dispose(physicsWorld, scene);
  }

  public dispose(physicsWorld: PhysicsWorld, scene: THREE.Scene): void {
    this.isDead = true;
    scene.remove(this.group);

    if (this.mainMesh) {
      this.mainMesh.geometry.dispose();
      (this.mainMesh.material as THREE.Material).dispose();
    }

    this.lysosomes.forEach((l) => {
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    });

    this.pseudopods.forEach((p) => {
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    });

    try {
      physicsWorld.rawWorld.removeCollider(this.collider, false);
      physicsWorld.rawWorld.removeRigidBody(this.body);
    } catch (e) {
      // Ignorar si ya fue removido
    }
  }
}
