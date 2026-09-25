import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { VacuoleManager } from '../systems/VacuoleManager';
import { getToroidalDelta } from '../physics/WorldTopology';
import { AtpOrb } from './Resources';
import { BiofilmChunk } from './BiofilmChunk';
import { Player } from './Player';
import { createMembraneShaderMaterial } from '../shaders/MembraneShader';

function createDiffuseBoundaryTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 42, 64, 64, 63);
  grad.addColorStop(0.0, 'rgba(6, 78, 59, 0)');
  grad.addColorStop(0.45, 'rgba(16, 185, 129, 0.18)');
  grad.addColorStop(0.82, 'rgba(5, 150, 105, 0.32)');
  grad.addColorStop(1.0, 'rgba(6, 78, 59, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export interface HubUpdateResult {
  inField: boolean;
  inCoreContact: boolean;
  health: number;
  maxHealth: number;
  name: string;
}

/**
 * Nódulo de Biopelícula Caústica: Mega-fuente de alimento destructible en 2 capas.
 * - Capa 1 (Campo Externo): Radio ~19u, inflige daño pasivo continuo a quien esté dentro.
 * - Capa 2 (Núcleo Central): Radio ~3.6u, resiste 20 impactos, inflige daño de retroceso
 *   al jugador en cada golpe, se fragmenta en pedazos comestibles y estalla en un festín colosal.
 */
export class BiofilmHub {
  public position: THREE.Vector2;
  public fieldRadius: number;
  public coreRadius: number;
  public name: string;
  public group: THREE.Group;
  public get radius(): number { return this.fieldRadius; }

  // Salud del Núcleo (60 impactos - 3 veces más difícil)
  public maxHealth = 60;
  public health = 60;
  public isDestroyed = false;
  public respawnTimer = 0;
  public lastHitTime = 0;

  // Componentes Visuales
  private coreGroup: THREE.Group;
  private coreMesh: THREE.Mesh;
  private membraneMaterial: THREE.MeshBasicMaterial;
  private coreSpikes: THREE.Mesh[] = [];
  private satellites: THREE.Mesh[] = [];
  private causticDome: THREE.Mesh;
  private causticBoundary: THREE.Mesh;
  private particlesMesh: THREE.Points;

  // Barra / Indicadores de Salud sobre el núcleo
  private healthBarFill: THREE.Mesh;
  private healthBarBg: THREE.Mesh;
  private healthGroup: THREE.Group;

  // Física Rapier2D
  public collider: RAPIER.Collider;
  public body: RAPIER.RigidBody;

