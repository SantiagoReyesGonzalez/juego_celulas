import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import { Player } from '../entities/Player';
import { Microorganism, MicroorganismType } from '../entities/Microorganism';
import { Adipocyte, AtpOrb } from '../entities/Resources';
import { VacuoleManager } from './VacuoleManager';

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
    this.mesh.position.x = this.position.x + Math.sin(time * this.floatSpeed + this.floatOffset) * 0.12;
    this.mesh.position.y = this.position.y + Math.cos(time * this.floatSpeed + this.floatOffset) * 0.12;
    this.mesh.rotation.y += dt * 2.0;
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
  public atpOrbs: AtpOrb[] = [];

  public onPredationActivity?: (type: 'pellet' | 'microorganism' | 'adipocyte') => void;

  private maxNutrients = 120;
  private maxMicroorganisms = 75;
  private maxAdipocytes = 8;
  private worldBounds = { minX: -60, maxX: 60, minY: -50, maxY: 50 };

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
      color: 0xffc107,
      emissive: 0xff9800,
      emissiveIntensity: 1.6,
      roughness: 0.15,
    });

    this.vacuoleManager.onAtpLeak = (amount) => {
      this.spawnAtpLeak(amount);
    };

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

    // 3. Depósitos lipídicos (Adipocitos) para digestión por contacto
    for (let i = 0; i < this.maxAdipocytes; i++) {
      this.spawnRandomAdipocyte();
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

  public update(dt: number, time: number): void {
    const playerPos = this.player.body.translation();
    const playerRadius = this.player.baseRadius * this.player.currentScale;
    const playerMass = this.player.currentMass;
    const chemoLevel = this.vacuoleManager.upgrades.chemotaxis?.level || 0;
    const atpBonus = 1.0 + chemoLevel * 0.2;

    // ================= 1. CONSUMO DE GRÁNULOS DE NUTRIENTES (Agar.io) =================
    // La bacteria SOLO se alimenta cuando el cuerpo celular pasa exactamente por encima (sin efecto imán)
    for (let i = this.nutrients.length - 1; i >= 0; i--) {
      const nut = this.nutrients[i];
      nut.update(dt, time);

      if (this.player.containsPoint(nut.position.x, nut.position.y, 1.0)) {
        this.vacuoleManager.addAtp(nut.atpValue * atpBonus);
        this.player.grow(nut.massGain);
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

      // Depredación al hacer contacto y pasar por encima de la presa
      if (this.player.containsPoint(microPos.x, microPos.y, 1.05)) {
        const canEngulf = (playerMass >= micro.mass * 0.98) || (this.player.isSprinting && playerMass >= micro.mass * 0.80);
        if (canEngulf) {
          // ENGULLIMIENTO / FAGOCITOSIS COMPLETA
          this.vacuoleManager.addAtp(micro.atpValue * atpBonus);
          // Aumento sustancial de biomasa
          const massGain = Math.max(0.40, micro.mass * 0.85);
          this.player.grow(massGain);
          this.player.feedBounce(1.25);

          micro.isDead = true;
          micro.dispose(this.scene, this.physicsWorld);
          this.microorganisms.splice(i, 1);

          if (this.onPredationActivity) {
            this.onPredationActivity('microorganism');
          }

          // Reaparición dinámica en la lejanía
          setTimeout(() => {
            if (this.microorganisms.length < this.maxMicroorganisms) {
              this.spawnRandomMicroorganism();
            }
          }, 1800);
          continue;
        } else if (playerMass < micro.mass * 0.75) {
          // La otra célula es notablemente mayor: daña a la bacteria del jugador
          this.vacuoleManager.takeDamage(8);
        }
      }
    }

    // ================= 3. DIGESTIÓN POR CONTACTO CON ADIPOCITOS =================
    for (let i = this.adipocytes.length - 1; i >= 0; i--) {
      const ad = this.adipocytes[i];
      ad.update(dt, time);

      const adPos = ad.body.translation();
      const dist = Math.hypot(playerPos.x - adPos.x, playerPos.y - adPos.y);

      if (dist <= playerRadius + ad.radius) {
        const speed = this.player.getSpeed();
        if (speed > 4.5) {
          // Erosión por fricción y enzimas de membrana
          const damage = 1.0 + (speed - 4.5) * 0.3;
          const isLysed = ad.hit(damage);

          if (this.onPredationActivity) {
            this.onPredationActivity('adipocyte');
          }

          // Desprender orbes al erosionar
          const count = Math.floor(1 + Math.random() * 2);
          for (let k = 0; k < count; k++) {
            const angle = Math.random() * Math.PI * 2;
            const orb = new AtpOrb(
              this.scene,
              playerPos.x + Math.cos(angle) * 1.5,
              playerPos.y + Math.sin(angle) * 1.5,
              Math.cos(angle) * 4.0,
              Math.sin(angle) * 4.0,
              5
            );
            this.atpOrbs.push(orb);
          }

          if (isLysed) {
            this.triggerAdipocyteLysis(ad);
            ad.dispose(this.scene, this.physicsWorld);
            this.adipocytes.splice(i, 1);

            setTimeout(() => {
              if (this.adipocytes.length < this.maxAdipocytes) {
                this.spawnRandomAdipocyte();
              }
            }, 8000);
          }
        }
      }
    }

    // ================= 4. RECOLECCIÓN Y CRECIMIENTO POR ORBES DE ATP =================
    // Solo se recolectan cuando la bacteria pasa físicamente por encima (sin imán)
    for (let i = this.atpOrbs.length - 1; i >= 0; i--) {
      const orb = this.atpOrbs[i];
      orb.update(dt, time);

      if (this.player.containsPoint(orb.position.x, orb.position.y, 1.0)) {
        this.vacuoleManager.addAtp(orb.atpValue * atpBonus);
        // Cada orbe nutre y acrecienta la célula
        this.player.grow(0.18);
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
  }

  private triggerAdipocyteLysis(ad: Adipocyte): void {
    const pos = ad.body.translation();
    const count = Math.floor(6 + ad.radius * 2.0);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 3.5 + Math.random() * 5.0;
      const orb = new AtpOrb(
        this.scene,
        pos.x,
        pos.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        6
      );
      this.atpOrbs.push(orb);
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
