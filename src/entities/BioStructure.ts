import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';

export enum BioStructureType {
  CALCIUM_CRYSTAL = 'calcium_crystal',
  PEPTIDE_VESICLE = 'peptide_vesicle',
  TOXIC_CYST = 'toxic_cyst',
  MITOCHONDRION = 'mitochondrion',
}

export enum SpecializedNutrientType {
  CALCIUM_SHARD = 'calcium_shard',
  PEPTIDE_PEARL = 'peptide_pearl',
  ENDOSPORE = 'endospore',
  MITO_COMPLEX = 'mito_complex',
}

export interface StructureConfig {
  name: string;
  type: BioStructureType;
  color: number;
  emissive: number;
  radarColor: string;
  baseRadius: number;
  health: number;
  restitution: number;
  nutrientType: SpecializedNutrientType;
  nutrientCount: number;
  description: string;
}

export const BIO_STRUCTURE_CONFIGS: Record<BioStructureType, StructureConfig> = {
  [BioStructureType.CALCIUM_CRYSTAL]: {
    name: 'Cúmulo de Apatita (Cristal de Calcio)',
    type: BioStructureType.CALCIUM_CRYSTAL,
    color: 0x00f0ff,
    emissive: 0x0284c7,
    radarColor: '#38bdf8',
    baseRadius: 2.2,
    health: 4,
    restitution: 0.45,
    nutrientType: SpecializedNutrientType.CALCIUM_SHARD,
    nutrientCount: 7,
    description: 'Estructura mineral rica en calcio. Al romperse recarga masivamente el Escudo.',
  },
  [BioStructureType.PEPTIDE_VESICLE]: {
    name: 'Vesícula de Péptidos y Proteínas',
    type: BioStructureType.PEPTIDE_VESICLE,
    color: 0xd946ef,
    emissive: 0x9333ea,
    radarColor: '#c084fc',
    baseRadius: 2.4,
    health: 4,
    restitution: 0.85,
    nutrientType: SpecializedNutrientType.PEPTIDE_PEARL,
    nutrientCount: 8,
    description: 'Racimo macromolecular elástico. Al romperse cura la Membrana y expande la salud celular.',
  },
  [BioStructureType.TOXIC_CYST]: {
    name: 'Quiste de Endosporas Energéticas',
    type: BioStructureType.TOXIC_CYST,
    color: 0x10b981,
    emissive: 0x059669,
    radarColor: '#10b981',
    baseRadius: 2.0,
    health: 3,
    restitution: 0.60,
    nutrientType: SpecializedNutrientType.ENDOSPORE,
    nutrientCount: 6,
    description: 'Cápsula bioquímica espinosa. Al romperse otorga ATP y Sobrecarga Metabólica (+Velocidad).',
  },
  [BioStructureType.MITOCHONDRION]: {
    name: 'Nódulo Mitocondrial Ancestral',
    type: BioStructureType.MITOCHONDRION,
    color: 0xf43f5e,
    emissive: 0x991b1b,
    radarColor: '#f43f5e',
    baseRadius: 3.2,
    health: 7,
    restitution: 0.50,
    nutrientType: SpecializedNutrientType.MITO_COMPLEX,
    nutrientCount: 12,
    description: 'Organelo gigante ancestral de gran masa. Al romperse libera una megacarga de ATP.',
  },
};

/**
 * Fragmentos / nutrientes biológicos especializados liberados al fracturar bio-estructuras.
 */
export class SpecializedNutrient {
  public mesh: THREE.Group;
  public position: THREE.Vector2;
  public velocity: THREE.Vector2;
  public type: SpecializedNutrientType;
  public color: number;
  public life = 0;
  public maxLife = 26; // Segundos antes de disiparse en el fluido
  public isCollected = false;
  public radius = 0.55;

  private coreMesh: THREE.Mesh;
  private glowMesh: THREE.Mesh;

