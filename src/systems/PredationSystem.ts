import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import { Player } from '../entities/Player';
import { Microorganism, MicroorganismType } from '../entities/Microorganism';
import { Adipocyte, AtpOrb } from '../entities/Resources';
import { VacuoleManager } from './VacuoleManager';

export class PredationSystem {
  private physicsWorld: PhysicsWorld;
  private scene: THREE.Scene;
  private player: Player;
  private vacuoleManager: VacuoleManager;

  public microorganisms: Microorganism[] = [];
  public adipocytes: Adipocyte[] = [];
  public atpOrbs: AtpOrb[] = [];

  private maxMicroorganisms = 24;
  private maxAdipocytes = 8;
  private worldBounds = { minX: -60, maxX: 60, minY: -50, maxY: 50 };

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

    this.vacuoleManager.onAtpLeak = (amount) => {
      this.spawnAtpLeak(amount);
    };

    // Población inicial del caldo tisular
    this.populateEcosystem();
  }

  private populateEcosystem(): void {
    // 1. Células y presas vivas
    for (let i = 0; i < this.maxMicroorganisms; i++) {
      this.spawnRandomMicroorganism();
    }

    // 2. Depósitos lipídicos (Adipocitos) para digestión por contacto
    for (let i = 0; i < this.maxAdipocytes; i++) {
      this.spawnRandomAdipocyte();
    }
  }

  private spawnRandomMicroorganism(): void {
    const x = (Math.random() - 0.5) * (this.worldBounds.maxX - this.worldBounds.minX);
    const y = (Math.random() - 0.5) * (this.worldBounds.maxY - this.worldBounds.minY);

    const rand = Math.random();
    let type = MicroorganismType.TINY_COCCUS;
    if (rand < 0.25) {
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
    const playerRadius = 1.3 * this.player.currentScale;
    const playerMass = this.player.currentMass;
    const chemoLevel = this.vacuoleManager.upgrades.chemotaxis?.level || 0;
    const chemoRadius = 8.5 + chemoLevel * 2.5;

    // 1. Depredación y Fagocitosis de Microorganismos (Regla de Masa estilo Agar.io)
    for (let i = this.microorganisms.length - 1; i >= 0; i--) {
      const micro = this.microorganisms[i];
      micro.update(dt, time, playerPos, playerMass);

      const microPos = micro.body.translation();
      const dist = Math.hypot(playerPos.x - microPos.x, playerPos.y - microPos.y);

      // Contacto de membranas
      if (dist <= playerRadius + micro.radius) {
        if (playerMass >= micro.mass * 1.15) {
          // ENGULLIMIENTO / FAGOCITOSIS
          this.vacuoleManager.addAtp(micro.atpValue);
          this.player.grow(micro.mass * 0.22);

          micro.isDead = true;
          micro.dispose(this.scene, this.physicsWorld);
          this.microorganisms.splice(i, 1);

          // Reaparición en la lejanía
          setTimeout(() => {
            if (this.microorganisms.length < this.maxMicroorganisms) {
              this.spawnRandomMicroorganism();
            }
          }, 3500);
          continue;
        } else if (playerMass < micro.mass * 0.85) {
          // La otra célula es mayor: daña a la bacteria del jugador
          this.vacuoleManager.takeDamage(10);
        }
      }
    }

    // 2. Digestión por Contacto con Adipocitos
    for (let i = this.adipocytes.length - 1; i >= 0; i--) {
      const ad = this.adipocytes[i];
      ad.update(dt, time);

      const adPos = ad.body.translation();
      const dist = Math.hypot(playerPos.x - adPos.x, playerPos.y - adPos.y);

      if (dist <= playerRadius + ad.radius) {
        const speed = this.player.getSpeed();
        if (speed > 5.0) {
          // Erosión por contacto: desprende orbes de biomasa/ATP
          const damage = 1.0 + (speed - 5.0) * 0.25;
          const isLysed = ad.hit(damage);

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

    // 3. Atracción Quimiotáctica de Orbes de ATP
    for (let i = this.atpOrbs.length - 1; i >= 0; i--) {
      const orb = this.atpOrbs[i];
      orb.update(dt, time);

      const dx = playerPos.x - orb.position.x;
      const dy = playerPos.y - orb.position.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= chemoRadius) {
        orb.isAttracted = true;
        const normX = dx / (dist || 1);
        const normY = dy / (dist || 1);
        const pullSpeed = 16.0 + (chemoRadius - dist) * 2.5;
        orb.velocity.x += (normX * pullSpeed - orb.velocity.x) * Math.min(dt * 8.0, 1.0);
        orb.velocity.y += (normY * pullSpeed - orb.velocity.y) * Math.min(dt * 8.0, 1.0);
      } else {
        orb.isAttracted = false;
      }

      if (dist <= playerRadius * 0.9) {
        this.vacuoleManager.addAtp(orb.atpValue);
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
