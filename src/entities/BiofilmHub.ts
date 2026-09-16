import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { VacuoleManager } from '../systems/VacuoleManager';

export class BiofilmHub {
  public position: THREE.Vector2;
  public radius: number;
  public group: THREE.Group;
  private membraneShield: THREE.Mesh;
  private coreMesh: THREE.Mesh;
  public collider: RAPIER.Collider;

  public isPlayerInside = false;

  constructor(
    physicsWorld: PhysicsWorld,
    scene: THREE.Scene,
    x = -12,
    y = -8,
    radius = 9.0
  ) {
    this.position = new THREE.Vector2(x, y);
    this.radius = radius;
    this.group = new THREE.Group();
    this.group.position.set(x, y, -0.5);

    // 1. Núcleo bacteriano simbiótico central
    const coreGeo = new THREE.DodecahedronGeometry(2.0, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x047857,
      emissiveIntensity: 1.2,
      roughness: 0.3,
      metalness: 0.1,
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.coreMesh);

    // 2. Membrana Protectora Translúcida de Polisacáridos (Escudo de Biopelícula)
    const shieldGeo = new THREE.RingGeometry(radius * 0.95, radius, 48);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    this.membraneShield = new THREE.Mesh(shieldGeo, shieldMat);
    this.group.add(this.membraneShield);

    // Domo translúcido interior suave
    const domeGeo = new THREE.CircleGeometry(radius * 0.95, 32);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x047857,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.z = -0.1;
    this.group.add(dome);

    scene.add(this.group);

    // 3. Sensor Físico Rapier2D para detección instantánea
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y);
    const body = physicsWorld.rawWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.ball(radius).setSensor(true);
    this.collider = physicsWorld.rawWorld.createCollider(colliderDesc, body);
  }

  public update(dt: number, time: number, playerPos: { x: number; y: number }, vacuoleManager: VacuoleManager): void {
    // Animación de rotación del núcleo simbiótico y pulsación del escudo
    this.coreMesh.rotation.z += 0.008;
    const pulse = 1.0 + Math.sin(time * 2.5) * 0.04;
    this.membraneShield.scale.set(pulse, pulse, 1.0);

    // Detección de proximidad
    const dist = Math.hypot(playerPos.x - this.position.x, playerPos.y - this.position.y);
    const wasInside = this.isPlayerInside;
    this.isPlayerInside = dist <= this.radius;

    if (this.isPlayerInside) {
      // Regeneración Celular Pasiva: +10 HP/s y +15 ATP/s en la zona de biopelícula
      if (vacuoleManager.membraneIntegrity < vacuoleManager.maxMembraneIntegrity) {
        vacuoleManager.membraneIntegrity = Math.min(
          vacuoleManager.maxMembraneIntegrity,
          vacuoleManager.membraneIntegrity + 10 * dt
        );
      }
      vacuoleManager.addAtp(15 * dt);

      // Efecto visual de brillo más intenso cuando la bacteria está dentro
      (this.membraneShield.material as THREE.MeshBasicMaterial).opacity = 0.65;
    } else if (wasInside) {
      (this.membraneShield.material as THREE.MeshBasicMaterial).opacity = 0.45;
    }
  }

  public dispose(scene: THREE.Scene, physicsWorld: PhysicsWorld): void {
    scene.remove(this.group);
    physicsWorld.rawWorld.removeCollider(this.collider, false);
  }
}