  constructor(
    scene: THREE.Scene,
    x: number,
    y: number,
    vx: number,
    vy: number,
    type: SpecializedNutrientType
  ) {
    this.position = new THREE.Vector2(x, y);
    this.velocity = new THREE.Vector2(vx, vy);
    this.type = type;

    this.mesh = new THREE.Group();
    this.mesh.position.set(x, y, 0);

    let color = 0x38bdf8;
    let geo: THREE.BufferGeometry = new THREE.OctahedronGeometry(0.48);

    if (type === SpecializedNutrientType.CALCIUM_SHARD) {
      color = 0x00f0ff;
      geo = new THREE.ConeGeometry(0.38, 0.9, 5);
      this.radius = 0.5;
    } else if (type === SpecializedNutrientType.PEPTIDE_PEARL) {
      color = 0xe879f9;
      geo = new THREE.DodecahedronGeometry(0.46);
      this.radius = 0.55;
    } else if (type === SpecializedNutrientType.ENDOSPORE) {
      color = 0x34d399;
      geo = new THREE.IcosahedronGeometry(0.42);
      this.radius = 0.48;
    } else if (type === SpecializedNutrientType.MITO_COMPLEX) {
      color = 0xfb7185;
      geo = new THREE.SphereGeometry(0.55, 12, 12);
      this.radius = 0.65;
    }

    this.color = color;

    // Núcleo brillante
    const mat = new THREE.MeshBasicMaterial({
      color,
    });
    this.coreMesh = new THREE.Mesh(geo, mat);
    this.mesh.add(this.coreMesh);

    // Halo bioluminiscente aditivo
    const haloGeo = new THREE.SphereGeometry(this.radius * 1.35, 10, 10);
    const haloMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    this.glowMesh = new THREE.Mesh(haloGeo, haloMat);
    this.mesh.add(this.glowMesh);

    scene.add(this.mesh);
  }

  public update(dt: number, time: number): void {
    this.life += dt;

    // Deriva hidrodinámica con fricción viscosa
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.velocity.x *= 0.96;
    this.velocity.y *= 0.96;

    this.mesh.position.set(this.position.x, this.position.y, 0);

    // Rotación y pulsación luminiscente
    this.coreMesh.rotation.x += dt * 2.2;
    this.coreMesh.rotation.y += dt * 3.0;

    const pulse = 1.0 + Math.sin(time * 5.0 + this.position.x) * 0.12;
    this.glowMesh.scale.set(pulse, pulse, pulse);

    // Desvanecimiento suave al final de la vida
    if (this.life > this.maxLife - 3.0) {
      const alpha = Math.max(0, (this.maxLife - this.life) / 3.0);
      (this.glowMesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.35;
    }
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.coreMesh.geometry.dispose();
    if (Array.isArray(this.coreMesh.material)) {
      this.coreMesh.material.forEach((m) => m.dispose());
    } else {
      this.coreMesh.material.dispose();
    }
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
  }
}

/**
 * Esquirla balística de alta velocidad que estalla violentamente al fracturar
 * bio-estructuras minerales y macromoleculares (Game Feel estilo Starblast.io)
 */
export class StructureShard {
  public mesh: THREE.Mesh;
  public vx: number;
  public vy: number;
  public life = 0;
  public maxLife = 0.85;
  public isDead = false;

  constructor(
    scene: THREE.Scene,
    x: number,
    y: number,
    color: number,
    vx: number,
    vy: number,
    scale = 1.0
  ) {
    const geo = Math.random() > 0.5
      ? new THREE.TetrahedronGeometry(0.32 * scale)
      : new THREE.ConeGeometry(0.24 * scale, 0.6 * scale, 4);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, 0);
    this.vx = vx;
    this.vy = vy;
    scene.add(this.mesh);
  }

