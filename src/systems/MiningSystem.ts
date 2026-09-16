import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import { Player } from '../entities/Player';
import { Adipocyte, GlycogenGranule, AtpOrb } from '../entities/Resources';
import { VacuoleManager } from './VacuoleManager';

export class MiningSystem {
  private physicsWorld: PhysicsWorld;
  private scene: THREE.Scene;
  private player: Player;
  private vacuoleManager: VacuoleManager;

  public adipocytes: Adipocyte[] = [];
  public glycogenGranules: GlycogenGranule[] = [];
  public atpOrbs: AtpOrb[] = [];

  // Parámetros de Generación y Límites
  private maxAdipocytes = 14;
  private maxGlycogen = 30;
  private worldBounds = { minX: -55, maxX: 55, minY: -45, maxY: 45 };

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

    // Escuchar fugas de ATP para instanciar el desborde físico
    this.vacuoleManager.onAtpLeak = (lostAmount) => {
      this.spawnAtpLeak(lostAmount);
    };

    // Generación inicial del tejido orgánico
    this.generateTissue();
  }

  /**
   * Genera de forma procedural adipocitos y gránulos de glucógeno dispersos
   */
  private generateTissue(): void {
    // 1. Adipocitos elásticos (cuerpos lipídicos grandes)
    for (let i = 0; i < this.maxAdipocytes; i++) {
      this.spawnRandomAdipocyte();
    }

    // 2. Gránulos de glucógeno (carbohidratos menores)
    for (let i = 0; i < this.maxGlycogen; i++) {
      this.spawnRandomGlycogen();
    }
  }

  private spawnRandomAdipocyte(): void {
    let x = 0;
    let y = 0;
    let dist = 0;

    // Evitar que aparezcan directamente sobre el jugador (radio de seguridad = 8)
    do {
      x = (Math.random() - 0.5) * (this.worldBounds.maxX - this.worldBounds.minX);
      y = (Math.random() - 0.5) * (this.worldBounds.maxY - this.worldBounds.minY);
      const playerPos = this.player.body.translation();
      dist = Math.hypot(x - playerPos.x, y - playerPos.y);
    } while (dist < 8.0);

    const radius = 1.8 + Math.random() * 2.0;
    const adipocyte = new Adipocyte(this.physicsWorld, this.scene, x, y, radius);
    this.adipocytes.push(adipocyte);
  }

  private spawnRandomGlycogen(): void {
    const x = (Math.random() - 0.5) * (this.worldBounds.maxX - this.worldBounds.minX);
    const y = (Math.random() - 0.5) * (this.worldBounds.maxY - this.worldBounds.minY);
    const granule = new GlycogenGranule(this.scene, x, y);
    this.glycogenGranules.push(granule);
  }

  /**
   * Lógica de actualización ejecutada en cada frame
   */
  public update(dt: number, time: number): void {
    const playerPos = this.player.body.translation();
    const chemoLevel = this.vacuoleManager.upgrades.chemotaxis.level;
    const chemoRadius = 8.5 + chemoLevel * 2.5; // Radio dinámico con upgrades

    // 1. Detección de colisión entre proyectiles de toxina y adipocitos (NutrientLysis)
    this.checkProjectileCollisions();

    // 2. Actualización de Adipocitos
    for (let i = this.adipocytes.length - 1; i >= 0; i--) {
      const ad = this.adipocytes[i];
      ad.update(dt, time);

      if (ad.isLysed) {
        // Ejecutar Lisis Celular: dispersar racimo de 5 a 10 orbes de ATP
        this.triggerLysis(ad);
        ad.dispose(this.scene, this.physicsWorld);
        this.adipocytes.splice(i, 1);

        // Respawn retardado de un nuevo adipocito en la lejanía
        setTimeout(() => {
          if (this.adipocytes.length < this.maxAdipocytes) {
            this.spawnRandomAdipocyte();
          }
        }, 8000);
      }
    }

    // 3. Quimiotaxis Magnética y Absorción de Orbes de ATP
    for (let i = this.atpOrbs.length - 1; i >= 0; i--) {
      const orb = this.atpOrbs[i];
      orb.update(dt, time);

      const dx = playerPos.x - orb.position.x;
      const dy = playerPos.y - orb.position.y;
      const dist = Math.hypot(dx, dy);

      // Si entra en el radio de quimiotaxis, atraerlo magnéticamente
      if (dist <= chemoRadius) {
        orb.isAttracted = true;
        const normX = dx / (dist || 1);
        const normY = dy / (dist || 1);

        // Aceleración gravitacional/quimiotáctica inversa hacia la bacteria
        const pullSpeed = 16.0 + (chemoRadius - dist) * 2.5;
        orb.velocity.x += (normX * pullSpeed - orb.velocity.x) * Math.min(dt * 8.0, 1.0);
        orb.velocity.y += (normY * pullSpeed - orb.velocity.y) * Math.min(dt * 8.0, 1.0);
      } else {
        orb.isAttracted = false;
      }

      // Absorción por la membrana celular
      if (dist <= 1.8) {
        this.vacuoleManager.addAtp(orb.atpValue);
        orb.isCollected = true;
        orb.dispose(this.scene);
        this.atpOrbs.splice(i, 1);
        continue;
      }

      // Despawn por tiempo de vida
      if (orb.life >= orb.maxLife) {
        orb.dispose(this.scene);
        this.atpOrbs.splice(i, 1);
      }
    }

    // 4. Absorción directa de Gránulos de Glucógeno
    for (let i = this.glycogenGranules.length - 1; i >= 0; i--) {
      const g = this.glycogenGranules[i];
      g.update(dt, time);

      const dist = Math.hypot(playerPos.x - g.position.x, playerPos.y - g.position.y);
      if (dist <= 2.2) {
        this.vacuoleManager.addAtp(g.atpValue);
        g.isConsumed = true;
        g.dispose(this.scene);
        this.glycogenGranules.splice(i, 1);

        // Respawn de glucógeno
        setTimeout(() => {
          if (this.glycogenGranules.length < this.maxGlycogen) {
            this.spawnRandomGlycogen();
          }
        }, 5000);
      }
    }

    // 5. Colisión por embestida violenta del jugador contra adipocitos
    this.checkPlayerAdipocyteImpacts();
  }

  /**
   * Detecta impactos entre proyectiles de toxina de la bacteria y adipocitos
   */
  private checkProjectileCollisions(): void {
    const projectiles = this.player.projectiles;
    const powerLevel = this.vacuoleManager.upgrades.toxinPower.level;
    const damage = 1.0 + powerLevel * 0.35; // Daño escalado con bio-upgrade

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];

      for (let j = 0; j < this.adipocytes.length; j++) {
        const ad = this.adipocytes[j];
        if (ad.isLysed) continue;

        const adPos = ad.body.translation();
        const dist = Math.hypot(p.position.x - adPos.x, p.position.y - adPos.y);

        if (dist <= ad.radius + 0.35) {
          // Impacto: aplicar daño y transmitir inercia del proyectil
          const impulse = {
            x: p.velocity.x * 0.18,
            y: p.velocity.y * 0.18,
          };
          ad.hit(damage, impulse);

          // Destruir el proyectil que impactó
          this.player.projectilesGroup.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  /**
   * Ejecuta la lisis celular de un adipocito, fragmentándolo en orbes de ATP
   */
  private triggerLysis(ad: Adipocyte): void {
    const pos = ad.body.translation();
    const numOrbs = Math.floor(6 + ad.radius * 2.0); // 6 a 12 orbes de ATP según tamaño

    for (let i = 0; i < numOrbs; i++) {
      const angle = (i / numOrbs) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 4.0 + Math.random() * 6.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const orb = new AtpOrb(this.scene, pos.x, pos.y, vx, vy, 6);
      this.atpOrbs.push(orb);
    }
  }

  /**
   * Desborda orbes de ATP hacia el entorno cuando la bacteria sufre daño por ATPLeak
   */
  private spawnAtpLeak(amount: number): void {
    const pos = this.player.body.translation();
    const count = Math.min(amount, 8);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 4.0;
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

  /**
   * Si la bacteria choca a alta velocidad contra un adipocito, amortigua o sufre daño
   */
  private checkPlayerAdipocyteImpacts(): void {
    const playerPos = this.player.body.translation();
    const speed = this.player.getSpeed();

    // Solo si el choque es a alta velocidad
    if (speed < 11.0) return;

    for (let i = 0; i < this.adipocytes.length; i++) {
      const ad = this.adipocytes[i];
      if (ad.isLysed) continue;

      const adPos = ad.body.translation();
      const dist = Math.hypot(playerPos.x - adPos.x, playerPos.y - adPos.y);

      if (dist < ad.radius + 1.2) {
        // Daño de impacto proporcional al exceso de velocidad
        const damage = Math.round((speed - 10.0) * 1.8);
        this.vacuoleManager.takeDamage(damage);
        break;
      }
    }
  }
}
