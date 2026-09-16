import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { HydrodynamicsSystem, Morphology, HydrodynamicProperties } from '../systems/HydrodynamicsSystem';

export interface Projectile {
  mesh: THREE.Mesh;
  position: THREE.Vector2;
  velocity: THREE.Vector2;
  life: number;
  maxLife: number;
}

export class Player {
  // Físicas Rapier2D
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  public hydroProps: HydrodynamicProperties;

  // Visuales Three.js
  public group: THREE.Group;
  private membrane!: THREE.Mesh;
  private flagellaCurves: THREE.Line[] = [];

  // Parámetros de Rendimiento Celular (Tier 1 Bacilo Primitivo / GDD)
  public thrustForce = 48.0;
  public brakeForce = 28.0;
  public recoilStrength = 7.5; // Fuerza de retroceso por eyección de toxina
  public rotationSpeed = 9.0;
  public targetAngle = 0;

  // Sistema de Proyectiles de Toxina
  public projectiles: Projectile[] = [];
  public projectilesGroup: THREE.Group;
  private lastShootTime = 0;
  private shootCooldown = 0.22; // Segundos entre disparos

  // Estado de Controles
  public isThrusting = false;
  public isBraking = false;
  public isShooting = false;
  public mouseWorld = new THREE.Vector2(0, 0);

  constructor(physicsWorld: PhysicsWorld, scene: THREE.Scene) {
    // 1. Configuración de Célula en Físicas Rapier2D
    this.body = physicsWorld.createDynamicBody(0, 0, 0.1, 2.0);
    this.collider = physicsWorld.createCapsuleCollider(1.2, 1.2, this.body);

    this.hydroProps = {
      morphology: Morphology.BACILLUS,
      projectedArea: 2.8,
      terminalVelocity: 18.0,
    };

    // 2. Creación Visual Three.js
    this.group = new THREE.Group();
    this.projectesVisuals();
    scene.add(this.group);

    this.projectilesGroup = new THREE.Group();
    scene.add(this.projectilesGroup);

    // 3. Registro de Entradas (Teclado y Ratón)
    this.setupInputs();
  }

  private projectesVisuals(): void {
    // Membrana Externa (Verde Esmeralda de Alto Contraste)
    const membraneGeo = new THREE.CapsuleGeometry(1.2, 2.4, 16, 32);
    const membraneMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x059669,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    this.membrane = new THREE.Mesh(membraneGeo, membraneMat);
    this.membrane.rotation.z = Math.PI / 2;
    this.group.add(this.membrane);

    // Núcleo Citoplasmático (Cian Eléctrico)
    const coreGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.95,
    });
    this.group.add(new THREE.Mesh(coreGeo, coreMat));

    // Vacuolas de ATP Doradas
    for (let i = 0; i < 4; i++) {
      const vacGeo = new THREE.SphereGeometry(0.3, 12, 12);
      const vacMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 1.0,
      });
      const vac = new THREE.Mesh(vacGeo, vacMat);
      vac.position.set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.8, 0.2);
      this.group.add(vac);
    }

    // Flagelos Sinusoidales Ondulantes
    for (let i = -1; i <= 1; i++) {
      const curvePoints: THREE.Vector3[] = [];
      for (let j = 0; j < 25; j++) {
        curvePoints.push(new THREE.Vector3(-1.8 - j * 0.2, i * 0.4, 0));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: i === 0 ? 0x00ffcc : 0x00e5ff,
        linewidth: 3,
        transparent: true,
        opacity: 1.0,
      });
      const flagellum = new THREE.Line(lineGeo, lineMat);
      this.flagellaCurves.push(flagellum);
      this.group.add(flagellum);
    }
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
      if (e.button === 2) this.isThrusting = true; // Clic derecho = Empuje
      if (e.button === 0) this.isShooting = true;  // Clic izquierdo = Disparo
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.isThrusting = false;
      if (e.button === 0) this.isShooting = false;
    });

    // Desactivar menú contextual con clic derecho para permitir juego fluido
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Actualización de físicas y control en cada tick fijo (60 Hz)
   */
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

    // Torque suave de orientación
    const newRot = currentRot + angleDiff * Math.min(fixedDt * this.rotationSpeed, 1.0);
    this.body.setRotation(newRot, true);

    // Vector unitario frontal y perpendicular
    const forwardX = Math.cos(newRot);
    const forwardY = Math.sin(newRot);

    // 2. Propulsión Frontal (Flagellar Drive: W o Clic Derecho)
    if (this.isThrusting) {
      const fx = forwardX * this.thrustForce * fixedDt;
      const fy = forwardY * this.thrustForce * fixedDt;
      this.body.applyImpulse({ x: fx, y: fy }, true);
    }

    // 3. Freno Activo (S o Flecha Abajo)
    if (this.isBraking) {
      const vel = this.body.linvel();
      const brakeX = -vel.x * this.brakeForce * fixedDt * 0.1;
      const brakeY = -vel.y * this.brakeForce * fixedDt * 0.1;
      this.body.applyImpulse({ x: brakeX, y: brakeY }, true);
    }

    // 4. Mecánica de Disparo con Recoil Boost (Tercera Ley de Newton)
    const now = performance.now() / 1000;
    if (this.isShooting && now - this.lastShootTime >= this.shootCooldown) {
      this.shootToxin(pos.x, pos.y, forwardX, forwardY, now);
    }

    // 5. Aplicar Arrastre Hidrodinámico F_drag
    hydro.applyDrag(this.body, this.hydroProps);
    hydro.applyRotationalDrag(this.body, 2.5);
  }

  /**
   * Dispara una toxina orgánica y aplica impulso de retroceso (Recoil Boost) instantáneo
   */
  private shootToxin(x: number, y: number, forwardX: number, forwardY: number, timeNow: number): void {
    this.lastShootTime = timeNow;

    // Punto de salida frontal
    const spawnX = x + forwardX * 1.8;
    const spawnY = y + forwardY * 1.8;

    // Velocidad del proyectil (velocidad de la célula + velocidad de eyección)
    const currentVel = this.body.linvel();
    const projectileSpeed = 28.0;
    const pVelX = currentVel.x + forwardX * projectileSpeed;
    const pVelY = currentVel.y + forwardY * projectileSpeed;

    // Malla visual del proyectil (Orbe ácido brillante púrpura/verde)
    const pGeo = new THREE.SphereGeometry(0.32, 12, 12);
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

    // RECOIL BOOST: Conservación de momento lineal -> Impulso opuesto instantáneo a la bacteria
    const recoilX = -forwardX * this.recoilStrength;
    const recoilY = -forwardY * this.recoilStrength;
    this.body.applyImpulse({ x: recoilX, y: recoilY }, true);
  }

  /**
   * Actualización visual en cada frame de renderizado Three.js
   */
  public visualUpdate(dt: number, time: number): void {
    // Sincronizar posición y rotación con el cuerpo rígido de Rapier
    const pos = this.body.translation();
    const rot = this.body.rotation();
    this.group.position.set(pos.x, pos.y, 0);
    this.group.rotation.z = rot;

    // Ondulación de los flagelos (aumenta frecuencia proporcionalmente a la velocidad)
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
        positions.setY(j, (idx - 1) * 0.35 + wave);
      }
      positions.needsUpdate = true;
    });

    // Actualizar y limpiar proyectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;

      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.mesh.position.set(p.position.x, p.position.y, 0.2);

      // Desvanecimiento suave al final de su vida
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
