import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { AtpOrb } from './Resources';
import { getToroidalDelta, wrapPosition, isOutsideBounds } from '../physics/WorldTopology';

export enum NeutrophilState {
  PATROL = 'PATROL',
  CHASE = 'CHASE',
  ATTACK = 'ATTACK',
  FLEE = 'FLEE',
}

export class NeutrophilCell {
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  public group: THREE.Group;

  public radius = 1.45;
  public mass = 1.5;
  public hp = 75;
  public maxHp = 75;
  public isDead = false;

  // IA y FSM Quimiotáctica
  public state: NeutrophilState = NeutrophilState.PATROL;
  private detectionRadius = 18.0;
  private wanderAngle = Math.random() * Math.PI * 2;
  private wanderTimer = 0;
  private attackCooldown = 0;

  // Malla citoplasmática ameboide y núcleo trilobulado
  private cytoplasmMesh!: THREE.Mesh;
  private nucleusLobes: THREE.Mesh[] = [];
  private pseudopods: THREE.Mesh[] = [];
  private basePositions!: Float32Array;

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    x: number,
    y: number
  ) {
    // 1. Cuerpo dinámico en Rapier2D
    this.body = physicsWorld.createDynamicBody(x, y, 0.4, 2.5);
    this.body.setAdditionalMass(this.mass * 2.0, true);

    const colDesc = RAPIER.ColliderDesc.ball(this.radius)
      .setRestitution(0.3)
      .setFriction(0.3);
    this.collider = physicsWorld.rawWorld.createCollider(colDesc, this.body);

    // 2. Grupo Visual Three.js
    this.group = new THREE.Group();
    this.group.position.set(x, y, 0);

    this.buildVisuals();
    scene.add(this.group);
  }

  private buildVisuals(): void {
    // Citoplasma ameboide translúcido blanco-azulado con gránulos refractivos
    const cytoGeo = new THREE.SphereGeometry(this.radius, 20, 20);
    this.basePositions = new Float32Array(cytoGeo.attributes.position.array);

    const cytoMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.82,
    });
    this.cytoplasmMesh = new THREE.Mesh(cytoGeo, cytoMat);
    this.group.add(this.cytoplasmMesh);

    // Núcleo trilobulado característico del neutrófilo (polimorfonuclear)
    const nucMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.9,
    });

    const lobeOffsets = [
      new THREE.Vector3(-0.35, -0.2, 0.1),
      new THREE.Vector3(0.35, -0.15, 0.1),
      new THREE.Vector3(0.0, 0.35, 0.1),
    ];

    lobeOffsets.forEach((off) => {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), nucMat);
      lobe.position.copy(off);
      this.group.add(lobe);
      this.nucleusLobes.push(lobe);
    });

    // Pequeños pseudópodos elásticos perimetrales
    const podMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7,
    });

    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), podMat);
      pod.position.set(Math.cos(ang) * this.radius * 0.9, Math.sin(ang) * this.radius * 0.9, 0);
      this.group.add(pod);
      this.pseudopods.push(pod);
    }
  }

  /**
   * Actualización de la Inteligencia Artificial (FSM Quimiotáctica)
   */
  public updateAI(
    dt: number,
    playerPos: { x: number; y: number },
    playerMass: number,
    inflammation: number
  ): void {
    if (this.isDead) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    const pos = this.body.translation();

    // Envolvente toroidal continua si el neutrófilo cruza los límites
    if (isOutsideBounds(pos.x, pos.y)) {
      const wrapped = wrapPosition(pos.x, pos.y);
      this.body.setTranslation(wrapped, true);
    }

    // Vector de distancia toroidal mínima respecto al jugador
    const { dx, dy, dist } = getToroidalDelta(pos.x, pos.y, playerPos.x, playerPos.y);

    // El radio de detección quimiotáctica escala con la inflamación tisular
    const activeDetection = this.detectionRadius * (1.0 + inflammation * 0.6);

    // 1. Transición de Estados
    if (dist < activeDetection) {
      // Si la bacteria invasora es un titán (> 1.3 veces su masa), el neutrófilo huye
      if (playerMass > this.mass * 1.3) {
        this.state = NeutrophilState.FLEE;
      } else if (dist < this.radius + 1.2) {
        this.state = NeutrophilState.ATTACK;
      } else {
        this.state = NeutrophilState.CHASE;
      }
    } else {
      this.state = NeutrophilState.PATROL;
    }

    // 2. Ejecución de Comportamiento Físico
    let targetVx = 0;
    let targetVy = 0;
    const baseSpeed = 8.5 + inflammation * 4.0;

    switch (this.state) {
      case NeutrophilState.PATROL: {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderAngle += (Math.random() - 0.5) * 1.8;
          this.wanderTimer = 1.5 + Math.random() * 2.0;
        }
        targetVx = Math.cos(this.wanderAngle) * (baseSpeed * 0.5);
        targetVy = Math.sin(this.wanderAngle) * (baseSpeed * 0.5);
        break;
      }

      case NeutrophilState.CHASE: {
        if (dist > 0.01) {
          targetVx = (dx / dist) * baseSpeed;
          targetVy = (dy / dist) * baseSpeed;
        }
        break;
      }

      case NeutrophilState.ATTACK: {
        if (dist > 0.01) {
          // Embestida rápida de contacto
          targetVx = (dx / dist) * (baseSpeed * 1.25);
          targetVy = (dy / dist) * (baseSpeed * 1.25);
        }
        break;
      }

      case NeutrophilState.FLEE: {
        if (dist > 0.01) {
          // Huida en dirección diametralmente opuesta
          targetVx = (-dx / dist) * (baseSpeed * 1.15);
          targetVy = (-dy / dist) * (baseSpeed * 1.15);
        }
        break;
      }
    }

    // Aplicar fuerza proporcional de movimiento hidrodinámico
    const vel = this.body.linvel();
    const fx = (targetVx - vel.x) * 18.0 * dt;
    const fy = (targetVy - vel.y) * 18.0 * dt;
    this.body.applyImpulse({ x: fx, y: fy }, true);

    // Amortiguamiento hidrodinámico natural
    this.body.applyImpulse({ x: -vel.x * 2.0 * dt, y: -vel.y * 2.0 * dt }, true);
  }

  /**
   * Actualización Visual (Deformación de pseudópodos ameboides y sincronización de posición)
   */
  public visualUpdate(dt: number, time: number): void {
    if (this.isDead) return;

    const pos = this.body.translation();
    this.group.position.set(pos.x, pos.y, 0);

    // Ondulación elástica del citoplasma ameboide
    const geo = this.cytoplasmMesh.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;

    const pulseSpeed = this.state === NeutrophilState.CHASE ? 6.5 : 3.2;
    const amp = this.state === NeutrophilState.CHASE ? 0.14 : 0.08;

    for (let i = 0; i < count; i++) {
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1];
      const bz = this.basePositions[i * 3 + 2];

      const deform = 1.0 + Math.sin(time * pulseSpeed + bx * 2.5 + by * 2.0) * amp;
      posAttr.setXYZ(i, bx * deform, by * deform, bz * deform);
    }
    posAttr.needsUpdate = true;

    // Pseudópodos estirándose hacia la dirección de movimiento
    const vel = this.body.linvel();
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    if (speed > 0.5) {
      const moveAngle = Math.atan2(vel.y, vel.x);
      this.group.rotation.z += (moveAngle - this.group.rotation.z) * Math.min(dt * 4.0, 1.0);
    }
  }

  /**
   * Recibe daño biológico (enzimas o choque directo de masa del jugador)
   */
  public takeDamage(damage: number): boolean {
    if (this.isDead) return false;

    this.hp -= damage;
    // Parpadeo reactivo de daño
    (this.cytoplasmMesh.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);
    setTimeout(() => {
      if (!this.isDead && this.cytoplasmMesh) {
        (this.cytoplasmMesh.material as THREE.MeshBasicMaterial).color.setHex(0x93c5fd);
      }
    }, 80);

    if (this.hp <= 0) {
      this.isDead = true;
      return true;
    }
    return false;
  }

  /**
   * Lisis celular del neutrófilo: desprende orbes de ATP y nutrientes
   */
  public burstLysis(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    atpList: AtpOrb[]
  ): void {
    if (!this.isDead) this.isDead = true;
    const pos = this.body.translation();

    // Desprender 6-8 orbes de ATP de alto valor bioenergético
    const count = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const spreadDist = 0.6 + Math.random() * 0.8;
      const orbX = pos.x + Math.cos(angle) * spreadDist;
      const orbY = pos.y + Math.sin(angle) * spreadDist;
      const vx = Math.cos(angle) * 7.0;
      const vy = Math.sin(angle) * 7.0;

      const orb = new AtpOrb(scene, orbX, orbY, vx, vy, 6.0);
      atpList.push(orb);
    }

    this.dispose(physicsWorld, scene);
  }

  public dispose(physicsWorld: PhysicsWorld, scene: THREE.Scene): void {
    this.isDead = true;
    scene.remove(this.group);

    if (this.cytoplasmMesh) {
      this.cytoplasmMesh.geometry.dispose();
      (this.cytoplasmMesh.material as THREE.Material).dispose();
    }

    this.nucleusLobes.forEach((lobe) => {
      lobe.geometry.dispose();
      (lobe.material as THREE.Material).dispose();
    });

    this.pseudopods.forEach((pod) => {
      pod.geometry.dispose();
      (pod.material as THREE.Material).dispose();
    });

    try {
      physicsWorld.rawWorld.removeCollider(this.collider, false);
      physicsWorld.rawWorld.removeRigidBody(this.body);
    } catch (e) {
      // Ignorar si ya fue removido
    }
  }
}