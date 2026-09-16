import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { HydrodynamicsSystem, Morphology, HydrodynamicProperties } from '../systems/HydrodynamicsSystem';
import { BacteriaSpecies, SPECIES_CATALOG, CellMorphology } from '../data/MutationTree';
import { OrganelleSocket, OrganelleFactory, OrganelleType } from './Organelles';
import { VacuoleManager } from '../systems/VacuoleManager';
import { createMembraneShaderMaterial } from '../shaders/MembraneShader';

export class Player {
  // Especie y Taxonomía Actual
  public currentSpecies: BacteriaSpecies;
  public sockets: OrganelleSocket[] = [];
  public membraneMaterial?: THREE.ShaderMaterial;

  // Físicas Rapier2D
  public body: RAPIER.RigidBody;
  public collider!: RAPIER.Collider;
  public hydroProps: HydrodynamicProperties;

  // Crecimiento y Masa (Paradigma Agar.io / Spore)
  public currentMass: number;
  public baseMass: number;
  public currentScale = 1.0;
  public targetScale = 1.0;
  public baseRadius = 1.4;
  public baseLength = 1.4;
  public lastColliderScale = 1.0;
  public feedPulse = 1.0;

  // Visuales Three.js
  public group: THREE.Group;
  private flagellaMeshes: THREE.Object3D[] = [];

  // Parámetros de Rendimiento Celular
  public thrustForce = 45.0;
  public brakeForce = 28.0;
  public rotationSpeed = 9.0;
  public targetAngle = 0;

  // Mecánica de Sprint Celular de Caza (Dash / Jet)
  public sprintForce = 85.0;
  public sprintAtpCost = 5.0;
  private lastSprintTime = 0;
  private sprintCooldown = 0.45; // Segundos entre impulsos
  private sprintStretch = 1.0;

  // Estado de Controles
  public isThrusting = false;
  public isBraking = false;
  public isSprintRequested = false;
  public mouseWorld = new THREE.Vector2(0, 0);

  constructor(physicsWorld: PhysicsWorld, scene: THREE.Scene, initialSpeciesId = 'micrococcus') {
    this.currentSpecies = SPECIES_CATALOG[initialSpeciesId] || SPECIES_CATALOG.micrococcus;
    this.baseMass = this.currentSpecies.mass;
    this.currentMass = this.baseMass;

    // 1. Cuerpo físico dinámico en Rapier2D
    this.body = physicsWorld.createDynamicBody(0, 0, 0.1, 2.0);

    this.hydroProps = {
      morphology: Morphology.COCCUS,
      projectedArea: 2.5,
      terminalVelocity: 14.0,
    };

    // 2. Grupo Visual Three.js
    this.group = new THREE.Group();
    scene.add(this.group);

    // 3. Configuración inicial de especie
    this.setSpecies(this.currentSpecies, physicsWorld);

    // 4. Registro de Entradas (Teclado y Ratón)
    this.setupInputs();
  }

