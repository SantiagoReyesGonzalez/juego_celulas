import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import { Player } from '../entities/Player';
import { Microorganism, MicroorganismType } from '../entities/Microorganism';
import { Adipocyte, AtpOrb } from '../entities/Resources';
import { BioStructure, BioStructureType, SpecializedNutrient, SpecializedNutrientType } from '../entities/BioStructure';
import { VacuoleManager } from './VacuoleManager';
import { WORLD_BOUNDS, getToroidalDelta, wrapPosition, isOutsideBounds } from '../physics/WorldTopology';

/**
 * Gránulo de Nutriente / Glucógeno comestible (estilo puntos de Agar.io)
 */
export class NutrientPellet {
  public position: THREE.Vector2;
  public mesh: THREE.Mesh;
  public radius = 0.4;
  public atpValue = 4.0;
  public massGain = 0.12;
  public isCollected = false;
  private floatOffset = Math.random() * Math.PI * 2;
  private floatSpeed = 1.3 + Math.random() * 0.8;

  constructor(
    scene: THREE.Scene,
    x: number,
    y: number,
    geometry: THREE.BufferGeometry,
    material: THREE.Material
  ) {
    this.position = new THREE.Vector2(x, y);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
  }

  public update(dt: number, time: number): void {
    if (this.isCollected) return;
    const wave = Math.sin(time * this.floatSpeed + this.floatOffset);
    this.mesh.position.x = this.position.x + wave * 0.14;
    this.mesh.position.y = this.position.y + Math.cos(time * this.floatSpeed + this.floatOffset) * 0.14;
    this.mesh.rotation.y += dt * 1.8;
    this.mesh.rotation.z += dt * 1.2;
    const pulse = 1.0 + wave * 0.15;
    this.mesh.scale.set(pulse, pulse, pulse);
  }

  public dispose(scene: THREE.Scene): void {
    this.isCollected = true;
    scene.remove(this.mesh);
  }
}

export class PredationSystem {
  private physicsWorld: PhysicsWorld;
  private scene: THREE.Scene;
  private player: Player;
  private vacuoleManager: VacuoleManager;

  public nutrients: NutrientPellet[] = [];
  public microorganisms: Microorganism[] = [];
  public adipocytes: Adipocyte[] = [];
  public bioStructures: BioStructure[] = [];
  public atpOrbs: AtpOrb[] = [];
  public specializedNutrients: SpecializedNutrient[] = [];

  public onPredationActivity?: (type: 'pellet' | 'microorganism' | 'adipocyte') => void;
  public onSpecializedNutrientCollected?: (text: string, color: string) => void;

  private maxNutrients = 380;
  private maxMicroorganisms = 180;
  private maxAdipocytes = 16;
  private maxBioStructures = 26;
  private worldBounds = WORLD_BOUNDS;

