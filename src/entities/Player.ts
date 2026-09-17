import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { HydrodynamicsSystem, Morphology, HydrodynamicProperties } from '../systems/HydrodynamicsSystem';
import { BacteriaSpecies, SPECIES_CATALOG, CellMorphology, CellRole } from '../data/MutationTree';
import { OrganelleSocket, OrganelleFactory, OrganelleType, InternalOrganelleCluster } from './Organelles';
import { VacuoleManager } from '../systems/VacuoleManager';
import { createMembraneShaderMaterial } from '../shaders/MembraneShader';
import { getToroidalDelta } from '../physics/WorldTopology';

export class Player {
  // Especie y Taxonomía Actual
  public currentSpecies: BacteriaSpecies;
  public sockets: OrganelleSocket[] = [];
  public membraneMaterial?: THREE.MeshStandardMaterial;

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

  // Visuales Three.js, Orgánulos Internos y Flagelos
  public group: THREE.Group;
  private flagellaMeshes: THREE.Object3D[] = [];
  private internalOrganelles?: InternalOrganelleCluster;
  private ciliaMesh?: THREE.LineSegments;

  // Parámetros de Rendimiento Celular
  public thrustForce = 45.0;
  public brakeForce = 28.0;
  public rotationSpeed = 9.0;
  public targetAngle = 0;

  // Mecánica de Sprint Celular de Caza (Dash / Jet)
  public sprintForce = 85.0;
  public sprintAtpCost = 2.0;
  private lastSprintTime = 0;
  private sprintCooldown = 0.45; // Segundos entre impulsos
  private sprintStretch = 1.0;
  public isSprinting = false;

  // Estado de Controles
  public isThrusting = false;
  public isBraking = false;
  public isSprintRequested = false;
  public isControlsLocked = false;
  public mouseWorld = new THREE.Vector2(0, 0);

  // Buffs Biológicos Temporales (Sobrecarga de Endosporas)
  public speedBuffTimer = 0;
  public speedBuffMultiplier = 1.0;

  public applySpeedBuff(duration = 5.0, multiplier = 1.30): void {
    this.speedBuffTimer = Math.max(this.speedBuffTimer, duration);
    this.speedBuffMultiplier = multiplier;
    this.feedBounce(1.25);
  }

  // Ciclo de Vida y Muerte Celular
  public isDead = false;
  public invulnerabilityTimer = 0;

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
    if (this.internalOrganelles) {
      this.internalOrganelles.dispose();
      this.internalOrganelles = undefined;
    }

    // 1. Membrana translúcida gelatinosa con deformación Simplex 3D y Fresnel confocal
    this.membraneMaterial = createMembraneShaderMaterial(
      species.color,
      species.emissive,
      0.38, // Centro translúcido para visibilidad de orgánulos internos
      0.96  // Borde confocal hiperbrillante
    );
    const membraneMat = this.membraneMaterial;