  /**
   * Configura o transforma la bacteria a una nueva especie (Mitosis / Mutación)
   */
  public setSpecies(species: BacteriaSpecies, physicsWorld: PhysicsWorld): void {
    this.currentSpecies = species;
    this.baseMass = species.mass;
    this.currentMass = this.baseMass;
    this.targetScale = 1.0;
    this.currentScale = 1.0;

    // 1. Reconfiguración del Colisionador Físico en Rapier2D
    if (this.collider) {
      physicsWorld.rawWorld.removeCollider(this.collider, false);
    }

    let bodyRadius = 1.3;
    let bodyLength = 2.4;

    switch (species.morphology) {
      case CellMorphology.COCCUS: {
        bodyRadius = 1.4;
        bodyLength = 1.4;
        this.collider = physicsWorld.createBallCollider(bodyRadius, this.body);
        this.hydroProps.morphology = Morphology.COCCUS;
        this.hydroProps.projectedArea = 2.4;
        break;
      }
      case CellMorphology.DIPLOCOCCUS: {
        bodyRadius = 1.2;
        bodyLength = 2.4;
        this.collider = physicsWorld.createCapsuleCollider(bodyRadius, 0.8, this.body);
        this.hydroProps.morphology = Morphology.COCCUS;
        this.hydroProps.projectedArea = 3.2;
        break;
      }
      case CellMorphology.BACILLUS: {
        bodyRadius = 1.2;
        bodyLength = 2.6;
        this.collider = physicsWorld.createCapsuleCollider(bodyRadius, 1.2, this.body);
        this.hydroProps.morphology = Morphology.BACILLUS;
        this.hydroProps.projectedArea = 2.8;
        break;
      }
      case CellMorphology.STREPTOCOCCUS: {
        bodyRadius = 1.1;
        bodyLength = 3.4;
        this.collider = physicsWorld.createCapsuleCollider(bodyRadius, 1.6, this.body);
        this.hydroProps.morphology = Morphology.COCCUS;
        this.hydroProps.projectedArea = 3.6;
        break;
      }
      case CellMorphology.VIBRIO: {
        bodyRadius = 1.1;
        bodyLength = 2.2;
        this.collider = physicsWorld.createCapsuleCollider(bodyRadius, 0.9, this.body);
        this.hydroProps.morphology = Morphology.SPIRILLUM;
        this.hydroProps.projectedArea = 2.6;
        break;
      }
      case CellMorphology.SPIRILLUM: {
        bodyRadius = 0.95;
        bodyLength = 3.0;
        this.collider = physicsWorld.createCapsuleCollider(bodyRadius, 1.4, this.body);
        this.hydroProps.morphology = Morphology.SPIRILLUM;
        this.hydroProps.projectedArea = 2.2;
        break;
      }
    }

    // 2. Parámetros Físicos de la Especie
    this.baseRadius = bodyRadius;
    this.baseLength = bodyLength;
    this.lastColliderScale = 1.0;
    this.feedPulse = 1.0;
    this.body.setAdditionalMass(this.currentMass * 2.2, true);
    this.thrustForce = species.acceleration * 1.8;
    this.rotationSpeed = species.turnRate * 2.5;
    this.hydroProps.terminalVelocity = species.maxSpeed;

    // 3. Reconstrucción Visual 3D del Chasis y Sockets
    this.buildSpeciesVisuals(species, bodyRadius, bodyLength);
  }

