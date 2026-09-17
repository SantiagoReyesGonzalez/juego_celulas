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

export interface BioVesicleData {
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface DeepMacroEntity {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseScale: number;
  parallaxFactor: number;
  wobbleSpeed: number;
  wobblePhase: number;
  rotationSpeed: number;
}

interface ViscoelasticVesicle {
  mesh: THREE.Mesh;
  haloMesh: THREE.Mesh;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  baseX: number;
  baseY: number;
  radius: number;
  pulsePhase: number;
  pulseSpeed: number;
}

/**
 * Spore-Style Primordial Organism Atmosphere & Depth Architecture:
 * 
 * Basado fielmente en la estética de Spore (Cell Stage) y flOw:
 * 1. Capa 1: Fondo Profundo (Z = -40 a -75):
 *    Siluetas colosales de macro-células y leviatánes somáticos desenfocados (DoF)
 *    con movimiento de paralaje lento, respiración sinusoidal y núcleos brillantes.
 * 2. Capa 2: Plano Jugable (Z = -2 a 0):
 *    Vesículas lipídicas y vacuolas esféricas viscoelásticas (Bio-Vesicles)
 *    con colisionadores Rapier2D tipo Ball (restitución 0.75 elástica y fricción mínima).
 * 
 * Elimina 100% de los polígonos angulares cortados y garantiza 60 FPS clavados.
 */
export class TissueArchitecture {
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;

  // Colecciones de elementos por capas de profundidad
  private deepGroup = new THREE.Group();
  private vesicleGroup = new THREE.Group();

  private deepEntities: DeepMacroEntity[] = [];
  private bioVesicles: ViscoelasticVesicle[] = [];

  // Datos públicos para el minimapa (sin polígonos angulares)
  public vesiclesData: BioVesicleData[] = [];
  public wallSegments: WallSegment[] = []; // Compatibilidad retroactiva vacía

  // Texturas procedimentales compartidas (Cero latencia de carga)
  private softAmoebaTexture!: THREE.CanvasTexture;
  private deepNucleusTexture!: THREE.CanvasTexture;
  private vesicleTexture!: THREE.CanvasTexture;

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.scene.add(this.deepGroup);
    this.scene.add(this.vesicleGroup);

    this.buildProceduralTextures();
    this.spawnDeepMacroOrganisms();
    this.spawnViscoelasticVesicles();
  }

