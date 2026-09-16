import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { HydrodynamicsSystem, Morphology, HydrodynamicProperties } from '../systems/HydrodynamicsSystem';
import { BacteriaSpecies, SPECIES_CATALOG, CellMorphology } from '../data/MutationTree';
import { OrganelleSocket, OrganelleFactory, OrganelleType } from './Organelles';

export interface Projectile {
  mesh: THREE.Mesh;
  position: THREE.Vector2;
  velocity: THREE.Vector2;
  life: number;
  maxLife: number;
}

export class Player {
  // Especie y Taxonomía Actual
  public currentSpecies: BacteriaSpecies;
  public sockets: OrganelleSocket[] = [];

  // Físicas Rapier2D
  public body: RAPIER.RigidBody;
  public collider!: RAPIER.Collider;
  public hydroProps: HydrodynamicProperties;

  // Visuales Three.js
  public group: THREE.Group;
  private flagellaCurves: THREE.Line[] = [];

  // Parámetros de Rendimiento Celular
  public thrustForce = 45.0;
  public brakeForce = 28.0;
  public recoilStrength = 7.0;
  public rotationSpeed = 9.0;
  public targetAngle = 0;

  // Sistema de Proyectiles de Toxina
  public projectiles: Projectile[] = [];
  public projectilesGroup: THREE.Group;
  private lastShootTime = 0;
  public shootCooldown = 0.22;
  public projectileBaseSpeed = 28.0;

  // Estado de Controles
  public isThrusting = false;
  public isBraking = false;
  public isShooting = false;
  public mouseWorld = new THREE.Vector2(0, 0);

  constructor(physicsWorld: PhysicsWorld, scene: THREE.Scene, initialSpeciesId = 'micrococcus') {
    this.currentSpecies = SPECIES_CATALOG[initialSpeciesId] || SPECIES_CATALOG.micrococcus;

    // 1. Cuerpo físico dinámico en Rapier2D
    this.body = physicsWorld.createDynamicBody(0, 0, 0.1, 2.0);

    this.hydroProps = {
      morphology: Morphology.COCCUS,
      projectedArea: 2.5,
      terminalVelocity: 14.0,
    };

    // 2. Grupos Visuales Three.js
    this.group = new THREE.Group();
    scene.add(this.group);

    this.projectilesGroup = new THREE.Group();
    scene.add(this.projectilesGroup);

    // 3. Configuración inicial de chasis, colisionador y sockets
    this.setSpecies(this.currentSpecies, physicsWorld);

    // 4. Registro de Entradas (Teclado y Ratón)
    this.setupInputs();
  }

  /**
   * Configura o transforma la bacteria a una nueva especie (Mitosis / Mutación)
   */
  public setSpecies(species: BacteriaSpecies, physicsWorld: PhysicsWorld): void {
    this.currentSpecies = species;

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
    this.body.setAdditionalMass(species.mass * 2.2, true);
    this.thrustForce = species.acceleration * 1.8;
    this.rotationSpeed = species.turnRate * 2.5;
    this.hydroProps.terminalVelocity = species.maxSpeed;

    // 3. Reconstrucción Visual 3D del Chasis y Sockets
    this.buildSpeciesVisuals(species, bodyRadius, bodyLength);
  }

  private buildSpeciesVisuals(species: BacteriaSpecies, radius: number, length: number): void {
    // Limpiar geometrías anteriores
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    }
    this.flagellaCurves = [];