    switch (species.morphology) {
      case CellMorphology.COCCUS: {
        const geo = new THREE.SphereGeometry(radius, 28, 28);
        const mesh = new THREE.Mesh(geo, membraneMat);
        this.group.add(mesh);
        break;
      }

      case CellMorphology.DIPLOCOCCUS: {
        const r1 = radius * 0.95;
        const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(r1, 22, 22), membraneMat);
        sphere1.position.set(0.6, 0, 0);
        const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(r1, 22, 22), membraneMat);
        sphere2.position.set(-0.6, 0, 0);
        this.group.add(sphere1);
        this.group.add(sphere2);
        break;
      }

      case CellMorphology.STREPTOCOCCUS: {
        const rS = radius * 0.85;
        const offsets = [-0.95, 0, 0.95];
        offsets.forEach((ox) => {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(rS, 20, 20), membraneMat);
          sphere.position.set(ox, 0, 0);
          this.group.add(sphere);
        });
        break;
      }

      case CellMorphology.BACILLUS:
      default: {
        const capGeo = new THREE.CapsuleGeometry(radius, length * 0.8, 18, 26);
        const mesh = new THREE.Mesh(capGeo, membraneMat);
        mesh.rotation.z = Math.PI / 2;
        this.group.add(mesh);
        break;
      }
    }

    // 2. Clúster de Orgánulos Internos Bioluminiscentes (Macronúcleo y Vacuolas aditivas)
    this.internalOrganelles = new InternalOrganelleCluster(
      this.group,
      radius,
      species.color,
      species.emissive,
      4 // 1 Macronúcleo + 3 Vacuolas/Mitocondrias
    );

    // 3. Corona perimetral de micro-cilios radiantes
    this.ciliaMesh = OrganelleFactory.createCiliaFringe(radius, length, species.morphology, species.color);
    this.group.add(this.ciliaMesh);

    // Si es una Super Macro Célula (Tier 5 Titán), añadir halo corona bioluminiscente
    if (species.role === CellRole.APEX_TITAN) {
      const haloGeo = new THREE.RingGeometry(radius * 1.55, radius * 1.75, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: species.color,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.set(0, 0, -0.1);
      this.group.add(haloMesh);
    }

    // 4. Sockets Modulares y Flagelos Físicos Verlet con Gradiente Cromático
    this.sockets = OrganelleFactory.generateSocketsForSpecies(
      species.sockets,
      radius,
      length,
      species.morphology
    );

    const FLAGELLA_PALETTE = [0x00f0ff, 0xf59e0b, 0x10b981, 0xc084fc, 0xec4899];
    let flagellumIdx = 0;

    this.sockets.forEach((socket) => {
      let organelleColor = species.color;
      if (socket.equippedOrganelle === OrganelleType.FLAGELLUM) {
        organelleColor = FLAGELLA_PALETTE[flagellumIdx % FLAGELLA_PALETTE.length];
        flagellumIdx++;

        // Flagelo orgánico animado exclusivamente con Math.sin sobre vértices existentes
        const flagellumMesh = OrganelleFactory.createFlagellumMesh(
          organelleColor,
          flagellumIdx * 0.85
        );
        flagellumMesh.position.set(socket.offset.x, socket.offset.y, 0);
        flagellumMesh.rotation.z = socket.angle;
        this.group.add(flagellumMesh);
        this.flagellaMeshes.push(flagellumMesh);
        socket.mesh = flagellumMesh;
      } else {
        const organelleMesh = OrganelleFactory.createMesh(socket.equippedOrganelle, organelleColor);
        organelleMesh.position.set(socket.offset.x, socket.offset.y, 0);
        organelleMesh.rotation.z = socket.angle;
        this.group.add(organelleMesh);
        socket.mesh = organelleMesh;
      }
    });
  }

  private setupInputs(): void {
    window.addEventListener('keydown', (e) => {
      if (this.isControlsLocked) return;
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
      // Ignorar clics sobre modales, botones, HUD y cualquier elemento de interfaz
      const target = e.target as HTMLElement | null;
      if (target && target.tagName !== 'CANVAS') {
        return;
      }
      if (this.isControlsLocked) return;
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
   * Sincroniza el tamaño y la escala física de la célula directamente con su cantidad de vida (Salud / HP).
   * Al tener más vida (por curación, regeneración pasiva, mejoras de membrana o evolución de Tier),
   * la célula crece visiblemente; al recibir daño y perder vida, disminuye su volumen de forma reactiva.
   */
  public syncSizeWithHealth(currentHp: number, _maxHp?: number): void {
    const hp = Math.max(1, currentHp);
    const hpRatio = hp / 100.0; // 100 HP como referencia canónica (escala 1.0)

    // Escala continua directamente vinculada a la cantidad de vida
    this.targetScale = Math.max(0.65, Math.min(3.6, Math.pow(hpRatio, 0.42)));

    // Masa física inercial en Rapier2D proporcional a la vida
    this.currentMass = this.baseMass * Math.max(0.6, Math.pow(hpRatio, 0.55));
    this.body.setAdditionalMass(this.currentMass * 2.0, true);
  }

  /**
   * Método de compatibilidad: pulso elástico de absorción
   */
  public grow(_amount = 1.0): void {
    this.feedPulse = 1.15; // Pulso elástico inmediato al absorber
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
   * Ejecuta el Sprint Celular de Caza (Dash / Jet) gastando ATP y disminuyendo tamaño
   */
  public triggerSprint(vacuoleManager: VacuoleManager, timeNow: number): boolean {
    if (this.isControlsLocked) return false;
    if (timeNow - this.lastSprintTime < this.sprintCooldown) return false;
    if (vacuoleManager.atp < this.sprintAtpCost) return false;

    // Deducir ATP de forma reactiva con notificación visual en el HUD
    const success = vacuoleManager.spendAtp(this.sprintAtpCost, 'Sprint!');
    if (!success) return false;

    this.lastSprintTime = timeNow;
    this.isSprinting = true;

    // Contracción elástica reactiva inmediata visible al acelerar
    this.feedPulse = 0.92;

    // Vector de empuje frontal instantáneo
    const currentRot = this.body.rotation();
    const fx = Math.cos(currentRot) * this.sprintForce;
    const fy = Math.sin(currentRot) * this.sprintForce;
    this.body.applyImpulse({ x: fx, y: fy }, true);

    // Deformación elástica de membrana por inercia
    this.sprintStretch = 1.35;
    return true;
  }

  public physicsUpdate(
    fixedDt: number,
    hydro: HydrodynamicsSystem,
    vacuoleManager: VacuoleManager
  ): void {
    if (this.isDead) return;

    const pos = this.body.translation();
    const currentRot = this.body.rotation();

    if (this.isControlsLocked) {
      this.isThrusting = false;
      this.isSprintRequested = false;
      this.isBraking = false;
    }

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

    // Actualización de buff de velocidad
    if (this.speedBuffTimer > 0) {
      this.speedBuffTimer = Math.max(0, this.speedBuffTimer - fixedDt);
      if (this.speedBuffTimer === 0) {
        this.speedBuffMultiplier = 1.0;
      }
    }

    // 2. Propulsión Frontal Continua (Flagelar)
    if (this.isThrusting) {
      const currentThrust = this.thrustForce * this.speedBuffMultiplier;
      const fx = forwardX * currentThrust * fixedDt;
      const fy = forwardY * currentThrust * fixedDt;
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
    this.isSprinting = (now - this.lastSprintTime < 0.5);
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
    const baseSprint = 70.0 + this.currentSpecies.mass * 15.0;
    this.sprintForce = baseSprint * (1.0 + sprintLevel * 0.2);
    this.sprintAtpCost = Math.max(1.0, 2.5 - sprintLevel * 0.3);
  }

  public visualUpdate(dt: number, time: number): void {
    if (this.isDead) return;

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

    // Resplandor bioluminiscente de membrana reactivo a la alimentación
    if (this.membraneMaterial) {
      const targetEmissive = 0.90 + (this.feedPulse - 1.0) * 1.8;
      this.membraneMaterial.emissiveIntensity +=
        (targetEmissive - this.membraneMaterial.emissiveIntensity) * Math.min(dt * 6.0, 1.0);
    }

    // Ondulación hidrodinámica de los flagelos y física de orgánulos
    const vel = this.body.linvel();
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);

    // Actualización de orgánulos citoplasmáticos con inercia viscoelástica
    if (this.internalOrganelles) {
      const cosR = Math.cos(-rot);
      const sinR = Math.sin(-rot);
      const localVx = vel.x * cosR - vel.y * sinR;
      const localVy = vel.x * sinR + vel.y * cosR;
      this.internalOrganelles.update(dt, time, { x: localVx, y: localVy });
    }

    // Ondulación fluida de flagelos sobre vértices existentes con Math.sin puro
    OrganelleFactory.animateFlagella(this.flagellaMeshes, time, speed, this.isThrusting);

    // Ondulación de los micro-cilios perimetrales (estilo Imagen 01)
    if (this.ciliaMesh) {
      OrganelleFactory.animateCilia(this.ciliaMesh, time);
    }

    // Parpadeo de invulnerabilidad post-reaparición
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - dt);
      const blink = Math.floor(time * 14.0) % 2 === 0;
      this.group.visible = blink;
    } else if (!this.isDead) {
      this.group.visible = true;
    }
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
    const { dx, dy } = getToroidalDelta(pos.x, pos.y, x, y);

    if (this.currentSpecies.morphology === CellMorphology.COCCUS) {
      return (dx * dx + dy * dy) <= (radius * radius);
    }

    // Para morfologías alargadas (Bacilo, Diplococo, etc.): distancia al eje longitudinal
    const rot = this.body.rotation();
    const halfLen = (this.baseLength * 0.4) * this.currentScale;
    const dirX = Math.cos(rot);
    const dirY = Math.sin(rot);

    const px = dx;
    const py = dy;

    const proj = Math.max(-halfLen, Math.min(halfLen, px * dirX + py * dirY));
    const closestX = dirX * proj;
    const closestY = dirY * proj;

    const distX = px - closestX;
    const distY = py - closestY;

    return (distX * distX + distY * distY) <= (radius * radius);
  }

  /**
   * Ejecuta la animación y partículas de lisis celular al morir la bacteria
   */
  public triggerLysis(scene: THREE.Scene, onComplete?: () => void): void {
    if (this.isDead) return;
    this.isDead = true;
    this.isControlsLocked = true;
    this.isThrusting = false;
    this.isBraking = false;
    this.isSprintRequested = false;

    this.body.setLinvel({ x: 0, y: 0 }, true);
    this.body.setAngvel(0, true);

    const pos = this.body.translation();
    const count = 35;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: Array<{ vx: number; vy: number }> = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = 0.2;

      const ang = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 9.0;
      velocities.push({
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 0.75,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);
    this.group.visible = false;

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.03;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        const px = posAttr.getX(i) + velocities[i].vx * 0.03;
        const py = posAttr.getY(i) + velocities[i].vy * 0.03;
        posAttr.setXY(i, px, py);
      }
      posAttr.needsUpdate = true;
      mat.opacity = Math.max(0, 1.0 - elapsed / 1.0);

      if (elapsed >= 1.0) {
        clearInterval(interval);
        scene.remove(particles);
        geo.dispose();
        mat.dispose();
        if (onComplete) onComplete();
      }
    }, 30);
  }

  public respawn(x = 0, y = 0): void {
    this.isDead = false;
    this.group.visible = true;
    this.isControlsLocked = false;
    this.invulnerabilityTimer = 3.0; // 3 segundos de invulnerabilidad

    this.body.setTranslation({ x, y }, true);
    this.body.setLinvel({ x: 0, y: 0 }, true);
    this.group.position.set(x, y, 0);

    this.currentMass = this.baseMass;
    this.currentScale = 1.0;
    this.targetScale = 1.0;
  }

  /**
   * Pulso visual y partículas esmeralda al activar Bio-Reparación de Emergencia
   */
  public triggerHealPulse(scene: THREE.Scene): void {
    this.feedPulse = 1.28;
    const pos = this.body.translation();
    const count = 20;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: Array<{ vx: number; vy: number }> = [];

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const startDist = this.baseRadius * this.currentScale + 0.4 + Math.random() * 1.5;
      positions[i * 3] = pos.x + Math.cos(ang) * startDist;
      positions[i * 3 + 1] = pos.y + Math.sin(ang) * startDist;
      positions[i * 3 + 2] = 0.3;

      const speed = 2.5 + Math.random() * 3.5;
      velocities.push({
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x10b981,
      size: 0.65,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.03;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        const px = posAttr.getX(i) + velocities[i].vx * 0.03;
        const py = posAttr.getY(i) + velocities[i].vy * 0.03;
        posAttr.setXY(i, px, py);
      }
      posAttr.needsUpdate = true;
      mat.opacity = Math.max(0, 1.0 - elapsed / 0.6);

      if (elapsed >= 0.6) {
        clearInterval(interval);
        scene.remove(particles);
        geo.dispose();
        mat.dispose();
      }
    }, 30);
  }

  /**
   * Resplandor y onda cian al sobrecargar la turgencia osmótica
   */
  public triggerShieldPulse(scene: THREE.Scene): void {
    this.sprintStretch = 1.25;
    const pos = this.body.translation();
    const count = 16;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: Array<{ vx: number; vy: number }> = [];

    for (let i = 0; i < count; i++) {
      const ang = (i * Math.PI * 2) / count;
      const startDist = this.baseRadius * this.currentScale * 1.1;
      positions[i * 3] = pos.x + Math.cos(ang) * startDist;
      positions[i * 3 + 1] = pos.y + Math.sin(ang) * startDist;
      positions[i * 3 + 2] = 0.3;

      const speed = 4.0;
      velocities.push({
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.7,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.03;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        const px = posAttr.getX(i) + velocities[i].vx * 0.03;
        const py = posAttr.getY(i) + velocities[i].vy * 0.03;
        posAttr.setXY(i, px, py);
      }
      posAttr.needsUpdate = true;
      mat.opacity = Math.max(0, 1.0 - elapsed / 0.5);

      if (elapsed >= 0.5) {
        clearInterval(interval);
        scene.remove(particles);
        geo.dispose();
        mat.dispose();
      }
    }, 30);
  }
}
