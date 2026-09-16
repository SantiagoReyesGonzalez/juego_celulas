import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import { Player } from '../entities/Player';
import { NeutrophilCell } from '../entities/NeutrophilCell';
import { MacrophageBoss } from '../entities/MacrophageBoss';
import { VacuoleManager } from './VacuoleManager';
import { AtpOrb } from '../entities/Resources';
import { WORLD_BOUNDS, getToroidalDelta, wrapPosition } from '../physics/WorldTopology';

export interface ThreatTelemetry {
  inflammation: number;
  alertLevel: 'CALM' | 'ALERT' | 'CRITICAL';
  activeNeutrophils: number;
  bossActive: boolean;
}

export class ThreatDirector {
  private physicsWorld: PhysicsWorld;
  private scene: THREE.Scene;

  public globalInflammation = 0.05; // 0.0 a 1.0 (0% a 100%)
  public neutrophils: NeutrophilCell[] = [];
  public macrophage: MacrophageBoss | null = null;

  private spawnCooldown = 3.0;
  private decayRate = 0.007; // Decaimiento pasivo por segundo
  private worldBounds = WORLD_BOUNDS;

  private bossSpawnThreshold = 0.75;
  private lastAlertNotified: 'CALM' | 'ALERT' | 'CRITICAL' = 'CALM';

  // Callbacks de eventos
  public onThreatChanged?: (telemetry: ThreatTelemetry) => void;
  public onWarningAlert?: (title: string, message: string, level: 'info' | 'warn' | 'danger') => void;

  constructor(physicsWorld: PhysicsWorld, scene: THREE.Scene) {
    this.physicsWorld = physicsWorld;
    this.scene = scene;

    // Generar patrulla inicial mínima de neutrófilos
    this.spawnNeutrophil(25, 15);
    this.spawnNeutrophil(-25, -20);
  }

  public addInflammation(amount: number): void {
    this.globalInflammation = Math.min(1.0, this.globalInflammation + amount);
    this.checkAlertThresholds();
    this.notifyThreat();
  }

  public getAlertLevel(): 'CALM' | 'ALERT' | 'CRITICAL' {
    if (this.globalInflammation >= this.bossSpawnThreshold) return 'CRITICAL';
    if (this.globalInflammation >= 0.32) return 'ALERT';
    return 'CALM';
  }

  private checkAlertThresholds(): void {
    const current = this.getAlertLevel();
    if (current !== this.lastAlertNotified) {
      this.lastAlertNotified = current;
      if (current === 'ALERT') {
        if (this.onWarningAlert) {
          this.onWarningAlert(
            '¡RESPUESTA INMUNOLÓGICA ACTIVADA!',
            'Los neutrófilos han detectado tu rastro químico por quimiotaxis.',
            'warn'
          );
        }
      } else if (current === 'CRITICAL') {
        if (this.onWarningAlert) {
          this.onWarningAlert(
            '¡TORMENTA DE CITOQUINAS!',
            'Un Macrófago Titán ha sido desplegado para erradicar la infección tisular.',
            'danger'
          );
        }
      }
    }
  }

  public spawnNeutrophil(preferredX?: number, preferredY?: number): void {
    let x =
      preferredX ??
      Math.random() * (this.worldBounds.maxX - this.worldBounds.minX) + this.worldBounds.minX;
    let y =
      preferredY ??
      Math.random() * (this.worldBounds.maxY - this.worldBounds.minY) + this.worldBounds.minY;

    const wrapped = wrapPosition(x, y);
    const cell = new NeutrophilCell(this.physicsWorld, this.scene, wrapped.x, wrapped.y);
    this.neutrophils.push(cell);
  }

  public spawnMacrophage(playerPos: { x: number; y: number }): void {
    if (this.macrophage) return;

    // Aparece a una distancia prudencial en la dirección del flujo
    const angle = Math.random() * Math.PI * 2;
    const dist = 32.0;
    const wrapped = wrapPosition(playerPos.x + Math.cos(angle) * dist, playerPos.y + Math.sin(angle) * dist);

    this.macrophage = new MacrophageBoss(this.physicsWorld, this.scene, wrapped.x, wrapped.y);
  }

