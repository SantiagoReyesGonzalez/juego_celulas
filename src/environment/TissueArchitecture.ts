import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';
import { PhysicsWorld } from '../physics/World';
import { getToroidalDelta } from '../physics/WorldTopology';

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface EndothelialCellData {
  x: number;
  y: number;
  radius: number;
  angle: number;
}

/**
 * TissueArchitecture: Generador y gestor de la arquitectura de macro-organismo.
 * Construye paredes celulares endoteliales colisionables en Rapier2D, conductos vasculares,
 * criptas tisulares, filamentos de colágeno y células anfitrionas gigantescas de fondo.
 */
export class TissueArchitecture {
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;

  public wallSegments: WallSegment[] = [];
  private staticBodies: RAPIER.RigidBody[] = [];
  private staticColliders: RAPIER.Collider[] = [];

  // Mallas visuales de paredes
  private wallCellInstancedMesh?: THREE.InstancedMesh;
  private wallNucleiInstancedMesh?: THREE.InstancedMesh;
  private endothelialCells: EndothelialCellData[] = [];

  // Filamentos de colágeno y matriz extracelular
  private collagenGroup: THREE.Group;
  private collagenLines: THREE.Line[] = [];

  // Células anfitrionas gigantes de fondo (Macro-Organismo somático)
  private hostCellsGroup: THREE.Group;
  private hostCells: Array<{
    mesh: THREE.Group;
    coreMesh: THREE.Mesh;
    baseScale: number;
    pulseSpeed: number;
    pulseOffset: number;
  }> = [];

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.collagenGroup = new THREE.Group();
    this.scene.add(this.collagenGroup);

    this.hostCellsGroup = new THREE.Group();
    this.scene.add(this.hostCellsGroup);