  // Recursos compartidos para los gránulos de nutrientes
  private nutGeo: THREE.BufferGeometry;
  private nutMat: THREE.Material;

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    player: Player,
    vacuoleManager: VacuoleManager
  ) {
    this.physicsWorld = physicsWorld;
    this.scene = scene;
    this.player = player;
    this.vacuoleManager = vacuoleManager;

    // Geometría dorada brillante compartida para optimizar el rendimiento
    this.nutGeo = new THREE.DodecahedronGeometry(0.38);
    this.nutMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.8,
      roughness: 0.1,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
    });

    this.vacuoleManager.addAtpLeakListener((amount) => {
      this.spawnAtpLeak(amount);
    });

    // Población inicial del caldo tisular
    this.populateEcosystem();
  }

  private populateEcosystem(): void {
    // 1. Gránulos de Glucógeno / Nutrientes (Agar.io Dots)
    // Agrupar 35 gránulos cerca del jugador para alimentación inmediata desde el segundo 0
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 3.5 + Math.random() * 20.0;
      this.spawnNutrient(Math.cos(angle) * dist, Math.sin(angle) * dist);
    }
    // El resto distribuidos por todo el mapa
    while (this.nutrients.length < this.maxNutrients) {
      this.spawnRandomNutrient();
    }

    // 2. Microorganismos (Cocos, Bacilos, Desechos)
    // Generar 20 organismos accesibles en el entorno cercano (distancia 5 a 26)
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5.0 + Math.random() * 21.0;
      const rand = Math.random();
      let type = MicroorganismType.TINY_COCCUS;
      if (rand < 0.45) {
        type = MicroorganismType.CELLULAR_DEBRIS;
      } else if (rand > 0.82) {
        type = MicroorganismType.SMALL_BACILLUS;
      }
      const micro = new Microorganism(this.physicsWorld, this.scene, Math.cos(angle) * dist, Math.sin(angle) * dist, type);
      this.microorganisms.push(micro);
    }
    while (this.microorganisms.length < this.maxMicroorganisms) {
      this.spawnRandomMicroorganism();
    }

    // 3. Depósitos lipídicos (Adipocitos amarillos)
    for (let i = 0; i < this.maxAdipocytes; i++) {
      this.spawnRandomAdipocyte();
    }

    // 4. Bio-estructuras diversas para romper y comer (Cian, Violeta, Verde y Rojo)
    for (let i = 0; i < this.maxBioStructures; i++) {
      this.spawnRandomBioStructure();
    }
  }

  private spawnNutrient(x: number, y: number): void {
    const nut = new NutrientPellet(this.scene, x, y, this.nutGeo, this.nutMat);
    this.nutrients.push(nut);
  }

  private spawnRandomNutrient(): void {
    const x = (Math.random() - 0.5) * (this.worldBounds.maxX - this.worldBounds.minX);
    const y = (Math.random() - 0.5) * (this.worldBounds.maxY - this.worldBounds.minY);
    this.spawnNutrient(x, y);
  }

  private spawnRandomMicroorganism(): void {
    const x = (Math.random() - 0.5) * (this.worldBounds.maxX - this.worldBounds.minX);
    const y = (Math.random() - 0.5) * (this.worldBounds.maxY - this.worldBounds.minY);

    const rand = Math.random();
    let type = MicroorganismType.TINY_COCCUS;
    if (rand < 0.35) {
      type = MicroorganismType.CELLULAR_DEBRIS;
    } else if (rand > 0.8) {
      type = MicroorganismType.SMALL_BACILLUS;
    }

    const micro = new Microorganism(this.physicsWorld, this.scene, x, y, type);
    this.microorganisms.push(micro);
  }

  private spawnRandomAdipocyte(): void {
    let x = 0;
    let y = 0;
    let dist = 0;
    do {
      x = (Math.random() - 0.5) * (this.worldBounds.maxX - this.worldBounds.minX);
      y = (Math.random() - 0.5) * (this.worldBounds.maxY - this.worldBounds.minY);
      const playerPos = this.player.body.translation();
      dist = Math.hypot(x - playerPos.x, y - playerPos.y);
    } while (dist < 10.0);

    const radius = 2.0 + Math.random() * 1.8;
    const adipocyte = new Adipocyte(this.physicsWorld, this.scene, x, y, radius);
    this.adipocytes.push(adipocyte);
  }

  private spawnRandomBioStructure(): void {
    let x = 0;
    let y = 0;
    let dist = 0;
    do {
      x = (Math.random() - 0.5) * (this.worldBounds.maxX - this.worldBounds.minX);
      y = (Math.random() - 0.5) * (this.worldBounds.maxY - this.worldBounds.minY);
      const playerPos = this.player.body.translation();
      dist = Math.hypot(x - playerPos.x, y - playerPos.y);
    } while (dist < 12.0);

    const rand = Math.random();
    let type = BioStructureType.CALCIUM_CRYSTAL;
    if (rand < 0.32) {
      type = BioStructureType.CALCIUM_CRYSTAL; // Cian
    } else if (rand < 0.62) {
      type = BioStructureType.PEPTIDE_VESICLE; // Violeta
    } else if (rand < 0.85) {
      type = BioStructureType.TOXIC_CYST; // Verde
    } else {
      type = BioStructureType.MITOCHONDRION; // Rojo Rubí
    }

    const structure = new BioStructure(this.physicsWorld, this.scene, x, y, type);
    this.bioStructures.push(structure);
  }

  public update(dt: number, time: number): void {
    const playerPos = this.player.body.translation();
    const playerRadius = this.player.baseRadius * this.player.currentScale;
    const playerMass = this.player.currentMass;
    const chemoLevel = this.vacuoleManager.upgrades.chemotaxis?.level || 0;
    const atpBonus = 1.0 + chemoLevel * 0.2;
    const digestiveLevel = this.vacuoleManager.upgrades.digestiveEfficiency?.level || 0;
    const digestiveBonus = 1.0 + digestiveLevel * 0.25;

    // ================= 1. CONSUMO DE GRÁNULOS DE NUTRIENTES (Agar.io) =================
    // La bacteria SOLO se alimenta cuando el cuerpo celular pasa exactamente por encima (sin efecto imán)
    for (let i = this.nutrients.length - 1; i >= 0; i--) {
      const nut = this.nutrients[i];
      nut.update(dt, time);

      const { dist: nutDist } = getToroidalDelta(playerPos.x, playerPos.y, nut.position.x, nut.position.y);
      if (nutDist <= playerRadius + nut.radius + 0.35) {
        this.vacuoleManager.addAtp(nut.atpValue * atpBonus);
        this.vacuoleManager.healMembrane(0.20 * digestiveBonus);
        this.player.feedBounce(1.08);

        if (this.onPredationActivity) {
          this.onPredationActivity('pellet');
        }

        nut.dispose(this.scene);
        this.nutrients.splice(i, 1);

        setTimeout(() => {
          if (this.nutrients.length < this.maxNutrients) {
            this.spawnRandomNutrient();
          }
        }, 2200);
      }
    }

    // ================= 2. DEPREDACIÓN DE MICROORGANISMOS =================
    for (let i = this.microorganisms.length - 1; i >= 0; i--) {
      const micro = this.microorganisms[i];
      micro.update(dt, time, playerPos, playerMass);

      const microPos = micro.body.translation();
      const { dist: microDist } = getToroidalDelta(playerPos.x, playerPos.y, microPos.x, microPos.y);
      const contactDist = playerRadius + micro.radius;

      // Contacto físico inmediato (elimina el bloqueo de rigid body)
      if (microDist <= contactDist + 0.45) {
        // El jugador es mayor que los detritos (0.25), cocos (0.45) y bacilos (0.85) desde el nivel inicial
        const canEngulf = (playerMass >= micro.mass * 0.80) || this.player.isSprinting;
        if (canEngulf) {
          // ENGULLIMIENTO / FAGOCITOSIS COMPLETA
          const atpGained = Math.round(micro.atpValue * atpBonus);
          this.vacuoleManager.addAtp(atpGained);
          this.vacuoleManager.healMembrane(Math.max(2.0, micro.mass * 3.0) * digestiveBonus);
          this.player.feedBounce(1.22);

          micro.isDead = true;
          micro.dispose(this.scene, this.physicsWorld);
          this.microorganisms.splice(i, 1);

          if (this.onPredationActivity) {
            this.onPredationActivity('microorganism');
          }

          setTimeout(() => {
            if (this.microorganisms.length < this.maxMicroorganisms) {
              this.spawnRandomMicroorganism();
            }
          }, 1800);
          continue;
        } else if (playerMass < micro.mass * 0.75) {
          this.vacuoleManager.takeDamage(10 * dt, 'Depredación por Microorganismo Gigante');
        }
      }
    }

    // ================= 3. DIGESTIÓN Y RUPTURA DE ADIPOCITOS POR SPRINT =================
    // Se rompe con salticos del clic (Sprint) o embestida veloz.
    for (let i = this.adipocytes.length - 1; i >= 0; i--) {
      const ad = this.adipocytes[i];
      ad.update(dt, time);

      let adPos = ad.body.translation();

      // Envolvente toroidal de adipocitos
      if (isOutsideBounds(adPos.x, adPos.y)) {
        const wrapped = wrapPosition(adPos.x, adPos.y);
        ad.body.setTranslation(wrapped, true);
        adPos = ad.body.translation();
      }

      const { dx, dy, dist } = getToroidalDelta(playerPos.x, playerPos.y, adPos.x, adPos.y);

      // Contacto físico
      if (dist <= playerRadius + ad.radius + 0.45) {
        const isRamming = this.player.isSprinting || this.player.getSpeed() > 11.0;
        if (isRamming && (time - ad.lastHitTime > 0.30)) {
          ad.lastHitTime = time;

          // Impulso físico de reacción usando el vector toroidal
          const angle = Math.atan2(dy, dx);
          const impactForce = { x: Math.cos(angle) * 45.0, y: Math.sin(angle) * 45.0 };
          const isLysed = ad.hit(1, impactForce);

          // Retroalimentación de salto y mordisco
          this.player.feedBounce(1.18);

          if (this.onPredationActivity) {
            this.onPredationActivity('adipocyte');
          }

          if (isLysed) {
            // Lisis celular completa: libera cascada masiva de ATP y nutrientes (>3x el coste de los 3 saltos)
            this.triggerAdipocyteLysis(ad);
            ad.dispose(this.scene, this.physicsWorld);
            this.adipocytes.splice(i, 1);

            setTimeout(() => {
              if (this.adipocytes.length < this.maxAdipocytes) {
                this.spawnRandomAdipocyte();
              }
            }, 5000);
          } else {
            // Cada golpe intermedio también desprende 1 orbe de ATP como recompensa inmediata
            const orbAngle = angle + (Math.random() - 0.5) * 1.4;
            const orb = new AtpOrb(
              this.scene,
              adPos.x + Math.cos(orbAngle) * (ad.radius + 0.6),
              adPos.y + Math.sin(orbAngle) * (ad.radius + 0.6),
              Math.cos(orbAngle) * 3.5,
              Math.sin(orbAngle) * 3.5,
              3.0
            );
            this.atpOrbs.push(orb);
          }
        }
      }
    }

    // ================= 3.5. FRACTURA DE BIO-ESTRUCTURAS ESPECIALIZADAS (CIAN, VIOLETA, VERDE, ROJO) =================
    for (let i = this.bioStructures.length - 1; i >= 0; i--) {
      const struct = this.bioStructures[i];
      struct.update(dt, time);

      let sPos = struct.body.translation();

      // Envolvente toroidal
      if (isOutsideBounds(sPos.x, sPos.y)) {
        const wrapped = wrapPosition(sPos.x, sPos.y);
        struct.body.setTranslation(wrapped, true);
        sPos = struct.body.translation();
      }

      const { dx, dy, dist } = getToroidalDelta(playerPos.x, playerPos.y, sPos.x, sPos.y);

      if (dist <= playerRadius + struct.radius + 0.45) {
        const isRamming = this.player.isSprinting || this.player.getSpeed() > 11.0;
        if (isRamming && (time - struct.lastHitTime > 0.28)) {
          struct.lastHitTime = time;

          const angle = Math.atan2(dy, dx);
          const impactForce = { x: Math.cos(angle) * 52.0, y: Math.sin(angle) * 52.0 };
          const isDestroyed = struct.hit(1, impactForce);

          this.player.feedBounce(1.20);

          if (isDestroyed) {
            const nuts = struct.breakApart(this.scene);
            this.specializedNutrients.push(...nuts);
            struct.dispose(this.scene, this.physicsWorld);
            this.bioStructures.splice(i, 1);

            if (this.onSpecializedNutrientCollected) {
              this.onSpecializedNutrientCollected(
                `💥 ¡${struct.config.name} Destruido!`,
                struct.config.radarColor
              );
            }

            setTimeout(() => {
              if (this.bioStructures.length < this.maxBioStructures) {
                this.spawnRandomBioStructure();
              }
            }, 6000);
          } else {
            // Golpe intermedio: desprende 1 nutriente especializado
            const nutAngle = angle + (Math.random() - 0.5) * 1.5;
            const singleNut = new SpecializedNutrient(
              this.scene,
              sPos.x + Math.cos(nutAngle) * (struct.radius + 0.6),
              sPos.y + Math.sin(nutAngle) * (struct.radius + 0.6),
              Math.cos(nutAngle) * 4.0,
              Math.sin(nutAngle) * 4.0,
              struct.config.nutrientType
            );
            this.specializedNutrients.push(singleNut);
          }
        }
      }
    }

    // ================= 4. RECOLECCIÓN Y CRECIMIENTO POR ORBES DE ATP =================
    // Solo se recolectan cuando la bacteria pasa físicamente por encima (sin imán)
    for (let i = this.atpOrbs.length - 1; i >= 0; i--) {
      const orb = this.atpOrbs[i];
      orb.update(dt, time);

      // Envolvente toroidal de orbes de ATP
      if (isOutsideBounds(orb.position.x, orb.position.y)) {
        const wrapped = wrapPosition(orb.position.x, orb.position.y);
        orb.position.x = wrapped.x;
        orb.position.y = wrapped.y;
      }

      if (this.player.containsPoint(orb.position.x, orb.position.y, 1.0)) {
        this.vacuoleManager.addAtp(orb.atpValue * atpBonus);
        this.player.feedBounce(1.10);

        orb.isCollected = true;
        orb.dispose(this.scene);
        this.atpOrbs.splice(i, 1);
        continue;
      }

      if (orb.life >= orb.maxLife) {
        orb.dispose(this.scene);
        this.atpOrbs.splice(i, 1);
      }
    }

    // ================= 4.5. RECOLECCIÓN DE NUTRIENTES ESPECIALIZADOS =================
    for (let i = this.specializedNutrients.length - 1; i >= 0; i--) {
      const nut = this.specializedNutrients[i];
      nut.update(dt, time);

      if (isOutsideBounds(nut.position.x, nut.position.y)) {
        const wrapped = wrapPosition(nut.position.x, nut.position.y);
        nut.position.x = wrapped.x;
        nut.position.y = wrapped.y;
      }

      if (this.player.containsPoint(nut.position.x, nut.position.y, 1.15)) {
        if (nut.type === SpecializedNutrientType.CALCIUM_SHARD) {
          this.vacuoleManager.rechargeShield(18);
          this.vacuoleManager.addAtp(4 * atpBonus);
          this.player.triggerShieldPulse(this.scene);
          if (this.onSpecializedNutrientCollected) {
            this.onSpecializedNutrientCollected('+18 Escudo (Calcio) 🛡️', '#38bdf8');
          }
        } else if (nut.type === SpecializedNutrientType.PEPTIDE_PEARL) {
          this.vacuoleManager.healMembrane(16);
          this.player.feedBounce(1.22);
          this.player.triggerHealPulse(this.scene);
          if (this.onSpecializedNutrientCollected) {
            this.onSpecializedNutrientCollected('+16 HP & Vitalidad 🌱', '#e879f9');
          }
        } else if (nut.type === SpecializedNutrientType.ENDOSPORE) {
          this.vacuoleManager.addAtp(8 * atpBonus);
          this.player.applySpeedBuff(5.0, 1.30);
          this.player.feedBounce(1.25);
          if (this.onSpecializedNutrientCollected) {
            this.onSpecializedNutrientCollected('⚡ Sobrecarga (+30% Vel) 🟢', '#34d399');
          }
        } else if (nut.type === SpecializedNutrientType.MITO_COMPLEX) {
          this.vacuoleManager.addAtp(35 * atpBonus);
          this.vacuoleManager.healMembrane(20);
          this.player.feedBounce(1.35);
          if (this.onSpecializedNutrientCollected) {
            this.onSpecializedNutrientCollected('🔥 Megacarga Mitocondrial (+35 ATP) 🔴', '#fb7185');
          }
        }

        nut.isCollected = true;
        nut.dispose(this.scene);
        this.specializedNutrients.splice(i, 1);
        continue;
      }

      if (nut.life >= nut.maxLife) {
        nut.dispose(this.scene);
        this.specializedNutrients.splice(i, 1);
      }
    }
  }

  private triggerAdipocyteLysis(ad: Adipocyte): void {
    const pos = ad.body.translation();
    // 8 Orbes de ATP concentradas (3.5 ATP cada una = 28 ATP)
    const countOrbs = 8;
    for (let i = 0; i < countOrbs; i++) {
      const angle = (i / countOrbs) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 3.0 + Math.random() * 4.5;
      const orb = new AtpOrb(
        this.scene,
        pos.x,
        pos.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        3.5
      );
      this.atpOrbs.push(orb);
    }

    // 4 Gránulos de Nutrientes expulsados al lisar la reserva lipídica (+4 ATP y +0.12 masa cada uno)
    for (let j = 0; j < 4; j++) {
      const angle = (j / 4) * Math.PI * 2 + Math.PI / 4;
      const dist = ad.radius * 0.8 + Math.random() * 0.6;
      this.spawnNutrient(pos.x + Math.cos(angle) * dist, pos.y + Math.sin(angle) * dist);
    }
  }

  private spawnAtpLeak(amount: number): void {
    const pos = this.player.body.translation();
    const count = Math.min(amount, 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 3.5;
      const orb = new AtpOrb(
        this.scene,
        pos.x + Math.cos(angle) * 1.5,
        pos.y + Math.sin(angle) * 1.5,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.max(1, Math.round(amount / count))
      );
      this.atpOrbs.push(orb);
    }
  }
}
