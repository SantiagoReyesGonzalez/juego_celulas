import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { getToroidalDelta, wrapPosition, isOutsideBounds } from '../physics/WorldTopology';
import { OrganelleFactory } from './Organelles';
import { CellMorphology } from '../data/MutationTree';

export enum MicroorganismType {
  TINY_COCCUS = 'TINY_COCCUS',
  SMALL_BACILLUS = 'SMALL_BACILLUS',
  CELLULAR_DEBRIS = 'CELLULAR_DEBRIS',
  NIMBLE_NAYAD = 'NIMBLE_NAYAD', // Presa hiper-ágil en zigzag (alta recompensa)
  APEX_VIBRIO = 'APEX_VIBRIO',   // Cazador alfa carmesí agresivo con halo de acecho
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

  // Vida y Hit-Flash
  public hp = 10;
  public maxHp = 10;
  private hitFlashTimer = 0;
  private primaryMaterials: THREE.MeshStandardMaterial[] = [];
  private baseColors: number[] = [];

  // Comportamiento de IA Viva
  private wanderAngle = Math.random() * Math.PI * 2;
  private wanderTimer = 0;
  private zigzagTimer = 0;
  private zigzagSign = 1;
  private flagellum?: THREE.Line;
  private flagella: THREE.Line[] = [];
  private ciliaMesh?: THREE.LineSegments;
  private apexGlowMesh?: THREE.Mesh;

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
        this.hp = 8;
        break;
      case MicroorganismType.SMALL_BACILLUS:
        this.radius = 0.85;
        this.mass = 0.85;
        this.atpValue = 18;
        this.hp = 18;
        break;
      case MicroorganismType.NIMBLE_NAYAD:
        // Presa pequeña, ultrarrápida, bioluminiscente, da 32 ATP
        this.radius = 0.55;
        this.mass = 0.40;
        this.atpValue = 32;
        this.hp = 12;
        break;
      case MicroorganismType.APEX_VIBRIO:
        // Depredador carmesí temible, cuerpo alargado vibrio, alta masa (1.55) y 45 ATP
        this.radius = 1.35;
        this.mass = 1.55;
        this.atpValue = 45;
        this.hp = 42;
        break;
      case MicroorganismType.TINY_COCCUS:
      default:
        this.radius = 0.60 + Math.random() * 0.15;
        this.mass = 0.45;
        this.atpValue = 10;
        this.hp = 12;
        break;
    }
    this.maxHp = this.hp;

    // 1. Cuerpo físico en Rapier2D
    const linearDamping = type === MicroorganismType.NIMBLE_NAYAD ? 0.18 : (type === MicroorganismType.APEX_VIBRIO ? 0.35 : 0.3);
    this.body = physicsWorld.createDynamicBody(x, y, linearDamping, 2.0);
    this.body.setAdditionalMass(this.mass * 1.5, true);

    const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
      .setRestitution(0.5)
      .setFriction(0.2)
      .setSensor(true);
    this.collider = physicsWorld.rawWorld.createCollider(colliderDesc, this.body);

    // 2. Malla 3D Three.js
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, y, 0);

    this.buildVisuals();
    scene.add(this.mesh);
  }

  public get displayName(): string {
    switch (this.type) {
      case MicroorganismType.CELLULAR_DEBRIS:
        return 'Detrito Celular';
      case MicroorganismType.SMALL_BACILLUS:
        return 'Bacilo Tisular';
      case MicroorganismType.NIMBLE_NAYAD:
        return 'Náyade Escurridiza';
      case MicroorganismType.APEX_VIBRIO:
        return 'Vibrión Alfa Carmesí';
      case MicroorganismType.TINY_COCCUS:
      default:
        return 'Micrococo';
    }
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
    } else if (this.type === MicroorganismType.NIMBLE_NAYAD) {
      color = 0x2dd4bf;
      emissive = 0x0f766e;
    } else if (this.type === MicroorganismType.APEX_VIBRIO) {
      color = 0xef4444;
      emissive = 0x991b1b;
    }

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: this.type === MicroorganismType.APEX_VIBRIO ? 1.4 : 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88,
    });
    this.primaryMaterials.push(mat);
    this.baseColors.push(color);

    if (this.type === MicroorganismType.SMALL_BACILLUS) {
      // Bacilo tisular cilíndrico alargado con cilios
      const geo = new THREE.CapsuleGeometry(this.radius, 1.2, 12, 16);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.z = Math.PI / 2;
      this.mesh.add(m);

      const core = new THREE.Mesh(
        new THREE.CapsuleGeometry(this.radius * 0.45, 0.6, 8, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
      );
      core.rotation.z = Math.PI / 2;
      this.mesh.add(core);

      this.ciliaMesh = OrganelleFactory.createCiliaFringe(this.radius, 1.2, CellMorphology.BACILLUS, color);
      this.mesh.add(this.ciliaMesh);

      // Flagelo posterior ondulante
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < 20; i++) {
        points.push(new THREE.Vector3(-1.0 - i * 0.18, 0, 0));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
      this.flagellum = new THREE.Line(lineGeo, lineMat);
      this.flagella.push(this.flagellum);
      this.mesh.add(this.flagellum);

    } else if (this.type === MicroorganismType.NIMBLE_NAYAD) {
      // Presa ágil en forma de huso aerodinámico bioluminiscente cian-dorado
      const geo = new THREE.ConeGeometry(this.radius * 0.95, 1.4, 16);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.z = -Math.PI / 2;
      this.mesh.add(m);

      // Núcleo hiperbrillante dorado
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius * 0.45, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 })
      );
      this.mesh.add(core);

      this.ciliaMesh = OrganelleFactory.createCiliaFringe(this.radius, 0.7, CellMorphology.BACILLUS, 0xfacc15);
      this.mesh.add(this.ciliaMesh);

      // Doble flagelo ágil
      [-0.2, 0.2].forEach((offsetY) => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < 14; i++) {
          points.push(new THREE.Vector3(-0.8 - i * 0.14, offsetY, 0));
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9 });
        const fl = new THREE.Line(lineGeo, lineMat);
        this.flagella.push(fl);
        this.mesh.add(fl);
      });

    } else if (this.type === MicroorganismType.APEX_VIBRIO) {
      // Depredador alfa carmesí: gran cápsula vibrio con fotorreceptores y halo de acecho
      const geo = new THREE.CapsuleGeometry(this.radius * 0.85, 2.0, 14, 20);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.z = Math.PI / 2;
      this.mesh.add(m);

      // Núcleo carmesí pulsante
      const core = new THREE.Mesh(
        new THREE.CapsuleGeometry(this.radius * 0.42, 1.2, 8, 12),
        new THREE.MeshBasicMaterial({ color: 0xff4545, transparent: true, opacity: 0.95 })
      );
      core.rotation.z = Math.PI / 2;
      this.mesh.add(core);

      // Fotorreceptores frontales agresivos (2 ojos biológicos)
      [-0.38, 0.38].forEach((eyeY) => {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        eye.position.set(1.15, eyeY, 0.15);
        this.mesh.add(eye);

        const pupil = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x990000 })
        );
        pupil.position.set(1.26, eyeY, 0.2);
        this.mesh.add(pupil);
      });

      // Halo de acecho amenazante (anillo exterior rojo translúcido)
      const haloGeo = new THREE.RingGeometry(this.radius * 1.3, this.radius * 1.6, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
      this.apexGlowMesh = new THREE.Mesh(haloGeo, haloMat);
      this.mesh.add(this.apexGlowMesh);

      // 3 Flagelos propulsores largos
      [-0.35, 0, 0.35].forEach((offsetY) => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < 24; i++) {
          points.push(new THREE.Vector3(-1.4 - i * 0.20, offsetY, 0));
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.85 });
        const fl = new THREE.Line(lineGeo, lineMat);
        this.flagella.push(fl);
        this.mesh.add(fl);
      });

    } else {
      // Coco esférico o detrito celular
      const geo = new THREE.SphereGeometry(this.radius, 16, 16);
      const m = new THREE.Mesh(geo, mat);
      this.mesh.add(m);

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius * 0.45, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
      );
      this.mesh.add(core);

      if (this.type === MicroorganismType.TINY_COCCUS) {
        this.ciliaMesh = OrganelleFactory.createCiliaFringe(this.radius, 0, CellMorphology.COCCUS, color);
        this.mesh.add(this.ciliaMesh);
      }
    }
  }

  /**
   * Destello blanco aditivo de retroalimentación inmediata al recibir impacto
   */
  public triggerHitFlash(duration = 0.08): void {
    this.hitFlashTimer = duration;
    for (const mat of this.primaryMaterials) {
      mat.color.setHex(0xffffff);
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 3.2;
    }
  }

  public takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.triggerHitFlash(0.08);
    if (this.hp <= 0) {
      this.isDead = true;
      return true;
    }
    return false;
  }

  /**
   * Actualización biológica y comportamiento autónomo de natación, caza y huida viva
   */
  public update(
    dt: number,
    time: number,
    playerPos: { x: number; y: number },
    playerMass: number,
    playerHpPercent = 1.0,
    targetPreyPos?: { x: number; y: number } | null
  ): void {
    if (this.isDead) return;

    // Manejo de Hit-Flash
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer <= 0) {
        for (let i = 0; i < this.primaryMaterials.length; i++) {
          const mat = this.primaryMaterials[i];
          const col = this.baseColors[i];
          mat.color.setHex(col);
          mat.emissive.setHex(this.type === MicroorganismType.APEX_VIBRIO ? 0x991b1b : 0x15803d);
          mat.emissiveIntensity = this.type === MicroorganismType.APEX_VIBRIO ? 1.4 : 0.9;
        }
      }
    }

    let pos = this.body.translation();

    // Envolvente toroidal continua si el microorganismo cruza los límites
    if (isOutsideBounds(pos.x, pos.y)) {
      const wrapped = wrapPosition(pos.x, pos.y);
      this.body.setTranslation(wrapped, true);
      pos = this.body.translation();
    }

    const rot = this.body.rotation();
    this.mesh.position.set(pos.x, pos.y, 0);
    this.mesh.rotation.z = rot;

    // Distancia toroidal al jugador
    const { dx, dy, dist: distToPlayer } = getToroidalDelta(pos.x, pos.y, playerPos.x, playerPos.y);
    const isPlayerPredator = playerMass >= this.mass * 1.15;
    const isApex = this.type === MicroorganismType.APEX_VIBRIO;
    const isNimble = this.type === MicroorganismType.NIMBLE_NAYAD;

    // ================= IA BIOLÓGICA SEGÚN ARQUETIPO =================
    if (isApex) {
      // Pulsación del halo de acecho
      if (this.apexGlowMesh) {
        const pulse = 1.0 + Math.sin(time * 7.0) * 0.14;
        this.apexGlowMesh.scale.set(pulse, pulse, 1.0);
      }

      // El Ápex huele la debilidad del jugador: si vida < 35% o jugador más pequeño, caza agresiva
      const isPlayerVulnerable = playerHpPercent < 0.35 || playerMass < this.mass * 0.95;

      if (distToPlayer < 24.0 && isPlayerVulnerable) {
        // PERSECUCIÓN EN FRENESÍ CARMESÍ
        const frenzyBoost = playerHpPercent < 0.35 ? 1.45 : 1.15;
        const dirX = dx / (distToPlayer || 1);
        const dirY = dy / (distToPlayer || 1);
        const speed = 12.0 * frenzyBoost * dt;

        this.body.applyImpulse({ x: dirX * speed, y: dirY * speed }, true);
        const targetAngle = Math.atan2(dirY, dirX);
        this.body.setRotation(targetAngle, true);

      } else if (distToPlayer < 12.0 && isPlayerPredator) {
        // Cautela táctica si el jugador es mucho más colosal
        const fleeX = -dx / distToPlayer;
        const fleeY = -dy / distToPlayer;
        this.body.applyImpulse({ x: fleeX * 14.0 * dt, y: fleeY * 14.0 * dt }, true);
        this.body.setRotation(Math.atan2(fleeY, fleeX), true);

      } else if (targetPreyPos) {
        // Caza a otros microorganismos cercanos en el ecosistema
        const { dx: px, dy: py, dist: pDist } = getToroidalDelta(pos.x, pos.y, targetPreyPos.x, targetPreyPos.y);
        const dirX = px / (pDist || 1);
        const dirY = py / (pDist || 1);
        this.body.applyImpulse({ x: dirX * 9.5 * dt, y: dirY * 9.5 * dt }, true);
        this.body.setRotation(Math.atan2(dirY, dirX), true);

      } else {
        // Patrulla territorial errante
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderTimer = 1.8 + Math.random() * 2.2;
          this.wanderAngle += (Math.random() - 0.5) * 1.0;
        }
        const moveX = Math.cos(this.wanderAngle) * 7.5 * dt;
        const moveY = Math.sin(this.wanderAngle) * 7.5 * dt;
        this.body.applyImpulse({ x: moveX, y: moveY }, true);
        this.body.setRotation(this.wanderAngle, true);
      }

    } else if (isNimble) {
      // PRESA HIPER-ÁGIL (NIMBLE NAYAD): Esquivas elásticas en zigzag
      if (distToPlayer < 14.0) {
        this.zigzagTimer -= dt;
        if (this.zigzagTimer <= 0) {
          this.zigzagTimer = 0.25 + Math.random() * 0.20;
          this.zigzagSign *= -1;
        }

        // Vector base de escape + componente perpendicular de zigzag
        const fleeBaseX = -dx / distToPlayer;
        const fleeBaseY = -dy / distToPlayer;
        const perpX = -fleeBaseY * this.zigzagSign * 0.75;
        const perpY = fleeBaseX * this.zigzagSign * 0.75;

        const escapeX = fleeBaseX + perpX;
        const escapeY = fleeBaseY + perpY;
        const len = Math.hypot(escapeX, escapeY) || 1;

        // Impulso veloz y elástico
        const speed = 23.5 * dt;
        this.body.applyImpulse({ x: (escapeX / len) * speed, y: (escapeY / len) * speed }, true);
        this.body.setRotation(Math.atan2(escapeY, escapeX), true);

      } else {
        // Exploración ágil
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderTimer = 1.0 + Math.random() * 1.5;
          this.wanderAngle += (Math.random() - 0.5) * 1.5;
        }
        const moveX = Math.cos(this.wanderAngle) * 9.0 * dt;
        const moveY = Math.sin(this.wanderAngle) * 9.0 * dt;
        this.body.applyImpulse({ x: moveX, y: moveY }, true);
        this.body.setRotation(this.wanderAngle, true);
      }

    } else {
      // MICROORGANISMO ESTÁNDAR (Bacilo, Coco, Detrito)
      if (distToPlayer < 11.0 && isPlayerPredator && this.type !== MicroorganismType.CELLULAR_DEBRIS) {
        const fleeX = -dx / distToPlayer;
        const fleeY = -dy / distToPlayer;
        const fleeSpeed = 16.0 * dt;
        this.body.applyImpulse({ x: fleeX * fleeSpeed, y: fleeY * fleeSpeed }, true);
        this.body.setRotation(Math.atan2(fleeY, fleeX), true);
      } else if (this.type !== MicroorganismType.CELLULAR_DEBRIS) {
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
    }

    // Ondulación de todos los flagelos del organismo
    const waveFreq = isNimble ? 18.0 : (isApex ? 10.0 : 12.0);
    for (const fl of this.flagella) {
      const positions = fl.geometry.attributes.position as THREE.BufferAttribute;
      const count = positions.count;
      for (let j = 0; j < count; j++) {
        const xDist = j * 0.14;
        const wave = Math.sin(time * waveFreq - xDist * 3.0) * (xDist * 0.28);
        positions.setY(j, wave);
      }
      positions.needsUpdate = true;
    }

    // Ondulación de los cilios perimetrales
    if (this.ciliaMesh) {
      OrganelleFactory.animateCilia(this.ciliaMesh, time);
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