  /**
   * Generación de texturas procedurales suaves (Falloff Gaussiano / DoF óptico)
   */
  private buildProceduralTextures(): void {
    // 1. Textura de Macro-Organismo Ameboide Suave (Desenfoque DoF de Fondo Cálido)
    const canvasAmoeba = document.createElement('canvas');
    canvasAmoeba.width = 256;
    canvasAmoeba.height = 256;
    const ctxA = canvasAmoeba.getContext('2d')!;
    const gradA = ctxA.createRadialGradient(128, 128, 10, 128, 128, 124);
    gradA.addColorStop(0.0, 'rgba(180, 83, 9, 0.72)');   // Miel dorado (#b45309)
    gradA.addColorStop(0.35, 'rgba(120, 29, 16, 0.52)'); // Rojo capilar visceral (#781d10)
    gradA.addColorStop(0.70, 'rgba(42, 8, 12, 0.28)');   // Ámbar profundo (#2a080c)
    gradA.addColorStop(0.92, 'rgba(42, 8, 12, 0.08)');
    gradA.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctxA.fillStyle = gradA;
    ctxA.beginPath();
    ctxA.arc(128, 128, 124, 0, Math.PI * 2);
    ctxA.fill();
    this.softAmoebaTexture = new THREE.CanvasTexture(canvasAmoeba);

    // 2. Textura de Núcleo Somático Luminiscente de Fondo (Oro Miel Cálido)
    const canvasNuc = document.createElement('canvas');
    canvasNuc.width = 128;
    canvasNuc.height = 128;
    const ctxN = canvasNuc.getContext('2d')!;
    const gradN = ctxN.createRadialGradient(64, 64, 4, 64, 64, 60);
    gradN.addColorStop(0.0, 'rgba(255, 245, 190, 0.98)');
    gradN.addColorStop(0.28, 'rgba(245, 158, 11, 0.85)'); // Miel intensa
    gradN.addColorStop(0.65, 'rgba(180, 83, 9, 0.38)');
    gradN.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctxN.fillStyle = gradN;
    ctxN.beginPath();
    ctxN.arc(64, 64, 60, 0, Math.PI * 2);
    ctxN.fill();
    this.deepNucleusTexture = new THREE.CanvasTexture(canvasNuc);

    // 3. Textura de Vesícula Lipídica / Vacuola de Membrana Translúcida (Plano Jugable)
    const canvasVes = document.createElement('canvas');
    canvasVes.width = 256;
    canvasVes.height = 256;
    const ctxV = canvasVes.getContext('2d')!;
    // Relleno interior translúcido miel y ámbar
    const gradVInt = ctxV.createRadialGradient(128, 128, 10, 128, 128, 122);
    gradVInt.addColorStop(0.0, 'rgba(254, 240, 138, 0.14)');
    gradVInt.addColorStop(0.65, 'rgba(245, 158, 11, 0.22)');
    gradVInt.addColorStop(0.85, 'rgba(244, 63, 94, 0.38)');  // Reflejo capilar
    gradVInt.addColorStop(0.96, 'rgba(255, 235, 170, 0.82)'); // Ribete lipídico iridiscente dorado
    gradVInt.addColorStop(1.0, 'rgba(255, 235, 170, 0.0)');
    ctxV.fillStyle = gradVInt;
    ctxV.beginPath();
    ctxV.arc(128, 128, 124, 0, Math.PI * 2);
    ctxV.fill();
    // Destello de membrana interna
    ctxV.strokeStyle = 'rgba(255, 255, 220, 0.65)';
    ctxV.lineWidth = 3.5;
    ctxV.beginPath();
    ctxV.arc(128, 128, 116, -Math.PI * 0.45, -Math.PI * 0.05);
    ctxV.stroke();
    this.vesicleTexture = new THREE.CanvasTexture(canvasVes);
  }