    // Material de la membrana de la especie
    const membraneMat = new THREE.MeshStandardMaterial({
      color: species.color,
      emissive: species.emissive,
      emissiveIntensity: 1.0,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
    });

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
    });

    // Malla principal según la morfología
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
        // Doble coco fusionado con surco central
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

      case CellMorphology.STREPTOCOCCUS: {
        // Cadena de 3 cocos
        const segR = radius * 0.85;
        [-1.1, 0, 1.1].forEach((offX) => {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(segR, 16, 16), membraneMat);
          sphere.position.set(offX, 0, 0);
          this.group.add(sphere);
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(segR * 0.5, 12, 12), coreMat);
        this.group.add(core);
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

    // Gotas de ATP internas
    for (let i = 0; i < 3; i++) {
      const vac = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      vac.position.set((Math.random() - 0.5) * (length * 0.5), (Math.random() - 0.5) * 0.6, 0.2);
      this.group.add(vac);
    }

    // 4. Generación y Anclaje de Sockets Modulares
    this.sockets = OrganelleFactory.generateSocketsForSpecies(species.sockets, radius, length);

    this.sockets.forEach((socket) => {
      const organelleMesh = OrganelleFactory.createMesh(socket.equippedOrganelle, 0x00ffcc);
      organelleMesh.position.set(socket.offset.x, socket.offset.y, 0);
      organelleMesh.rotation.z = socket.angle;
      this.group.add(organelleMesh);
      socket.mesh = organelleMesh;

      // Si es un flagelo, registrar para animación sinusoidal
      if (socket.equippedOrganelle === OrganelleType.FLAGELLUM) {
        organelleMesh.children.forEach((c) => {
          if (c instanceof THREE.Line) {
            this.flagellaCurves.push(c);
          }
        });
      }
    });
  }

  private setupInputs(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.isThrusting = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.isBraking = true;
      if (e.code === 'Space') this.isShooting = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.isThrusting = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.isBraking = false;
      if (e.code === 'Space') this.isShooting = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.isThrusting = true;
      if (e.button === 0) this.isShooting = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.isThrusting = false;
      if (e.button === 0) this.isShooting = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public physicsUpdate(fixedDt: number, hydro: HydrodynamicsSystem): void {
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

    // 2. Propulsión Frontal
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

    // 4. Mecánica de Disparo con Múltiples Sockets y Recoil Boost
    const now = performance.now() / 1000;
    if (this.isShooting && now - this.lastShootTime >= this.shootCooldown) {
      this.shootToxin(pos.x, pos.y, forwardX, forwardY, now);
    }

    // 5. Arrastre Hidrodinámico
    hydro.applyDrag(this.body, this.hydroProps);
    hydro.applyRotationalDrag(this.body, 2.5);
  }

  /**
   * Dispara toxinas desde todos los sockets equipados con inyector (permite fuego dual/múltiple)
   */
  private shootToxin(x: number, y: number, forwardX: number, forwardY: number, timeNow: number): void {
    this.lastShootTime = timeNow;

    // Obtener todos los sockets con inyectores de toxina
    const nozzles = this.sockets.filter((s) => s.equippedOrganelle === OrganelleType.TOXIN_INJECTOR);
    const firingPoints = nozzles.length > 0 ? nozzles : [{ offset: new THREE.Vector2(1.6, 0), angle: 0 }];

    const currentVel = this.body.linvel();
    const projectileSpeed = this.projectileBaseSpeed;
    const currentRot = this.body.rotation();
    const cosR = Math.cos(currentRot);
    const sinR = Math.sin(currentRot);

    firingPoints.forEach((socket) => {
      // Rotar offset del socket a coordenadas mundiales
      const worldOffsetX = socket.offset.x * cosR - socket.offset.y * sinR;
      const worldOffsetY = socket.offset.x * sinR + socket.offset.y * cosR;

      const spawnX = x + worldOffsetX;
      const spawnY = y + worldOffsetY;

      const shotAngle = currentRot + socket.angle;
      const shotDirX = Math.cos(shotAngle);
      const shotDirY = Math.sin(shotAngle);

      const pVelX = currentVel.x + shotDirX * projectileSpeed;
      const pVelY = currentVel.y + shotDirY * projectileSpeed;

      const pGeo = new THREE.SphereGeometry(0.3, 12, 12);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 1.8,
        roughness: 0.2,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(spawnX, spawnY, 0.2);
      this.projectilesGroup.add(pMesh);

      this.projectiles.push({
        mesh: pMesh,
        position: new THREE.Vector2(spawnX, spawnY),
        velocity: new THREE.Vector2(pVelX, pVelY),
        life: 0,
        maxLife: 1.4,
      });
    });

    // RECOIL BOOST (3ª Ley de Newton)
    const recoilX = -forwardX * this.recoilStrength;
    const recoilY = -forwardY * this.recoilStrength;
    this.body.applyImpulse({ x: recoilX, y: recoilY }, true);
  }

  public applyUpgrades(upgrades: Record<string, { level: number }>): void {
    const propLevel = upgrades.propulsion?.level || 0;
    this.thrustForce = this.currentSpecies.acceleration * 1.8 * (1.0 + propLevel * 0.15);
    this.hydroProps.terminalVelocity = this.currentSpecies.maxSpeed * (1.0 + propLevel * 0.10);

    const fireLevel = upgrades.fireRate?.level || 0;
    this.shootCooldown = 0.22 * Math.max(0.35, 1.0 - fireLevel * 0.15);

    const toxinLevel = upgrades.toxinPower?.level || 0;
    this.projectileBaseSpeed = 28.0 * (1.0 + toxinLevel * 0.12);
  }

  public visualUpdate(dt: number, time: number): void {
    const pos = this.body.translation();
    const rot = this.body.rotation();
    this.group.position.set(pos.x, pos.y, 0);
    this.group.rotation.z = rot;

    // Ondulación de los flagelos
    const vel = this.body.linvel();
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    const waveFreq = 10.0 + speed * 1.8;
    const waveAmp = this.isThrusting ? 0.35 : 0.22;

    this.flagellaCurves.forEach((flagellum, idx) => {
      const positions = flagellum.geometry.attributes.position as THREE.BufferAttribute;
      const count = positions.count;
      for (let j = 0; j < count; j++) {
        const xDist = j * 0.15;
        const wave = Math.sin(time * waveFreq - xDist * 2.5 + idx * 0.8) * (xDist * waveAmp);
        positions.setY(j, wave);
      }
      positions.needsUpdate = true;
    });

    // Actualización de proyectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.mesh.position.set(p.position.x, p.position.y, 0.2);

      const progress = p.life / p.maxLife;
      if (progress > 0.7) {
        (p.mesh.material as THREE.MeshStandardMaterial).opacity = 1.0 - (progress - 0.7) / 0.3;
        (p.mesh.material as THREE.MeshStandardMaterial).transparent = true;
      }

      if (p.life >= p.maxLife) {
        this.projectilesGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  public getSpeed(): number {
    const vel = this.body.linvel();
    return Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  }
}
