import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { VacuoleManager } from '../systems/VacuoleManager';
import { getToroidalDelta } from '../physics/WorldTopology';
import { NeutrophilCell } from './NeutrophilCell';
import { MacrophageBoss } from './MacrophageBoss';

export class BiofilmHub {
  public position: THREE.Vector2;
  public radius: number;
  public name: string;
  public group: THREE.Group;

  private membraneShield: THREE.Mesh;
  private coreMesh: THREE.Mesh;
  private satellites: THREE.Mesh[] = [];
  private particlesMesh: THREE.Points;
  public collider: RAPIER.Collider;

  public isPlayerInside = false;
  private hitFlashTimer = 0;

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    x = 0,
    y = 0,
    radius = 16.0,
    name = 'Nido de Biopelícula Central'
  ) {
    this.position = new THREE.Vector2(x, y);
    this.radius = radius;
    this.name = name;
    this.group = new THREE.Group();
    this.group.position.set(x, y, -0.5);

    // 1. Núcleo bacteriano simbiótico central (Colonia ancestral protegida)
    const coreGeo = new THREE.DodecahedronGeometry(2.6, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x047857,
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.15,
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.coreMesh);

    // Satélites simbióticos orbitales
    const satMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    for (let i = 0; i < 4; i++) {
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), satMat);
      this.group.add(sat);
      this.satellites.push(sat);
    }

    // 2. Membrana Protectora Translúcida de Polisacáridos (Escudo Osmótico)
    const shieldGeo = new THREE.RingGeometry(radius * 0.94, radius, 64);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    this.membraneShield = new THREE.Mesh(shieldGeo, shieldMat);
    this.group.add(this.membraneShield);

    // Domo bioluminiscente interior suave
    const domeGeo = new THREE.CircleGeometry(radius * 0.94, 48);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x047857,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.z = -0.1;
    this.group.add(dome);

    // 3. Campo de Partículas de Regeneración Tisular
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * (radius * 0.85);
      particlePositions[i * 3] = Math.cos(ang) * r;
      particlePositions[i * 3 + 1] = Math.sin(ang) * r;
      particlePositions[i * 3 + 2] = 0.2 + (Math.random() - 0.5) * 0.4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.45,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    this.particlesMesh = new THREE.Points(particleGeo, particleMat);
    this.group.add(this.particlesMesh);

    scene.add(this.group);

    // 4. Sensor Físico Rapier2D
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y);
    const body = physicsWorld.rawWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.ball(radius).setSensor(true);
    this.collider = physicsWorld.rawWorld.createCollider(colliderDesc, body);
  }

  public flashShieldHit(): void {
    this.hitFlashTimer = 0.25;
  }

  /**
   * Repele leucocitos hostiles fuera del radio de la biopelícula
   */
  public repelEnemies(
    neutrophils: NeutrophilCell[],
    macrophage: MacrophageBoss | null,
    dt: number
  ): void {
    const forceMultiplier = 110.0;

    // 1. Repeler neutrófilos fuera de la barrera de polisacáridos
    neutrophils.forEach((neutro) => {
      if (neutro.isDead) return;
      const nPos = neutro.body.translation();
      const { dx, dy, dist } = getToroidalDelta(this.position.x, this.position.y, nPos.x, nPos.y);

      if (dist < this.radius + neutro.radius + 1.5) {
        const overlap = this.radius + neutro.radius + 1.5 - dist;
        const nx = dist > 0.01 ? dx / dist : 1;
        const ny = dist > 0.01 ? dy / dist : 0;
        const push = (forceMultiplier + overlap * 90.0) * dt;

        const vel = neutro.body.linvel();
        const radialVel = vel.x * nx + vel.y * ny;
        if (radialVel < 0) {
          neutro.body.setLinvel(
            {
              x: vel.x - radialVel * nx * 1.5 + nx * 8.0,
              y: vel.y - radialVel * ny * 1.5 + ny * 8.0,
            },
            true
          );
        } else {
          neutro.body.applyImpulse({ x: nx * push, y: ny * push }, true);
        }
        this.flashShieldHit();
      }
    });

    // 2. Repeler Macrófago Titán
    if (macrophage && !macrophage.isDead) {
      const mPos = macrophage.body.translation();
      const { dx, dy, dist } = getToroidalDelta(this.position.x, this.position.y, mPos.x, mPos.y);

      if (dist < this.radius + macrophage.radius + 2.0) {
        const overlap = this.radius + macrophage.radius + 2.0 - dist;
        const nx = dist > 0.01 ? dx / dist : 1;
        const ny = dist > 0.01 ? dy / dist : 0;
        const push = (forceMultiplier * 2.2 + overlap * 80.0) * dt;

        const vel = macrophage.body.linvel();
        const radialVel = vel.x * nx + vel.y * ny;
        if (radialVel < 0) {
          macrophage.body.setLinvel(
            {
              x: vel.x - radialVel * nx * 1.4 + nx * 6.0,
              y: vel.y - radialVel * ny * 1.4 + ny * 6.0,
            },
            true
          );
        } else {
          macrophage.body.applyImpulse({ x: nx * push, y: ny * push }, true);
        }
        this.flashShieldHit();
      }
    }
  }

  public update(
    dt: number,
    time: number,
    playerPos: { x: number; y: number },
    vacuoleManager: VacuoleManager
  ): boolean {
    // 1. Animaciones orgánicas
    this.coreMesh.rotation.z += 0.009;
    this.coreMesh.rotation.y += 0.005;

    // Satélites orbitales proporcionales al radio del nido
    this.satellites.forEach((sat, idx) => {
      const ang = time * 0.9 + (idx * Math.PI) / 2;
      const r = this.radius * 0.28 + Math.sin(time * 2.0 + idx) * 0.4;
      sat.position.set(Math.cos(ang) * r, Math.sin(ang) * r, 0.1);
    });

    // Ondulación de partículas
    const posAttr = this.particlesMesh.geometry.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;
    for (let i = 0; i < count; i++) {
      let py = posAttr.getY(i) + dt * 0.8;
      const px = posAttr.getX(i);
      const r = Math.hypot(px, py);
      if (r > this.radius * 0.82) {
        py = -Math.sqrt(Math.max(0, (this.radius * 0.75) ** 2 - px * px));
      }
      posAttr.setY(i, py);
    }
    posAttr.needsUpdate = true;

    // Pulsación del escudo
    const pulse = 1.0 + Math.sin(time * 2.2) * 0.03;
    this.membraneShield.scale.set(pulse, pulse, 1.0);

    // 2. Detección toroidal de proximidad del jugador
    const { dist } = getToroidalDelta(this.position.x, this.position.y, playerPos.x, playerPos.y);
    const wasInside = this.isPlayerInside;
    this.isPlayerInside = dist <= this.radius;

    // 3. Efecto de destello al repeler enemigos o recibir impacto
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
      (this.membraneShield.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      (this.membraneShield.material as THREE.MeshBasicMaterial).opacity = 0.9;
    } else {
      (this.membraneShield.material as THREE.MeshBasicMaterial).color.setHex(0x00ffcc);
    }

    if (this.isPlayerInside) {
      // Regeneración Celular Pasiva dentro del Nido:
      // +12 HP/s en membrana
      if (vacuoleManager.membraneIntegrity < vacuoleManager.maxMembraneIntegrity) {
        vacuoleManager.membraneIntegrity = Math.min(
          vacuoleManager.maxMembraneIntegrity,
          vacuoleManager.membraneIntegrity + 12 * dt
        );
      }
      // +10 Escudo/s (Presión Osmótica)
      if (vacuoleManager.osmoticPressure < vacuoleManager.maxOsmoticPressure) {
        vacuoleManager.osmoticPressure = Math.min(
          vacuoleManager.maxOsmoticPressure,
          vacuoleManager.osmoticPressure + 10 * dt
        );
      }
      // +15 ATP/s en la vacuola
      vacuoleManager.addAtp(15 * dt);

      if (this.hitFlashTimer <= 0) {
        (this.membraneShield.material as THREE.MeshBasicMaterial).opacity = 0.75;
      }
    } else if (wasInside) {
      if (this.hitFlashTimer <= 0) {
        (this.membraneShield.material as THREE.MeshBasicMaterial).opacity = 0.45;
      }
    }

    return this.isPlayerInside;
  }

  public dispose(scene: THREE.Scene, physicsWorld: PhysicsWorld): void {
    scene.remove(this.group);
    physicsWorld.rawWorld.removeCollider(this.collider, false);
  }
}