  private buildSpeciesVisuals(species: BacteriaSpecies, radius: number, length: number): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    }
    this.flagellaMeshes = [];

    this.membraneMaterial = createMembraneShaderMaterial(
      species.color,
      species.emissive,
      0.88
    );
    const membraneMat = this.membraneMaterial;

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
    });

    switch (species.morphology) {
      case CellMorphology.COCCUS: {
        const geo = new THREE.SphereGeometry(radius, 24, 24);
        const mesh = new THREE.Mesh(geo, membraneMat);
        this.group.add(mesh);
        const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.5, 16, 16), coreMat);
        this.group.add(core);
        break;
      }

      case CellMorphology.DIPLOCOCCUS: {
        const r1 = radius * 0.95;
        const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(r1, 20, 20), membraneMat);
        sphere1.position.set(0.6, 0, 0);
        const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(r1, 20, 20), membraneMat);
        sphere2.position.set(-0.6, 0, 0);
        this.group.add(sphere1);
        this.group.add(sphere2);

        const core1 = new THREE.Mesh(new THREE.SphereGeometry(r1 * 0.45, 12, 12), coreMat);
        core1.position.set(0.6, 0, 0);
        const core2 = new THREE.Mesh(new THREE.SphereGeometry(r1 * 0.45, 12, 12), coreMat);
        core2.position.set(-0.6, 0, 0);
        this.group.add(core1);
        this.group.add(core2);
        break;
      }

      case CellMorphology.BACILLUS:
      default: {
        const capGeo = new THREE.CapsuleGeometry(radius, length * 0.8, 16, 24);
        const mesh = new THREE.Mesh(capGeo, membraneMat);
        mesh.rotation.z = Math.PI / 2;
        this.group.add(mesh);
        const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.55, 16, 16), coreMat);
        this.group.add(core);
        break;
      }
    }

    // Vacuolas internas de nutrientes
    for (let i = 0; i < 3; i++) {
      const vac = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      vac.position.set((Math.random() - 0.5) * (length * 0.5), (Math.random() - 0.5) * 0.6, 0.2);
      this.group.add(vac);
    }

    // Sockets Modulares y Organelos
    this.sockets = OrganelleFactory.generateSocketsForSpecies(
      species.sockets,
      radius,
      length,
      species.morphology
    );

    this.sockets.forEach((socket) => {
      const organelleMesh = OrganelleFactory.createMesh(socket.equippedOrganelle, species.color);
      organelleMesh.position.set(socket.offset.x, socket.offset.y, 0);
      organelleMesh.rotation.z = socket.angle;
      this.group.add(organelleMesh);
      socket.mesh = organelleMesh;

      if (socket.equippedOrganelle === OrganelleType.FLAGELLUM) {
        this.flagellaMeshes.push(organelleMesh);
      }
    });
  }

  private setupInputs(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.isThrusting = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.isBraking = true;
      if (e.code === 'Space') this.isSprintRequested = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.isThrusting = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.isBraking = false;
      if (e.code === 'Space') this.isSprintRequested = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.isThrusting = true;
      if (e.button === 0) this.isSprintRequested = true; // Clic izquierdo = Sprint de Caza
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.isThrusting = false;
      if (e.button === 0) this.isSprintRequested = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Crecimiento por depredación y asimilación de biomasa (estilo Agar.io)
   */
  public grow(massGain: number): void {
    this.currentMass += massGain;
    // Escala continua y evidente: raíz cuadrada del ratio de masa
    const massRatio = Math.max(1.0, this.currentMass / this.baseMass);
    this.targetScale = Math.min(3.6, Math.pow(massRatio, 0.45));
    this.body.setAdditionalMass(this.currentMass * 2.0, true);
    this.feedPulse = 1.15; // Pulso elástico inmediato al engullir
  }

  public feedBounce(intensity = 1.12): void {
    this.feedPulse = intensity;
  }

  public updateColliderScale(): void {
    if (!this.collider) return;
    if (Math.abs(this.currentScale - this.lastColliderScale) < 0.03) return;
    this.lastColliderScale = this.currentScale;

    const scaledRadius = this.baseRadius * this.currentScale;
    try {
      if (this.currentSpecies.morphology === CellMorphology.COCCUS) {
        this.collider.setShape(new RAPIER.Ball(scaledRadius));
      } else {
        const scaledHalfLength = (this.baseLength * 0.4) * this.currentScale;
        this.collider.setShape(new RAPIER.Capsule(scaledHalfLength, scaledRadius));
      }
    } catch {
      // Manejo seguro ante cualquier estado transitorio de Rapier
    }
  }

  /**
   * Ejecuta el Sprint Celular de Caza (Dash / Jet) gastando ATP
   */
  public triggerSprint(vacuoleManager: VacuoleManager, timeNow: number): boolean {
    if (timeNow - this.lastSprintTime < this.sprintCooldown) return false;
    if (vacuoleManager.atp < this.sprintAtpCost) return false;

    // Deducir ATP
    vacuoleManager.atp -= this.sprintAtpCost;
    vacuoleManager.notifyStats();
    this.lastSprintTime = timeNow;

    // Vector de empuje frontal instantáneo
    const currentRot = this.body.rotation();
    const fx = Math.cos(currentRot) * this.sprintForce;
    const fy = Math.sin(currentRot) * this.sprintForce;
    this.body.applyImpulse({ x: fx, y: fy }, true);

    // Deformación elástica de membrana por inercia
    this.sprintStretch = 1.4;
    return true;
  }

  public physicsUpdate(
    fixedDt: number,
    hydro: HydrodynamicsSystem,
    vacuoleManager: VacuoleManager
  ): void {
    const pos = this.body.translation();
    const currentRot = this.body.rotation();

    // 1. Orientación hacia el cursor
    const toMouseX = this.mouseWorld.x - pos.x;
    const toMouseY = this.mouseWorld.y - pos.y;
    this.targetAngle = Math.atan2(toMouseY, toMouseX);

    let angleDiff = this.targetAngle - currentRot;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const newRot = currentRot + angleDiff * Math.min(fixedDt * this.rotationSpeed, 1.0);
    this.body.setRotation(newRot, true);

    const forwardX = Math.cos(newRot);
    const forwardY = Math.sin(newRot);

    // 2. Propulsión Frontal Continua (Flagelar)
    if (this.isThrusting) {
      const fx = forwardX * this.thrustForce * fixedDt;
      const fy = forwardY * this.thrustForce * fixedDt;
      this.body.applyImpulse({ x: fx, y: fy }, true);
    }

    // 3. Freno Activo
    if (this.isBraking) {
      const vel = this.body.linvel();
      const brakeX = -vel.x * this.brakeForce * fixedDt * 0.1;
      const brakeY = -vel.y * this.brakeForce * fixedDt * 0.1;
      this.body.applyImpulse({ x: brakeX, y: brakeY }, true);
    }

    // 4. Sprint Celular de Caza (Dash)
    const now = performance.now() / 1000;
    if (this.isSprintRequested) {
      this.triggerSprint(vacuoleManager, now);
      this.isSprintRequested = false; // Un impulso por activación
    }

    // 5. Arrastre Hidrodinámico
    hydro.applyDrag(this.body, this.hydroProps);
    hydro.applyRotationalDrag(this.body, 2.5);
  }

  public applyUpgrades(upgrades: Record<string, { level: number }>): void {
    const propLevel = upgrades.propulsion?.level || 0;
    this.thrustForce = this.currentSpecies.acceleration * 1.8 * (1.0 + propLevel * 0.15);
    this.hydroProps.terminalVelocity = this.currentSpecies.maxSpeed * (1.0 + propLevel * 0.10);

    const sprintLevel = upgrades.sprintPower?.level || 0;
    this.sprintForce = 85.0 * (1.0 + sprintLevel * 0.2);
    this.sprintAtpCost = Math.max(2.0, 5.0 - sprintLevel * 0.6);
  }

  public visualUpdate(dt: number, time: number): void {
    const pos = this.body.translation();
    const rot = this.body.rotation();
    this.group.position.set(pos.x, pos.y, 0);
    this.group.rotation.z = rot;

    // Crecimiento suave hacia la escala objetivo
    this.currentScale += (this.targetScale - this.currentScale) * Math.min(dt * 4.5, 1.0);

    // Recuperación elástica tras comer (feedPulse)
    this.feedPulse += (1.0 - this.feedPulse) * Math.min(dt * 8.0, 1.0);

    // Recuperación elástica tras sprint
    this.sprintStretch += (1.0 - this.sprintStretch) * Math.min(dt * 6.0, 1.0);

    const sx = this.currentScale * this.sprintStretch * this.feedPulse;
    const sy = this.currentScale * (2.0 - this.sprintStretch) * this.feedPulse;
    const sz = this.currentScale * this.feedPulse;

    this.group.scale.set(sx, sy, sz);
    this.updateColliderScale();

    // Actualización de Shader Orgánico de Membrana (Ruido Simplex y Fresnel)
    if (this.membraneMaterial) {
      this.membraneMaterial.uniforms.uTime.value = time;

      // Amplitud de ruido reactiva a velocidad y sprint
      const vel = this.body.linvel();
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      const targetAmp = 0.08 + Math.min(speed * 0.007, 0.12) + (this.sprintStretch - 1.0) * 0.2;
      this.membraneMaterial.uniforms.uNoiseAmp.value +=
        (targetAmp - this.membraneMaterial.uniforms.uNoiseAmp.value) * Math.min(dt * 6.0, 1.0);

      // Resplandor de fluorescencia confocal reactivo a la alimentación
      const targetFresnel = 1.8 + (this.feedPulse - 1.0) * 4.5;
      this.membraneMaterial.uniforms.uFresnelIntensity.value +=
        (targetFresnel - this.membraneMaterial.uniforms.uFresnelIntensity.value) * Math.min(dt * 6.0, 1.0);
    }

    // Ondulación hidrodinámica de los flagelos
    const vel = this.body.linvel();
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    OrganelleFactory.animateFlagella(this.flagellaMeshes, time, speed, this.isThrusting);
  }

  public getSpeed(): number {
    const vel = this.body.linvel();
    return Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  }

  /**
   * Verifica si unas coordenadas (x, y) están físicamente cubiertas por el cuerpo celular de la bacteria
   */
  public containsPoint(x: number, y: number, tolerance = 0.95): boolean {
    const pos = this.body.translation();
    const radius = this.baseRadius * this.currentScale * tolerance;

    if (this.currentSpecies.morphology === CellMorphology.COCCUS) {
      const dx = x - pos.x;
      const dy = y - pos.y;
      return (dx * dx + dy * dy) <= (radius * radius);
    }

    // Para morfologías alargadas (Bacilo, Diplococo, etc.): distancia al eje longitudinal
    const rot = this.body.rotation();
    const halfLen = (this.baseLength * 0.4) * this.currentScale;
    const dirX = Math.cos(rot);
    const dirY = Math.sin(rot);

    const px = x - pos.x;
    const py = y - pos.y;

    const proj = Math.max(-halfLen, Math.min(halfLen, px * dirX + py * dirY));
    const closestX = dirX * proj;
    const closestY = dirY * proj;

    const distX = px - closestX;
    const distY = py - closestY;

    return (distX * distX + distY * distY) <= (radius * radius);
  }
}