  public update(dt: number): void {
    if (this.isDead) return;
    this.life += dt;
    this.mesh.position.x += this.vx * dt;
    this.mesh.position.y += this.vy * dt;
    this.vx *= 0.91;
    this.vy *= 0.91;
    this.mesh.rotation.x += 12.0 * dt;
    this.mesh.rotation.y += 14.0 * dt;

    const alpha = Math.max(0, 1.0 - this.life / this.maxLife);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
    if (this.life >= this.maxLife) {
      this.isDead = true;
    }
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/**
 * Bio-Estructura Rompible: Estructura biológica especializada con colisionador Rapier2D,
 * geometría procedural 3D diferenciada, indicador de salud y recompensas tácticas.
 */
export class BioStructure {
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  public mesh: THREE.Group;
  public type: BioStructureType;
  public config: StructureConfig;
  public radius: number;
  public health: number;
  public maxHealth: number;
  public isDestroyed = false;
  public lastHitTime = 0;

  private hitFlashTimer = 0;
  private coreMesh: THREE.Mesh;
  private decorativeMeshes: THREE.Mesh[] = [];
  private healthPipsGroup: THREE.Group;
  private healthPips: THREE.Mesh[] = [];

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    x: number,
    y: number,
    type: BioStructureType,
    radiusMultiplier = 1.0
  ) {
    this.type = type;
    this.config = BIO_STRUCTURE_CONFIGS[type];
    this.radius = this.config.baseRadius * radiusMultiplier;
    this.maxHealth = this.config.health;
    this.health = this.maxHealth;

    // 1. Cuerpo físico en Rapier2D
    const linearDamping = type === BioStructureType.CALCIUM_CRYSTAL ? 0.7 : 0.4;
    this.body = physicsWorld.createDynamicBody(x, y, linearDamping, 1.4);
    this.body.setAdditionalMass(Math.PI * this.radius * this.radius * 1.1, true);

    const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
      .setRestitution(this.config.restitution)
      .setFriction(0.25);
    this.collider = physicsWorld.rawWorld.createCollider(colliderDesc, this.body);

    // 2. Malla Visual Three.js
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, y, 0);

    const mainMat = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.88,
    });

    // 3. Geometría según tipo biológico
    if (type === BioStructureType.CALCIUM_CRYSTAL) {
      // Cristal facetado con prismas radiantes afilados
      const coreGeo = new THREE.IcosahedronGeometry(this.radius * 0.75, 0);
      this.coreMesh = new THREE.Mesh(coreGeo, mainMat);
      this.mesh.add(this.coreMesh);

      const spireGeo = new THREE.ConeGeometry(this.radius * 0.28, this.radius * 0.95, 5);
      const spireMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
      });

      // 6 prismas apuntando en diferentes direcciones
      const angles = [
        [0, 0, 0],
        [Math.PI * 0.5, 0, 0],
        [-Math.PI * 0.5, 0, 0],
        [0, Math.PI * 0.5, 0],
        [0, -Math.PI * 0.5, 0],
        [Math.PI * 0.25, Math.PI * 0.25, 0],
      ];
      angles.forEach(([rx, ry, rz]) => {
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.rotation.set(rx, ry, rz);
        spire.position.set(
          Math.sin(ry) * this.radius * 0.5,
          Math.sin(rx) * this.radius * 0.5,
          Math.cos(rx) * this.radius * 0.5
        );
        this.mesh.add(spire);
        this.decorativeMeshes.push(spire);
      });
    } else if (type === BioStructureType.PEPTIDE_VESICLE) {
      // Racimo globular de vesículas macromoleculares (morfología de mora)
      const coreGeo = new THREE.SphereGeometry(this.radius * 0.58, 14, 14);
      this.coreMesh = new THREE.Mesh(coreGeo, mainMat);
      this.mesh.add(this.coreMesh);

      const subDropGeo = new THREE.SphereGeometry(this.radius * 0.38, 12, 12);
      const subDropMat = new THREE.MeshBasicMaterial({
        color: 0xf0abfc,
        transparent: true,
        opacity: 0.92,
      });

      const numSubDrops = 6;
      for (let i = 0; i < numSubDrops; i++) {
        const angle = (i / numSubDrops) * Math.PI * 2;
        const d = this.radius * 0.48;
        const sub = new THREE.Mesh(subDropGeo, subDropMat);
        sub.position.set(Math.cos(angle) * d, Math.sin(angle) * d, (Math.random() - 0.5) * 0.3);
        this.mesh.add(sub);
        this.decorativeMeshes.push(sub);
      }
    } else if (type === BioStructureType.TOXIC_CYST) {
      // Quiste rugoso con espículas protectoras
      const coreGeo = new THREE.DodecahedronGeometry(this.radius * 0.72, 1);
      this.coreMesh = new THREE.Mesh(coreGeo, mainMat);
      this.mesh.add(this.coreMesh);

      const spikeGeo = new THREE.ConeGeometry(0.18, this.radius * 0.65, 4);
      const spikeMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
      });

      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(Math.cos(angle) * this.radius * 0.75, Math.sin(angle) * this.radius * 0.75, 0);
        spike.rotation.z = angle - Math.PI / 2;
        this.mesh.add(spike);
        this.decorativeMeshes.push(spike);
      }
    } else {
      // MITOCHONDRION: Cuerpo ovoide/capsular con crestas internas
      const coreGeo = new THREE.SphereGeometry(this.radius * 0.85, 20, 16);
      coreGeo.scale(1.35, 0.82, 0.82);
      this.coreMesh = new THREE.Mesh(coreGeo, mainMat);
      this.mesh.add(this.coreMesh);

      // Crestas internas luminosas de alta energía
      const cristaeGeo = new THREE.TorusGeometry(this.radius * 0.42, 0.12, 8, 16);
      const cristaeMat = new THREE.MeshBasicMaterial({
        color: 0xfda4af,
      });

      for (let c = -1; c <= 1; c++) {
        const crista = new THREE.Mesh(cristaeGeo, cristaeMat);
        crista.position.set(c * (this.radius * 0.45), 0, 0.1);
        crista.rotation.y = Math.PI * 0.25 * c;
        this.mesh.add(crista);
        this.decorativeMeshes.push(crista);
      }
    }

    // 4. Indicadores de Salud Estilo Arcade (Pips luminiscentes sobre la estructura)
    this.healthPipsGroup = new THREE.Group();
    const pipGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const spacing = 0.55;
    const startX = -((this.maxHealth - 1) * spacing) * 0.5;

    for (let i = 0; i < this.maxHealth; i++) {
      const pipMat = new THREE.MeshBasicMaterial({
        color: this.config.color,
      });
      const pip = new THREE.Mesh(pipGeo, pipMat);
      pip.position.set(startX + i * spacing, this.radius + 0.65, 0.2);
      this.healthPips.push(pip);
      this.healthPipsGroup.add(pip);
    }
    this.mesh.add(this.healthPipsGroup);

    scene.add(this.mesh);
  }

  /**
   * Recibe impacto de la célula (por sprint o colisión).
   * Devuelve `true` si la estructura ha sido completamente destruida (lisis).
   */
  public hit(damage: number, impactForce?: { x: number; y: number }): boolean {
    if (this.isDestroyed) return true;

    this.health = Math.max(0, this.health - damage);
    this.hitFlashTimer = 0.14;

    // Aplicar fuerza física de retroceso al cuerpo rígido
    if (impactForce) {
      this.body.applyImpulse(impactForce, true);
    }

    // Actualizar pips visuales de salud
    this.updateHealthPips();

    if (this.health <= 0) {
      this.isDestroyed = true;
      return true;
    }
    return false;
  }

  private updateHealthPips(): void {
    for (let i = 0; i < this.healthPips.length; i++) {
      const pip = this.healthPips[i];
      const isAlive = i < this.health;
      const mat = pip.material as THREE.MeshBasicMaterial;
      if (isAlive) {
        mat.color.setHex(this.config.color);
      } else {
        mat.color.setHex(0x334155);
      }
    }
  }

  /**
   * Genera los nutrientes especializados correspondientes y una dispersión balística
   * de esquirlas minerales / macromoleculares al fracturarse.
   */
  public breakApart(scene: THREE.Scene): { nutrients: SpecializedNutrient[]; shards: StructureShard[] } {
    const pos = this.body.translation();
    const count = this.config.nutrientCount;
    const nutrients: SpecializedNutrient[] = [];
    const shards: StructureShard[] = [];

    // 1. Nutrientes especializados recolectables
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 3.5 + Math.random() * 4.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const nut = new SpecializedNutrient(
        scene,
        pos.x + Math.cos(angle) * (this.radius * 0.6),
        pos.y + Math.sin(angle) * (this.radius * 0.6),
        vx,
        vy,
        this.config.nutrientType
      );
      nutrients.push(nut);
    }

    // 2. Esquirlas balísticas de alta velocidad (Game Feel estilo Starblast.io)
    const shardCount = 14;
    for (let s = 0; s < shardCount; s++) {
      const sAngle = (s / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
      const sSpeed = 11.0 + Math.random() * 10.0;
      const svx = Math.cos(sAngle) * sSpeed;
      const svy = Math.sin(sAngle) * sSpeed;
      const shard = new StructureShard(
        scene,
        pos.x + Math.cos(sAngle) * (this.radius * 0.4),
        pos.y + Math.sin(sAngle) * (this.radius * 0.4),
        this.config.color,
        svx,
        svy,
        0.8 + Math.random() * 0.6
      );
      shards.push(shard);
    }

    return { nutrients, shards };
  }

  public update(dt: number, time: number): void {
    const pos = this.body.translation();
    const rot = this.body.rotation();

    this.mesh.position.set(pos.x, pos.y, 0);
    this.mesh.rotation.z = rot;

    // Mantener la barra de vida siempre horizontal sin rotar con el cuerpo
    this.healthPipsGroup.rotation.z = -rot;

    // Flash cromático al ser golpeado
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      const mat = this.coreMesh.material as THREE.MeshBasicMaterial;
      if (this.hitFlashTimer > 0) {
        mat.color.setHex(0xffffff);
      } else {
        mat.color.setHex(this.config.color);
      }
    }

    // Animación suave de los elementos decorativos
    if (this.type === BioStructureType.CALCIUM_CRYSTAL) {
      this.coreMesh.rotation.y = time * 0.4;
    } else if (this.type === BioStructureType.PEPTIDE_VESICLE) {
      const wobble = 1.0 + Math.sin(time * 3.5 + pos.x) * 0.05;
      this.coreMesh.scale.set(wobble, 1.0 / wobble, 1.0);
    }
  }

  public dispose(scene: THREE.Scene, physicsWorld: PhysicsWorld): void {
    physicsWorld.rawWorld.removeCollider(this.collider, false);
    physicsWorld.rawWorld.removeRigidBody(this.body);

    scene.remove(this.mesh);
    this.coreMesh.geometry.dispose();
    (this.coreMesh.material as THREE.Material).dispose();

    this.decorativeMeshes.forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });

    this.healthPips.forEach((p) => {
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    });
  }
}
