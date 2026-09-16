import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import { Player } from '../entities/Player';
import { VacuoleManager } from './VacuoleManager';
import { MutationTree, BacteriaSpecies } from '../data/MutationTree';

export class EvolutionSystem {
  private physicsWorld: PhysicsWorld;
  private scene: THREE.Scene;
  private player: Player;
  public vacuoleManager: VacuoleManager;

  public isMitosisActive = false;
  private mitosisTimer = 0;
  private daughterCell?: THREE.Group;

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
  }

  /**
   * Verifica si la bacteria ha alcanzado la meta de puntos / capacidad de vacuola (100% de ATP)
   */
  public canMitosis(): boolean {
    return this.vacuoleManager.atp >= this.vacuoleManager.atpCapacity;
  }

  /**
   * Ejecuta la secuencia de Mitosis Celular hacia una nueva especie
   */
  public evolve(targetSpecies: BacteriaSpecies): boolean {
    if (this.isMitosisActive) return false;
    if (!this.canMitosis()) return false;

    this.isMitosisActive = true;
    this.mitosisTimer = 1.2; // Duración de la animación de bipartición

    // 1. Clonar visualmente a la bacteria para representar la célula hija que se separa
    const daughter = this.player.group.clone();
    daughter.position.copy(this.player.group.position);
    this.scene.add(daughter);
    this.daughterCell = daughter;

    // 2. Transformar la bacteria del jugador a la nueva especie en Rapier2D y Three.js
    this.player.setSpecies(targetSpecies, this.physicsWorld);

    // 3. Ajustar estadísticas del VacuoleManager para el nuevo Tier
    this.vacuoleManager.maxMembraneIntegrity = targetSpecies.hp;
    this.vacuoleManager.membraneIntegrity = targetSpecies.hp;
    this.vacuoleManager.maxOsmoticPressure = targetSpecies.shield;
    this.vacuoleManager.osmoticPressure = targetSpecies.shield;
    this.vacuoleManager.atp = 0; // El ATP se consume completamente en la mitosis
    this.vacuoleManager.atpCapacity = targetSpecies.vacuoleCapacity;
    this.vacuoleManager.notifyStats();

    // 4. Reaplicar Bio-Mejoras sobre las nuevas estadísticas base
    this.player.applyUpgrades(this.vacuoleManager.upgrades);
    return true;
  }

  public update(dt: number): void {
    if (!this.isMitosisActive) return;

    this.mitosisTimer -= dt;

    if (this.daughterCell) {
      // La célula hija se impulsa en dirección opuesta y se desvanece
      const angle = this.player.body.rotation() + Math.PI;
      this.daughterCell.position.x += Math.cos(angle) * dt * 8.0;
      this.daughterCell.position.y += Math.sin(angle) * dt * 8.0;
      const progress = Math.max(0, this.mitosisTimer / 1.2);
      this.daughterCell.scale.set(progress, progress, progress);

      if (this.mitosisTimer <= 0) {
        this.scene.remove(this.daughterCell);
        this.daughterCell = undefined;
        this.isMitosisActive = false;
      }
    }
  }

  public getAvailableEvolutions(): BacteriaSpecies[] {
    return MutationTree.getAvailableEvolutions(this.player.currentSpecies.id);
  }
}