  /**
   * Ciclo de actualización de combate, IA y depredación celular bidireccional
   */
  public update(
    dt: number,
    time: number,
    player: Player,
    vacuoleManager: VacuoleManager,
    atpList: AtpOrb[],
    onPopup?: (text: string, x: number, y: number, color?: string) => void,
    isPlayerInSanctuary = false
  ): void {
    // 1. Decaimiento pasivo de inflamación si la bacteria no causa estragos
    this.globalInflammation = Math.max(0.02, this.globalInflammation - this.decayRate * dt);

    const playerBody = player.body;
    const playerPos = playerBody.translation();
    const playerMass = player.currentMass;
    const playerRadius = player.baseRadius * player.currentScale;

    // 2. Control dinámico de población de neutrófilos según inflamación
    this.spawnCooldown -= dt;
    const targetNeutrophils = Math.round(2 + this.globalInflammation * 5); // 2 a 7 neutrófilos
    if (this.spawnCooldown <= 0 && this.neutrophils.length < targetNeutrophils) {
      // Spawn en el borde exterior del jugador
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = 28.0 + Math.random() * 10.0;
      this.spawnNeutrophil(playerPos.x + Math.cos(angle) * spawnDist, playerPos.y + Math.sin(angle) * spawnDist);
      this.spawnCooldown = 4.5 - this.globalInflammation * 2.0;
    }

    // 3. Despliegue de Macrófago Titán en Alerta Crítica (> 75%)
    if (this.globalInflammation >= this.bossSpawnThreshold && !this.macrophage) {
      this.spawnMacrophage(playerPos);
    }

    // 4. Actualización e Interacción de Neutrófilos
    for (let i = this.neutrophils.length - 1; i >= 0; i--) {
      const neutro = this.neutrophils[i];
      if (neutro.isDead) {
        this.neutrophils.splice(i, 1);
        continue;
      }

      // IA y física
      neutro.updateAI(dt, playerPos, playerMass, this.globalInflammation);
      neutro.visualUpdate(dt, time);

      // Detección de contacto con el cuerpo bacteriano (topología toroidal)
      const nPos = neutro.body.translation();
      const { dist } = getToroidalDelta(nPos.x, nPos.y, playerPos.x, playerPos.y);
      const touchDist = playerRadius + neutro.radius;

      if (dist <= touchDist + 0.45) {
        // DINÁMICA BIDIRECCIONAL BASADA EN MASA Y SPRINT
        const isSprinting = player.isSprinting || player.getSpeed() > 10.0;
        const canEatNeutrophil = playerMass >= neutro.mass * 1.05 || isSprinting;

        if (canEatNeutrophil) {
          // La bacteria es un depredador más grande: LISA Y ASIMILA AL NEUTRÓFILO
          neutro.burstLysis(this.physicsWorld, this.scene, atpList);
          this.neutrophils.splice(i, 1);

          player.grow(1.35); // Ganancia masiva de biomasa
          player.feedBounce(1.22);
          this.addInflammation(-0.04); // Erradicar el leucocito apacigua el tejido local

          if (onPopup) {
            onPopup('+1.35 µg (Leucocito Lisado)', nPos.x, nPos.y, '#38bdf8');
          }
        } else if (!isPlayerInSanctuary) {
          // El neutrófilo ataca / erosiona la membrana solo si la bacteria está fuera del nido
          const damage = 14.0 * dt;
          vacuoleManager.takeDamage(damage, 'Fagocitosis por Leucocito Neutrófilo');

          // Ralentización por moco/redes adhesivas (NETs)
          const pVel = playerBody.linvel();
          playerBody.applyImpulse({ x: -pVel.x * 2.0 * dt, y: -pVel.y * 2.0 * dt }, true);

          // Daño mutuo si la bacteria también forcejea
          neutro.takeDamage(18.0 * dt);
          if (neutro.isDead) {
            neutro.burstLysis(this.physicsWorld, this.scene, atpList);
            this.neutrophils.splice(i, 1);
          }
        }
      }
    }

    // 5. Actualización e Interacción con el Macrófago Titán
    if (this.macrophage) {
      if (this.macrophage.isDead) {
        this.macrophage = null;
      } else {
        this.macrophage.update(dt, time, playerPos);

        const mPos = this.macrophage.body.translation();
        const { dist } = getToroidalDelta(mPos.x, mPos.y, playerPos.x, playerPos.y);
        const touchDist = playerRadius + this.macrophage.radius;

        if (dist < touchDist) {
          const isSprinting = player.getSpeed() > 14.0;
          const canDamageBoss = playerMass >= this.macrophage.mass * 0.95 || isSprinting;

          if (canDamageBoss) {
            // La bacteria evolucionada puede erosionar al macrófago
            const dmg = (isSprinting ? 65.0 : 35.0) * dt;
            const killed = this.macrophage.takeDamage(dmg);
            if (killed) {
              this.macrophage.burstLysis(this.physicsWorld, this.scene, atpList);
              this.macrophage = null;
              player.grow(4.2);
              player.feedBounce(1.35);
              this.globalInflammation = 0.25; // Gran victoria inmunológica

              if (onPopup) {
                onPopup('¡MACRÓFAGO TITÁN ASIMILADO! (+4.20 µg)', mPos.x, mPos.y, '#f43f5e');
              }
            }
          } else if (!isPlayerInSanctuary) {
            // El macrófago causa daño severo por fagocitosis solo fuera del nido
            vacuoleManager.takeDamage(28.0 * dt, 'Ataque Letal de Macrófago Titán');
          }
        }
      }
    }

    this.notifyThreat();
  }

  private notifyThreat(): void {
    if (this.onThreatChanged) {
      this.onThreatChanged({
        inflammation: this.globalInflammation,
        alertLevel: this.getAlertLevel(),
        activeNeutrophils: this.neutrophils.length,
        bossActive: this.macrophage !== null,
      });
    }
  }

  public dispose(): void {
    this.neutrophils.forEach((n) => n.dispose(this.physicsWorld, this.scene));
    this.neutrophils = [];
    if (this.macrophage) {
      this.macrophage.dispose(this.physicsWorld, this.scene);
      this.macrophage = null;
    }
  }
}