    this.buildTissueTopology();
    this.buildExtracellularMatrix();
    this.buildGiantHostCells();
  }

  /**
   * Genera la topología de canales vasculares, criptas tisulares y tabiques endoteliales
   */
  private buildTissueTopology(): void {
    const wallCurves: Array<Array<{ x: number; y: number }>> = [];

    // 1. Canal Vascular Sinuoso Superior (Pared endotelial norte del lecho vascular)
    const northCapillary: Array<{ x: number; y: number }> = [];
    for (let x = -360; x <= 360; x += 35) {
      const y = 85 + Math.sin(x * 0.012) * 45 + Math.cos(x * 0.025) * 20;
      northCapillary.push({ x, y });
    }
    wallCurves.push(northCapillary);

    // 2. Canal Vascular Sinuoso Inferior (Pared endotelial sur del lecho vascular, dejando un ancho de ~48u)
    const southCapillary: Array<{ x: number; y: number }> = [];
    for (let x = -360; x <= 360; x += 35) {
      const y = 35 + Math.sin(x * 0.012) * 45 + Math.cos(x * 0.025) * 20;
      southCapillary.push({ x, y });
    }
    wallCurves.push(southCapillary);

    // 3. Cripta Tisular Noroccidental (Cámara de anidación cerrada en forma de C)
    const cryptNW: Array<{ x: number; y: number }> = [];
    const centerNW = { x: -190, y: 190 };
    const radiusNW = 65;
    for (let a = 0.5; a < Math.PI * 1.85; a += 0.38) {
      cryptNW.push({
        x: centerNW.x + Math.cos(a) * radiusNW,
        y: centerNW.y + Math.sin(a) * (radiusNW * 0.75),
      });
    }
    wallCurves.push(cryptNW);

    // 4. Cripta Tisular Suroriental (Cámara alveolar)
    const cryptSE: Array<{ x: number; y: number }> = [];
    const centerSE = { x: 190, y: -180 };
    const radiusSE = 68;
    for (let a = -1.2; a < Math.PI * 1.25; a += 0.38) {
      cryptSE.push({
        x: centerSE.x + Math.cos(a) * radiusSE,
        y: centerSE.y + Math.sin(a) * (radiusSE * 0.75),
      });
    }
    wallCurves.push(cryptSE);

    // 5. Tabique y Septo Central-Sur (Gran pared divisoria con poro estrecho)
    const septo1: Array<{ x: number; y: number }> = [
      { x: -110, y: -60 },
      { x: -75, y: -110 },
      { x: -40, y: -170 },
      { x: -20, y: -230 },
    ];
    wallCurves.push(septo1);

    const septo2: Array<{ x: number; y: number }> = [
      { x: 30, y: -60 },
      { x: 65, y: -115 },
      { x: 95, y: -175 },
      { x: 110, y: -235 },
    ];
    wallCurves.push(septo2);

    // 6. Arco Endotelial Nororiental
    const archNE: Array<{ x: number; y: number }> = [
      { x: 130, y: 160 },
      { x: 175, y: 210 },
      { x: 230, y: 235 },
      { x: 290, y: 220 },
      { x: 340, y: 180 },
    ];
    wallCurves.push(archNE);

    // 7. Arco Endotelial Suroccidental
    const archSW: Array<{ x: number; y: number }> = [
      { x: -140, y: -160 },
      { x: -190, y: -200 },
      { x: -250, y: -215 },
      { x: -310, y: -190 },
      { x: -350, y: -150 },
    ];
    wallCurves.push(archSW);

    // Crear la cadena de células endoteliales y colisionadores para cada curva
    const cellRadius = 4.2; // Radio de cada célula endotelial de la pared
    const dummy = new THREE.Object3D();

    wallCurves.forEach((curve) => {
      for (let i = 0; i < curve.length - 1; i++) {
        const p1 = curve[i];
        const p2 = curve[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const segmentLen = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.round(segmentLen / (cellRadius * 1.65)));

        // Guardar segmento para el minimapa
        this.wallSegments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });

        // Crear colisionador físico de cápsula continua en Rapier2D
        const midX = (p1.x + p2.x) * 0.5;
        const midY = (p1.y + p2.y) * 0.5;
        const angle = Math.atan2(dy, dx);

        const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(midX, midY).setRotation(angle);
        const body = this.physicsWorld.rawWorld.createRigidBody(bodyDesc);
        this.staticBodies.push(body);

        // Cápsula con radio generoso para colisiones suaves y redondeadas (sin atascos)
        const colliderDesc = RAPIER.ColliderDesc.capsule(segmentLen * 0.48, cellRadius * 0.85)
          .setRestitution(0.65) // Rebote viscoelástico suave
          .setFriction(0.12);   // Resbaladizo como mucosa biológica
        const collider = this.physicsWorld.rawWorld.createCollider(colliderDesc, body);
        this.staticColliders.push(collider);

        // Muestrear células endoteliales adyacentes a lo largo del segmento
        for (let s = 0; s < steps; s++) {
          const t = (s + 0.5) / steps;
          const cx = p1.x + dx * t;
          const cy = p1.y + dy * t;
          this.endothelialCells.push({
            x: cx,
            y: cy,
            radius: cellRadius,
            angle,
          });
        }
      }
    });

    // ================= MALLAS INSTANCIADAS (ALTO RENDIMIENTO A 60 FPS) =================
    const count = this.endothelialCells.length;
    if (count === 0) return;

    // 1. Cuerpos celulares endoteliales (Cápsulas/elipsoides convexos con brillo de membrana tisular)
    const cellGeo = new THREE.CapsuleGeometry(cellRadius * 0.95, cellRadius * 0.9, 10, 16);
    const cellMat = new THREE.MeshStandardMaterial({
      color: 0x881337,           // Borgoña tisular profundo
      emissive: 0x4c0519,        // Brillo endotelial vascular
      emissiveIntensity: 0.65,
      roughness: 0.28,
      metalness: 0.12,
      transparent: true,
      opacity: 0.92,
    });
    this.wallCellInstancedMesh = new THREE.InstancedMesh(cellGeo, cellMat, count);

    // 2. Núcleos celulares internos alargados (fluorescencia biológica distintiva)
    const nucleusGeo = new THREE.CapsuleGeometry(cellRadius * 0.38, cellRadius * 0.45, 8, 12);
    const nucleusMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xfb7185,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    this.wallNucleiInstancedMesh = new THREE.InstancedMesh(nucleusGeo, nucleusMat, count);

    for (let i = 0; i < count; i++) {
      const cell = this.endothelialCells[i];
      // Pequeña variación biológica orgánica por célula
      const jitterAngle = cell.angle + (Math.sin(i * 1.7) * 0.12);
      const scaleJitter = 0.92 + (Math.cos(i * 2.3) * 0.14);

      // Posicionar célula
      dummy.position.set(cell.x, cell.y, 0);
      dummy.rotation.set(0, 0, jitterAngle + Math.PI / 2);
      dummy.scale.set(scaleJitter, scaleJitter, scaleJitter);
      dummy.updateMatrix();
      this.wallCellInstancedMesh.setMatrixAt(i, dummy.matrix);

      // Posicionar núcleo celular
      dummy.position.set(cell.x, cell.y, 0.2);
      dummy.rotation.set(0, 0, jitterAngle + Math.PI / 2);
      dummy.scale.set(scaleJitter * 0.85, scaleJitter * 0.85, scaleJitter * 0.85);
      dummy.updateMatrix();
      this.wallNucleiInstancedMesh.setMatrixAt(i, dummy.matrix);
    }

    this.wallCellInstancedMesh.instanceMatrix.needsUpdate = true;
    this.wallNucleiInstancedMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.wallCellInstancedMesh);
    this.scene.add(this.wallNucleiInstancedMesh);
  }

  /**
   * Construye filamentos elásticos de matriz extracelular (MEC / Colágeno)
   */
  private buildExtracellularMatrix(): void {
    const collagenMat = new THREE.LineBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.45,
      linewidth: 2,
    });

    // Crear 24 haces de fibras de colágeno sinuosas que cruzan entre tabiques
    for (let i = 0; i < 24; i++) {
      const startAngle = (i / 24) * Math.PI * 2;
      const startDist = 90 + Math.sin(i * 3.1) * 160;
      const x1 = Math.cos(startAngle) * startDist;
      const y1 = Math.sin(startAngle) * startDist;

      const endDist = startDist + 65 + Math.cos(i * 2.7) * 45;
      const endAngle = startAngle + 0.35 + (Math.sin(i * 1.4) * 0.3);
      const x2 = Math.cos(endAngle) * endDist;
      const y2 = Math.sin(endAngle) * endDist;

      // Curva Bezier de 3 puntos para dar aspecto de tendón/fibra elástica curva
      const midX = (x1 + x2) * 0.5 + Math.sin(i * 4.5) * 35;
      const midY = (y1 + y2) * 0.5 + Math.cos(i * 3.8) * 35;

      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x1, y1, -1.5),
        new THREE.Vector3(midX, midY, -1.0),
        new THREE.Vector3(x2, y2, -1.5)
      );

      const points = curve.getPoints(16);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, collagenMat);
      this.collagenLines.push(line);
      this.collagenGroup.add(line);
    }
  }

  /**
   * Genera las células anfitrionas gigantescas de fondo (Macro-Organismo Somático en Paralaje)
   */
  private buildGiantHostCells(): void {
    // 10 Células somáticas gigantes distribuidas en capas profundas (Z = -22 a -55)
    const hostLocations = [
      { x: -240, y: 110, r: 65, z: -35 },
      { x: 250, y: 90, r: 75, z: -40 },
      { x: -160, y: -210, r: 55, z: -28 },
      { x: 180, y: -190, r: 85, z: -45 },
      { x: 0, y: 240, r: 90, z: -50 },
      { x: 0, y: -240, r: 70, z: -32 },
      { x: -320, y: -70, r: 60, z: -30 },
      { x: 320, y: -60, r: 65, z: -35 },
      { x: -80, y: 15, r: 48, z: -25 },
      { x: 110, y: -20, r: 52, z: -26 },
    ];

    hostLocations.forEach((loc, idx) => {
      const group = new THREE.Group();
      group.position.set(loc.x, loc.y, loc.z);

      // Citoplasma gigante translúcido
      const cytoGeo = new THREE.SphereGeometry(loc.r, 24, 24);
      const cytoMat = new THREE.MeshStandardMaterial({
        color: 0x4a0410,
        emissive: 0x1f0206,
        emissiveIntensity: 0.35,
        roughness: 0.45,
        transparent: true,
        opacity: 0.65,
      });
      const cytoMesh = new THREE.Mesh(cytoGeo, cytoMat);
      group.add(cytoMesh);

      // Núcleo celular somático titánico (palpitante)
      const coreGeo = new THREE.SphereGeometry(loc.r * 0.36, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x9f1239,
        transparent: true,
        opacity: 0.75,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.set(loc.r * 0.1, loc.r * 0.08, 0.5);
      group.add(coreMesh);

      // Inclusiones de organelos gigantes (mitocondrias somáticas flotantes)
      for (let m = 0; m < 5; m++) {
        const mAngle = (m / 5) * Math.PI * 2 + idx;
        const mDist = loc.r * 0.58;
        const mito = new THREE.Mesh(
          new THREE.CapsuleGeometry(loc.r * 0.06, loc.r * 0.16, 6, 8),
          new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.45 })
        );
        mito.position.set(Math.cos(mAngle) * mDist, Math.sin(mAngle) * mDist, 0.2);
        mito.rotation.z = mAngle;
        group.add(mito);
      }

      this.hostCellsGroup.add(group);
      this.hostCells.push({
        mesh: group,
        coreMesh,
        baseScale: 1.0,
        pulseSpeed: 0.7 + (idx * 0.15) % 0.6,
        pulseOffset: idx * 1.3,
      });
    });
  }

  /**
   * Animación en tiempo real: ciclo metabólico respiratorio de células somáticas y deriva de colágeno
   */
  public update(dt: number, time: number): void {
    // 1. Respiración metabólica y pulsación lenta de las células anfitrionas gigantes
    this.hostCells.forEach((host) => {
      const breath = Math.sin(time * host.pulseSpeed + host.pulseOffset);
      const scale = host.baseScale * (1.0 + breath * 0.06);
      host.mesh.scale.set(scale, scale, 1.0);

      // Pulsación del núcleo
      const corePulse = 1.0 + Math.cos(time * host.pulseSpeed * 1.3 + host.pulseOffset) * 0.12;
      host.coreMesh.scale.set(corePulse, corePulse, corePulse);
    });

    // 2. Ondulación elástica suave de los filamentos de colágeno
    this.collagenLines.forEach((line, idx) => {
      const wobble = Math.sin(time * 0.8 + idx) * 0.008;
      line.rotation.z += wobble * dt;
    });
  }

  /**
   * Verifica si una posición choca con alguna pared y devuelve el vector normal de retroceso
   */
  public checkWallProximity(x: number, y: number, radius: number): { hit: boolean; nx: number; ny: number; depth: number } {
    let minPenetration = 0;
    let hitNormalX = 0;
    let hitNormalY = 0;
    let hasHit = false;

    // Distancia toroidal rápida a los centros de las células de pared más cercanas
    for (let i = 0; i < this.endothelialCells.length; i += 2) {
      const cell = this.endothelialCells[i];
      const { dx, dy, dist } = getToroidalDelta(x, y, cell.x, cell.y);
      const contactDist = radius + cell.radius * 0.82;

      if (dist < contactDist && dist > 0.001) {
        hasHit = true;
        const pen = contactDist - dist;
        if (pen > minPenetration) {
          minPenetration = pen;
          hitNormalX = -dx / dist;
          hitNormalY = -dy / dist;
        }
      }
    }

    return {
      hit: hasHit,
      nx: hitNormalX,
      ny: hitNormalY,
      depth: minPenetration,
    };
  }

  public dispose(): void {
    this.staticColliders.forEach((c) => this.physicsWorld.rawWorld.removeCollider(c, false));
    this.staticBodies.forEach((b) => this.physicsWorld.rawWorld.removeRigidBody(b));

    if (this.wallCellInstancedMesh) {
      this.scene.remove(this.wallCellInstancedMesh);
      this.wallCellInstancedMesh.geometry.dispose();
      (this.wallCellInstancedMesh.material as THREE.Material).dispose();
    }

    if (this.wallNucleiInstancedMesh) {
      this.scene.remove(this.wallNucleiInstancedMesh);
      this.wallNucleiInstancedMesh.geometry.dispose();
      (this.wallNucleiInstancedMesh.material as THREE.Material).dispose();
    }

    this.scene.remove(this.collagenGroup);
    this.scene.remove(this.hostCellsGroup);
  }
}