  /**
   * Capa 1: Macro-Organismos Silueteados y Núcleos Somáticos en Fondo Profundo (Z = -45 a -70)
   * Aportan la escala colosal de Spore: "Soy un microbio dentro de una bestia inmensa"
   */
  private spawnDeepMacroOrganisms(): void {
    const geo = new THREE.PlaneGeometry(1, 1);

    // Configuraciones de 14 colosos primordiales en tonos miel, ámbar y capilar cálido
    const macroConfigs = [
      { x: -180, y: 140, scale: 180, z: -55, color: 0xb45309, parallax: 0.22, speed: 0.35 },
      { x: 190, y: -160, scale: 220, z: -65, color: 0x781d10, parallax: 0.18, speed: 0.28 },
      { x: 260, y: 190, scale: 160, z: -48, color: 0xd97706, parallax: 0.26, speed: 0.42 },
      { x: -240, y: -210, scale: 240, z: -70, color: 0x991b1b, parallax: 0.15, speed: 0.25 },
      { x: 0, y: 260, scale: 190, z: -52, color: 0xb45309, parallax: 0.24, speed: 0.38 },
      { x: 40, y: -280, scale: 210, z: -60, color: 0x781d10, parallax: 0.20, speed: 0.31 },
      { x: -320, y: 30, scale: 170, z: -50, color: 0xca8a04, parallax: 0.25, speed: 0.40 },
      { x: 330, y: -40, scale: 185, z: -56, color: 0xd97706, parallax: 0.21, speed: 0.33 },
      { x: -110, y: -120, scale: 140, z: -45, color: 0xf59e0b, parallax: 0.28, speed: 0.45 },
      { x: 130, y: 110, scale: 155, z: -47, color: 0x991b1b, parallax: 0.27, speed: 0.41 },
      { x: -290, y: 270, scale: 200, z: -62, color: 0xb45309, parallax: 0.19, speed: 0.30 },
      { x: 280, y: -290, scale: 215, z: -66, color: 0x781d10, parallax: 0.17, speed: 0.27 },
      { x: -70, y: 320, scale: 175, z: -54, color: 0xd97706, parallax: 0.23, speed: 0.36 },
      { x: 80, y: -340, scale: 195, z: -58, color: 0xca8a04, parallax: 0.20, speed: 0.32 },
    ];

    macroConfigs.forEach((cfg, idx) => {
      // Material de cuerpo ameboide con blending suave
      const mat = new THREE.MeshBasicMaterial({
        map: this.softAmoebaTexture,
        color: cfg.color,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      mesh.scale.set(cfg.scale, cfg.scale * (0.85 + (idx % 3) * 0.1), 1);
      mesh.rotation.z = (idx * Math.PI) / 4;
      this.deepGroup.add(mesh);

      // Núcleo somático interno bioluminiscente
      const nucMat = new THREE.MeshBasicMaterial({
        map: this.deepNucleusTexture,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const nucMesh = new THREE.Mesh(geo, nucMat);
      const nucScale = 0.38 + (idx % 3) * 0.08;
      nucMesh.position.set(
        Math.sin(idx) * 0.12,
        Math.cos(idx) * 0.12,
        0.5
      );
      nucMesh.scale.set(nucScale, nucScale, 1);
      mesh.add(nucMesh);

      this.deepEntities.push({
        mesh,
        baseX: cfg.x,
        baseY: cfg.y,
        baseScale: cfg.scale,
        parallaxFactor: cfg.parallax,
        wobbleSpeed: cfg.speed,
        wobblePhase: idx * 1.35,
        rotationSpeed: (idx % 2 === 0 ? 1 : -1) * (0.015 + (idx % 4) * 0.006),
      });
    });
  }

  /**
   * Capa 2: Vesículas Lipídicas Viscoelásticas en el Plano Jugable (Z = -2 a 0)
   * Sustituyen a las paredes angulares: son redondeadas, translúcidas y rebotan elásticamente.
   */
  private spawnViscoelasticVesicles(): void {
    const geo = new THREE.PlaneGeometry(1, 1);

    // Distribución orgánica de grandes vesículas y vacuolas celulares
    const vesicleConfigs = [
      { x: -140, y: 70, radius: 24, color: '#f59e0b' },
      { x: -90, y: 160, radius: 20, color: '#f43f5e' },
      { x: 120, y: 80, radius: 26, color: '#fbbf24' },
      { x: 170, y: 150, radius: 18, color: '#f97316' },
      { x: 150, y: -110, radius: 28, color: '#38bdf8' },
      { x: 90, y: -190, radius: 22, color: '#f43f5e' },
      { x: -130, y: -140, radius: 26, color: '#fbbf24' },
      { x: -190, y: -80, radius: 19, color: '#f59e0b' },
      { x: -240, y: 60, radius: 25, color: '#38bdf8' },
      { x: 230, y: -50, radius: 24, color: '#f43f5e' },
      { x: -30, y: -240, radius: 22, color: '#f97316' },
      { x: 40, y: 240, radius: 23, color: '#fbbf24' },
      { x: -220, y: 220, radius: 27, color: '#f59e0b' },
      { x: 250, y: 230, radius: 21, color: '#38bdf8' },
      { x: 260, y: -220, radius: 25, color: '#f43f5e' },
      { x: -250, y: -230, radius: 22, color: '#fbbf24' },
    ];

    vesicleConfigs.forEach((cfg, idx) => {
      const diameter = cfg.radius * 2;

      // 1. Malla principal de la vesícula translúcida
      const mat = new THREE.MeshBasicMaterial({
        map: this.vesicleTexture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, cfg.y, -0.6);
      mesh.scale.set(diameter, diameter, 1);
      this.vesicleGroup.add(mesh);

      // 2. Halo de resplandor membranoso exterior
      const haloMat = new THREE.MeshBasicMaterial({
        map: this.softAmoebaTexture,
        color: cfg.color,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const haloMesh = new THREE.Mesh(geo, haloMat);
      haloMesh.position.set(0, 0, -0.1);
      haloMesh.scale.set(1.18, 1.18, 1);
      mesh.add(haloMesh);

      // 3. Colisionador en Rapier2D (Ball elástico viscoelástico: CERO esquinas angulares)
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(cfg.x, cfg.y);
      const body = this.physicsWorld.rawWorld.createRigidBody(bodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.ball(cfg.radius * 0.94)
        .setRestitution(0.78) // Rebote viscoelástico suave y placentero
        .setFriction(0.04);   // Deslizamiento orgánico fluido sin rozamiento abrasivo
      const collider = this.physicsWorld.rawWorld.createCollider(colliderDesc, body);

      this.bioVesicles.push({
        mesh,
        haloMesh,
        body,
        collider,
        baseX: cfg.x,
        baseY: cfg.y,
        radius: cfg.radius,
        pulsePhase: idx * 0.8,
        pulseSpeed: 0.8 + (idx % 4) * 0.25,
      });

      this.vesiclesData.push({
        x: cfg.x,
        y: cfg.y,
        radius: cfg.radius,
        color: cfg.color,
      });
    });
  }

  /**
   * Actualización visual y de paralaje en tiempo real (60 FPS clavados)
   */
  public update(dt: number, time: number, camPos?: THREE.Vector2 | THREE.Vector3): void {
    const camX = camPos ? camPos.x : 0;
    const camY = camPos ? camPos.y : 0;

    // 1. Animación y Paralaje de Macro-Organismos Profundos (Z = -45 a -70)
    for (let i = 0; i < this.deepEntities.length; i++) {
      const ent = this.deepEntities[i];

      // Paralaje suave relativo a la cámara: se mueven más despacio aumentando la profundidad
      const { dx, dy } = getToroidalDelta(camX, camY, ent.baseX, ent.baseY);
      ent.mesh.position.x = camX + dx * (1.0 - ent.parallaxFactor);
      ent.mesh.position.y = camY + dy * (1.0 - ent.parallaxFactor);

      // Respiración biológica sinusoidal suave (pulsación lenta Spore)
      const breathe = 1.0 + Math.sin(time * ent.wobbleSpeed + ent.wobblePhase) * 0.06;
      ent.mesh.scale.x = ent.baseScale * breathe;
      ent.mesh.scale.y = ent.baseScale * (0.90 + Math.cos(time * ent.wobbleSpeed * 0.8 + ent.wobblePhase) * 0.05);

      // Rotación celular lenta
      ent.mesh.rotation.z += ent.rotationSpeed * dt;
    }

    // 2. Pulsación Hidrodinámica de las Bio-Vesículas del Plano Jugable
    for (let i = 0; i < this.bioVesicles.length; i++) {
      const ves = this.bioVesicles[i];
      const pulse = 1.0 + Math.sin(time * ves.pulseSpeed + ves.pulsePhase) * 0.035;
      const d = ves.radius * 2 * pulse;
      ves.mesh.scale.set(d, d, 1);
    }
  }

  public dispose(): void {
    // Remover colisionadores de Rapier2D
    this.bioVesicles.forEach((v) => {
      this.physicsWorld.rawWorld.removeCollider(v.collider, false);
      this.physicsWorld.rawWorld.removeRigidBody(v.body);
    });

    // Limpiar geometrías y materiales
    this.scene.remove(this.deepGroup);
    this.scene.remove(this.vesicleGroup);

    this.softAmoebaTexture.dispose();
    this.deepNucleusTexture.dispose();
    this.vesicleTexture.dispose();
  }
}
