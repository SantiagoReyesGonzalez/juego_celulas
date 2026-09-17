import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { getToroidalDelta, wrapPosition, isOutsideBounds } from '../physics/WorldTopology';
import { OrganelleFactory, VerletFlagellum, InternalOrganelleCluster } from './Organelles';
import { CellMorphology } from '../data/MutationTree';
import { createMembraneShaderMaterial } from '../shaders/MembraneShader';

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
  private membraneMaterial?: THREE.ShaderMaterial;
  private baseColor = 0x22c55e;

  // Orgánulos Internos y Flagelos Físicos Verlet
  private internalOrganelles?: InternalOrganelleCluster;
  private verletFlagella: VerletFlagellum[] = [];
  private ciliaMesh?: THREE.LineSegments;
  private apexGlowMesh?: THREE.Mesh;

  // Comportamiento de IA Viva
  private wanderAngle = Math.random() * Math.PI * 2;
  private wanderTimer = 0;
  private zigzagTimer = 0;
  private zigzagSign = 1;

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
    let organelleCount = 3;

    if (this.type === MicroorganismType.SMALL_BACILLUS) {
      color = 0x06b6d4;
      emissive = 0x0891b2;
      organelleCount = 3;
    } else if (this.type === MicroorganismType.CELLULAR_DEBRIS) {
      color = 0xf59e0b;
      emissive = 0xb45309;
      organelleCount = 2;
    } else if (this.type === MicroorganismType.NIMBLE_NAYAD) {
      color = 0x2dd4bf;
      emissive = 0x0f766e;
      organelleCount = 3;
    } else if (this.type === MicroorganismType.APEX_VIBRIO) {
      color = 0xef4444;
      emissive = 0x991b1b;
      organelleCount = 5;
    }

    this.baseColor = color;

    // Membrana translúcida gelatinosa con deformación de vértices por ruido Simplex y Fresnel confocal
    this.membraneMaterial = createMembraneShaderMaterial(
      color,
      emissive,
      0.38,
      this.type === MicroorganismType.APEX_VIBRIO ? 0.98 : 0.95
    );
    const mat = this.membraneMaterial;

    // 2 a 5 Orgánulos internos bioluminiscentes aditivos (núcleo y vacuolas/mitocondrias) visibles a través de la membrana
    this.internalOrganelles = new InternalOrganelleCluster(
      this.mesh,
      this.radius,
      color,
      emissive,
      organelleCount
    );

    if (this.type === MicroorganismType.SMALL_BACILLUS) {
      // Bacilo tisular cilíndrico alargado con cilios
      const geo = new THREE.CapsuleGeometry(this.radius, 1.2, 14, 18);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.z = Math.PI / 2;
      this.mesh.add(m);

      this.ciliaMesh = OrganelleFactory.createCiliaFringe(this.radius, 1.2, CellMorphology.BACILLUS, color);
      this.mesh.add(this.ciliaMesh);

      // Flagelo segmentado Verlet con gradiente continuo
      const vf = new VerletFlagellum(
        this.mesh,
        new THREE.Vector2(-1.0, 0),
        Math.PI,
        0xffffff,
        0x38bdf8,
        0x0284c7,
        0.14,
        18,
        0.16,
        0
      );
      this.verletFlagella.push(vf);

    } else if (this.type === MicroorganismType.NIMBLE_NAYAD) {
      // Presa ágil en forma de huso aerodinámico bioluminiscente cian-dorado
      const geo = new THREE.ConeGeometry(this.radius * 0.95, 1.4, 16);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.z = -Math.PI / 2;
      this.mesh.add(m);

      this.ciliaMesh = OrganelleFactory.createCiliaFringe(this.radius, 0.7, CellMorphology.BACILLUS, 0xfacc15);
      this.mesh.add(this.ciliaMesh);

      // Doble flagelo ágil Verlet con gradiente cian a oro
      [-0.2, 0.2].forEach((offsetY, idx) => {
        const vf = new VerletFlagellum(
          this.mesh,
          new THREE.Vector2(-0.75, offsetY),
          Math.PI,
          0xffffff,
          0x2dd4bf,
          0xfacc15,
          0.12,
          16,
          0.14,
          idx * 1.2
        );
        this.verletFlagella.push(vf);
      });

    } else if (this.type === MicroorganismType.APEX_VIBRIO) {
      // Depredador alfa carmesí: gran cápsula vibrio con fotorreceptores y halo de acecho
      const geo = new THREE.CapsuleGeometry(this.radius * 0.85, 2.0, 16, 22);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.z = Math.PI / 2;
      this.mesh.add(m);

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

      // 3 Flagelos propulsores largos Verlet con gradiente carmesí a ámbar fuego
      [-0.35, 0, 0.35].forEach((offsetY, idx) => {
        const vf = new VerletFlagellum(
          this.mesh,
          new THREE.Vector2(-1.35, offsetY),
          Math.PI,
          0xffffff,
          0xef4444,
          0xf59e0b,
          0.16,
          22,
          0.18,
          idx * 0.85
        );
        this.verletFlagella.push(vf);
      });

    } else {
      // Coco esférico o detrito celular
      const geo = new THREE.SphereGeometry(this.radius, 18, 18);
      const m = new THREE.Mesh(geo, mat);
      this.mesh.add(m);

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
    if (this.membraneMaterial) {
      this.membraneMaterial.uniforms.uFresnelIntensity.value = 5.5;
      this.membraneMaterial.uniforms.uColor.value.setHex(0xffffff);
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
        if (this.membraneMaterial) {
          this.membraneMaterial.uniforms.uFresnelIntensity.value = 2.6;
          this.membraneMaterial.uniforms.uColor.value.setHex(this.baseColor);
        }
      }
    }

    // Actualización de Shader Orgánico de Membrana
    if (this.membraneMaterial) {
      this.membraneMaterial.uniforms.uTime.value = time;
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

    // Dinámica física de orgánulos internos y flagelos Verlet
    const vel = this.body.linvel();
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    const angVel = this.body.angvel();

    // Inercia citoplasmática de orgánulos con blend aditivo
    if (this.internalOrganelles) {
      const cosR = Math.cos(-rot);
      const sinR = Math.sin(-rot);
      const localVx = vel.x * cosR - vel.y * sinR;
      const localVy = vel.x * sinR + vel.y * cosR;
      this.internalOrganelles.update(dt, time, { x: localVx, y: localVy });
    }

    // Ondulación de cadenas físicas Verlet con gradiente cromático
    for (let i = 0; i < this.verletFlagella.length; i++) {
      this.verletFlagella[i].update(dt, time, speed, speed > 0.4, angVel);
    }

    // Ondulación de los cilios perimetrales
    if (this.ciliaMesh) {
      OrganelleFactory.animateCilia(this.ciliaMesh, time);
    }
  }

  public dispose(scene: THREE.Scene, physicsWorld: PhysicsWorld): void {
    this.verletFlagella.forEach((vf) => vf.dispose());
    this.verletFlagella = [];
    if (this.internalOrganelles) {
      this.internalOrganelles.dispose();
      this.internalOrganelles = undefined;
    }
    if (this.membraneMaterial) {
      this.membraneMaterial.dispose();
      this.membraneMaterial = undefined;
    }
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