  // Control de feedback
  private hitFlashTimer = 0;
  public isPlayerInField = false;

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    x = 0,
    y = 0,
    fieldRadius = 19.0,
    name = 'Nódulo de Biopelícula Caústica'
  ) {
    this.position = new THREE.Vector2(x, y);
    this.fieldRadius = fieldRadius;
    this.coreRadius = 3.6;
    this.name = name;
    this.group = new THREE.Group();
    this.group.position.set(x, y, 0);

    // ================= 1. CAMPO CÁUSTICO EXTERNO (Círculo de Daño Pasivo) =================
    // Domo translúcido ácido
    const domeGeo = new THREE.CircleGeometry(fieldRadius, 54);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x064e3b,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    this.causticDome = new THREE.Mesh(domeGeo, domeMat);
    this.causticDome.position.z = -0.3;
    this.group.add(this.causticDome);

    // Frontera membranosa difusa con gradiente orgánico suave (elimina anillo vectorizado plano)
    const boundaryGeo = new THREE.PlaneGeometry(fieldRadius * 2, fieldRadius * 2);
    const boundaryMat = new THREE.MeshBasicMaterial({
      map: createDiffuseBoundaryTexture(),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.causticBoundary = new THREE.Mesh(boundaryGeo, boundaryMat);
    this.causticBoundary.position.z = -0.2;
    this.group.add(this.causticBoundary);

    // Partículas ácidas flotantes dentro del campo cáustico
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 3.8 + Math.random() * (fieldRadius * 0.88 - 3.8);
      particlePositions[i * 3] = Math.cos(ang) * r;
      particlePositions[i * 3 + 1] = Math.sin(ang) * r;
      particlePositions[i * 3 + 2] = 0.2 + (Math.random() - 0.5) * 0.3;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.42,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    this.particlesMesh = new THREE.Points(particleGeo, particleMat);
    this.group.add(this.particlesMesh);

    // ================= 2. NÚCLEO CENTRAL BLINDADO (20 Impactos) =================
    this.coreGroup = new THREE.Group();

    // Macro-núcleo con material de membrana translúcida orgánica gelatinosa
    const coreGeo = new THREE.SphereGeometry(this.coreRadius, 32, 28);
    this.membraneMaterial = createMembraneShaderMaterial(0x059669, 0x047857, 0.42, 0.95);
    this.coreMesh = new THREE.Mesh(coreGeo, this.membraneMaterial);
    this.coreGroup.add(this.coreMesh);

    // Núcleo interno bioluminiscente visible a través de la membrana
    const innerGeo = new THREE.SphereGeometry(this.coreRadius * 0.52, 18, 18);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
    });
    const innerNucleus = new THREE.Mesh(innerGeo, innerMat);
    this.coreGroup.add(innerNucleus);

    // Crestas / Espículas minerales defensivas sobre el núcleo
    const spikeGeo = new THREE.ConeGeometry(0.7, 1.8, 6);
    const spikeMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      const ang = (i * Math.PI * 2) / 6;
      spike.position.set(Math.cos(ang) * (this.coreRadius * 0.85), Math.sin(ang) * (this.coreRadius * 0.85), 0);
      spike.rotation.z = ang - Math.PI / 2;
      this.coreSpikes.push(spike);
      this.coreGroup.add(spike);
    }

    // Satélites orbitales protectores
    const satMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.90,
    });
    for (let i = 0; i < 4; i++) {
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), satMat);
      this.coreGroup.add(sat);
      this.satellites.push(sat);
    }

    // ================= 3. BARRA DE SALUD SUPERIOR (20 IMPACTOS) =================
    this.healthGroup = new THREE.Group();
    this.healthGroup.position.set(0, this.coreRadius + 1.6, 0.4);

    const barBgGeo = new THREE.PlaneGeometry(6.0, 0.6);
    const barBgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.85 });
    this.healthBarBg = new THREE.Mesh(barBgGeo, barBgMat);
    this.healthGroup.add(this.healthBarBg);

    const barFillGeo = new THREE.PlaneGeometry(5.8, 0.42);
    const barFillMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.healthBarFill = new THREE.Mesh(barFillGeo, barFillMat);
    this.healthBarFill.position.z = 0.05;
    this.healthGroup.add(this.healthBarFill);

    this.coreGroup.add(this.healthGroup);
    this.group.add(this.coreGroup);
    scene.add(this.group);

    // ================= 4. FÍSICA RAPIER2D =================
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y);
    this.body = physicsWorld.rawWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.ball(this.coreRadius)
      .setRestitution(0.75)
      .setFriction(0.3);
    this.collider = physicsWorld.rawWorld.createCollider(colliderDesc, this.body);
  }

  public flashHit(): void {
    this.hitFlashTimer = 0.22;
    this.membraneMaterial.color.setHex(0xffffff);
    this.coreGroup.scale.set(1.22, 0.84, 1.22);
  }

  public hitCore(
    time: number,
    scene: THREE.Scene,
    physicsWorld: PhysicsWorld,
    atpList: AtpOrb[],
    chunkList: BiofilmChunk[],
    player: Player,
    vacuoleManager: VacuoleManager
  ): { destroyed: boolean; recoilDamage: number } {
    if (this.isDestroyed) return { destroyed: false, recoilDamage: 0 };
    if (time - this.lastHitTime < 0.28) return { destroyed: false, recoilDamage: 0 };

    this.lastHitTime = time;
    this.health = Math.max(0, this.health - 1);

    // Cada golpe le hace daño de retroceso al jugador
    const recoilDamage = 7.5;
    vacuoleManager.takeDamage(recoilDamage, 'Retroceso por Impacto en Núcleo');

    this.flashHit();
    this.updateHealthBar();

    // Recompensa inmediata: desprende 1 BiofilmChunk y 1 AtpOrb
    const pPos = player.body.translation();
    const { dx, dy } = getToroidalDelta(this.position.x, this.position.y, pPos.x, pPos.y);
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2;

    const chunk = new BiofilmChunk(
      physicsWorld,
      scene,
      this.position.x + Math.cos(angle) * (this.coreRadius + 1.2),
      this.position.y + Math.sin(angle) * (this.coreRadius + 1.2),
      Math.cos(angle) * 8.5,
      Math.sin(angle) * 8.5,
      1.15
    );
    chunkList.push(chunk);

    const orb = new AtpOrb(
      scene,
      this.position.x + Math.cos(angle + 0.5) * (this.coreRadius + 0.8),
      this.position.y + Math.sin(angle + 0.5) * (this.coreRadius + 0.8),
      Math.cos(angle + 0.5) * 6.5,
      Math.sin(angle + 0.5) * 6.5,
      14
    );
    atpList.push(orb);

    if (this.health <= 0) {
      // Lisis total tras 60 golpes: festín colosal 3x más grande
      this.shatter(scene, physicsWorld, atpList, chunkList);
      return { destroyed: true, recoilDamage };
    }

    return { destroyed: false, recoilDamage };
  }

  private updateHealthBar(): void {
    const pct = Math.max(0, this.health / this.maxHealth);
    this.healthBarFill.scale.set(pct, 1, 1);
    this.healthBarFill.position.x = -(5.8 * (1 - pct)) / 2;

    const fillMat = this.healthBarFill.material as THREE.MeshBasicMaterial;
    if (pct > 0.6) {
      fillMat.color.setHex(0x10b981);
    } else if (pct > 0.25) {
      fillMat.color.setHex(0xf59e0b);
    } else {
      fillMat.color.setHex(0xef4444);
    }
  }

  public shatter(
    scene: THREE.Scene,
    physicsWorld: PhysicsWorld,
    atpList: AtpOrb[],
    chunkList: BiofilmChunk[]
  ): void {
    this.isDestroyed = true;
    this.respawnTimer = 95.0; // 95 segundos para regenerarse

    // Explosión masiva 3x: 26 orbes de ATP + 12 fragmentos grandes de nutrientes
    for (let i = 0; i < 26; i++) {
      const ang = (i * Math.PI * 2) / 26 + (Math.random() - 0.5) * 0.3;
      const speed = 7.0 + Math.random() * 9.5;
      const orb = new AtpOrb(
        scene,
        this.position.x + Math.cos(ang) * 1.5,
        this.position.y + Math.sin(ang) * 1.5,
        Math.cos(ang) * speed,
        Math.sin(ang) * speed,
        20
      );
      atpList.push(orb);
    }

    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI * 2) / 12 + (Math.random() - 0.5) * 0.4;
      const speed = 5.0 + Math.random() * 7.5;
      const chunk = new BiofilmChunk(
        physicsWorld,
        scene,
        this.position.x + Math.cos(ang) * 2.0,
        this.position.y + Math.sin(ang) * 2.0,
        Math.cos(ang) * speed,
        Math.sin(ang) * speed,
        1.35
      );
      chunkList.push(chunk);
    }

    // Ocultar mallas hasta respawn
    this.group.visible = false;
  }

  public respawn(newX: number, newY: number): void {
    this.position.set(newX, newY);
    this.group.position.set(newX, newY, 0);
    this.body.setTranslation({ x: newX, y: newY }, true);

    this.health = this.maxHealth;
    this.isDestroyed = false;
    this.respawnTimer = 0;
    this.updateHealthBar();
    this.group.visible = true;
  }

  public update(
    dt: number,
    time: number,
    playerPos: { x: number; y: number },
    vacuoleManager: VacuoleManager
  ): HubUpdateResult {
    if (this.isDestroyed) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        // Respawn en nuevas coordenadas toroidales aleatorias
        const rx = (Math.random() - 0.5) * 600;
        const ry = (Math.random() - 0.5) * 500;
        this.respawn(rx, ry);
      }
      return { inField: false, inCoreContact: false, health: 0, maxHealth: this.maxHealth, name: this.name };
    }

    // 1. Animaciones Orgánicas
    this.coreMesh.rotation.z += 0.009;
    this.coreMesh.rotation.y += 0.005;

    // Satélites orbitales
    this.satellites.forEach((sat, idx) => {
      const ang = time * 1.1 + (idx * Math.PI) / 2;
      const r = this.coreRadius + 1.4 + Math.sin(time * 2.5 + idx) * 0.3;
      sat.position.set(Math.cos(ang) * r, Math.sin(ang) * r, 0.1);
    });

    // Pulsación sutil de la frontera membranosa difusa
    const pulse = 1.0 + Math.sin(time * 2.0) * 0.025;
    this.causticBoundary.scale.set(pulse, pulse, 1.0);

    // Recuperación elástica tras impacto
    this.coreGroup.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 7.0);

    // Destello de daño
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer <= 0) {
        this.membraneMaterial.color.setHex(0x059669);
      }
    }

    // 2. Detección Toroidal respecto al Jugador
    const { dist } = getToroidalDelta(this.position.x, this.position.y, playerPos.x, playerPos.y);

    // Círculo externo: Daño pasivo continuo mientras esté dentro
    this.isPlayerInField = dist <= this.fieldRadius;
    if (this.isPlayerInField) {
      const passiveDmg = 5.0 * dt; // ~5.0 HP/s de daño por erosión ácida (3x más desafiante)
      vacuoleManager.takeDamage(passiveDmg, 'Erosión Ácida de Campo Cáustico');
    }

    // Contacto perimetral con el núcleo central
    const inCoreContact = dist <= this.coreRadius + 2.0;

    return {
      inField: this.isPlayerInField,
      inCoreContact,
      health: this.health,
      maxHealth: this.maxHealth,
      name: this.name,
    };
  }

  public dispose(scene: THREE.Scene, physicsWorld: PhysicsWorld): void {
    scene.remove(this.group);
    physicsWorld.rawWorld.removeCollider(this.collider, false);
    physicsWorld.rawWorld.removeRigidBody(this.body);
    this.coreMesh.geometry.dispose();
    this.membraneMaterial.dispose();
    this.causticBoundary.geometry.dispose();
    (this.causticBoundary.material as THREE.Material).dispose();
  }
}
