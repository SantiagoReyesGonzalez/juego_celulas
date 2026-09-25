import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import { HydrodynamicsSystem } from '../systems/HydrodynamicsSystem';
import { Player } from '../entities/Player';
import { PredationSystem } from '../systems/PredationSystem';
import { VacuoleManager } from '../systems/VacuoleManager';
import { Hud } from '../ui/Hud';
import { ThreatDirector } from '../systems/ThreatDirector';
import { Minimap, MinimapData } from '../ui/Minimap';
import { BiofilmHub } from '../entities/BiofilmHub';
import { BiofilmChunk } from '../entities/BiofilmChunk';
import { GameOverModal } from '../ui/GameOverModal';
import { AtpOrb } from '../entities/Resources';
import { wrapPosition, isOutsideBounds, getToroidalDelta } from '../physics/WorldTopology';
import { CameraShakeSystem } from '../systems/CameraShakeSystem';
import { BioAudioSystem } from '../audio/BioAudioSystem';
import { TissueArchitecture } from '../environment/TissueArchitecture';

export interface TelemetryData {
  fps: number;
  wasmReady: boolean;
  mouseWorld: THREE.Vector2;
  cellSpeed: number;
  cellMass: number;
  cellScale: number;
  cellTier?: number;
  cellSpecies?: string;
}

export class Stage0 {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;

  private lastWindowWidth = window.innerWidth;
  private lastWindowHeight = window.innerHeight;
  
  // Módulos de Física, Economía e Hidrodinámica
  private physicsWorld!: PhysicsWorld;
  private hydroSystem!: HydrodynamicsSystem;
  private player!: Player;
  private isWasmReady = false;

  // Arquitectura Tisular y Macro-Organismo
  public tissueArchitecture!: TissueArchitecture;

  // Game Feel, Screen Shake y Audio Procedural
  public cameraShake = new CameraShakeSystem();
  public bioAudio = new BioAudioSystem();
  private baseCameraPos = new THREE.Vector2(0, 0);
  private wasSprintingLastFrame = false;

  // Depredación Celular, Sistema Inmunológico y UI
  public vacuoleManager!: VacuoleManager;
  public predationSystem!: PredationSystem;
  public hud!: Hud;
  public threatDirector!: ThreatDirector;
  public minimap!: Minimap;
  private minimapData: MinimapData = {
    player: { x: 0, y: 0, rotation: 0 },
    adipocytes: [],
    bioStructures: [],
    microorganisms: [],
    neutrophils: [],
    macrophage: null,
    nutrients: [],
    biofilmHubs: [],
    biofilmChunks: [],
    tissueWalls: [],
    bioVesicles: [],
  };
  public gameOverModal!: GameOverModal;
  public biofilmHubs: BiofilmHub[] = [];
  public biofilmChunks: BiofilmChunk[] = [];
  private sessionStartTime = performance.now();
  private peakMass = 1.0;

  // Fondo Tisular y Entorno Biológico de Microscopía Cálida (Optimizado con Impostors / InstancedMesh)
  private backgroundMesh!: THREE.Mesh;
  private backgroundMat!: THREE.MeshBasicMaterial;
  private particlesGroup: THREE.Group;
  private erythrocyteInstancedMesh!: THREE.InstancedMesh;
  private deepVesicleInstancedMesh!: THREE.InstancedMesh;
  private sporeParticles?: THREE.Points;
  private dummyObj = new THREE.Object3D();
  private erythrocyteData: {
    x: number;
    y: number;
    z: number;
    baseScale: number;
    rotZ: number;
    rotSpeedX: number;
    rotSpeedZ: number;
    driftPhase: number;
    driftSpeed: number;
  }[] = [];
  private deepVesicleData: {
    x: number;
    y: number;
    z: number;
    baseScale: number;
    pulsePhase: number;
    pulseSpeed: number;
  }[] = [];

  // Interacción y Mouse
  private mouseScreen = new THREE.Vector2(0, 0);
  private mouseWorld = new THREE.Vector2(0, 0);
  private mouseUnprojectVec = new THREE.Vector3();
  private frustumSize = 42;

  // Telemetría y Tiempo
  private clock = new THREE.Clock();
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 60;
  public onTelemetryUpdate?: (data: TelemetryData) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Renderizador WebGL 2.0 (Cheat: antialias false y pixelRatio 1.0 para max FPS)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1.0);
    this.renderer.setClearColor(0x1c0407, 1.0); // Fondo cálido capilar tipo rojito-vino (#1c0407)
    this.renderer.toneMapping = THREE.NoToneMapping;

    // 2. Escena del Caldo Primigenio Cálido (#1c0407) (Cero sobrecarga de shaders)
    this.scene = new THREE.Scene();

    // 3. Cámara Ortográfica 2.5D
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      (-this.frustumSize * aspect) / 2,
      (this.frustumSize * aspect) / 2,
      this.frustumSize / 2,
      -this.frustumSize / 2,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 50);
    this.camera.lookAt(0, 0, 0);

    // 4. Iluminación Biológica Cálida (Miel, Ámbar y Refracción Celular)
    this.setupLighting();

    // 5. Entorno: Fondo Cálido, Glóbulos Rojos Impostor, Vesículas y Esporas Bioluminiscentes
    this.particlesGroup = new THREE.Group();
    this.scene.add(this.particlesGroup);
    this.createWarmMicroscopeBackdrop();
    this.createBackgroundElements();

    // 6. Inicialización de Física e Hidrodinámica
    this.initPhysics();

    // 7. Eventos de Ventana, Ratón y Teclado
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'b' || e.key === 'B') {
        this.toggleErythrocytes();
      }

      // Teclas 1 - 8 para Bio-Mejoras biológicas (estilo Starblast.io)
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 8 && this.vacuoleManager) {
        const upgradeKeys = [
          'propulsion',
          'sprintPower',
          'membraneHardening',
          'cellularRegen',
          'turgor',
          'digestiveEfficiency',
          'chemotaxis',
          'vacuoleCapacity',
        ];
        const upId = upgradeKeys[keyNum - 1];
        if (this.hud) {
          this.hud.handleUpgradeClick(upId);
        } else if (this.vacuoleManager.buyUpgrade(upId)) {
          this.player.applyUpgrades(this.vacuoleManager.upgrades);
        }
      }
    });
  }

  /**
   * Crea el plano de fondo orgánico cálido tipo rojito-naranja de microscopía biológica.
   * Emplea un CanvasTexture 2D con gradiente radial pre-generado (CERO sobrecarga de shaders)
   * con tonos ámbar luminoso, naranja sanguíneo y rojo capilar profundo para alto contraste.
   */
  private createWarmMicroscopeBackdrop(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Gradiente radial cálido: Centro Ámbar/Naranja -> Naranja Rojizo -> Rojo Capilar -> Vino Oscuro
    const grad = ctx.createRadialGradient(256, 256, 15, 256, 256, 256);
    grad.addColorStop(0.0, '#c2410c');  // Naranja cálido luminoso en el centro
    grad.addColorStop(0.30, '#9a3412'); // Ámbar rojizo tisular
    grad.addColorStop(0.60, '#7f1d1d'); // Rojo capilar intenso
    grad.addColorStop(0.85, '#450a0a'); // Borgoña sangre
    grad.addColorStop(1.0, '#1c0407');  // Borde vino tinto profundo

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(1600, 1400);
    this.backgroundMat = new THREE.MeshBasicMaterial({
      map: texture,
      depthWrite: false,
    });

    this.backgroundMesh = new THREE.Mesh(geo, this.backgroundMat);
    this.backgroundMesh.position.set(0, 0, -78);
    this.scene.add(this.backgroundMesh);
  }

  private setupLighting(): void {
    // Luz ambiental de campo somático capilar oscuro (#1a0407) para alto contraste
    const ambientLight = new THREE.AmbientLight(0x1a0407, 1.8);
    this.scene.add(ambientLight);

    // Luz principal direccional en tono miel dorada (#f59e0b) para dar volumen y relieve
    const honeyLight = new THREE.DirectionalLight(0xf59e0b, 2.6);
    honeyLight.position.set(18, 26, 32);
    this.scene.add(honeyLight);

    // Luz de acento y refracción cian/turquesa (#06b6d4) para alto contraste biológico en los bordes
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 2.0);
    rimLight.position.set(-18, -22, 28);
    this.scene.add(rimLight);
  }

  private initPhysics(): void {
    try {
      this.physicsWorld = new PhysicsWorld();
      this.hydroSystem = new HydrodynamicsSystem();
      this.player = new Player(this.physicsWorld, this.scene);

      // Arquitectura Tisular del Macro-Organismo (Paredes Endoteliales, Colágeno, Células Somáticas Gigantes)
      this.tissueArchitecture = new TissueArchitecture(this.scene, this.physicsWorld);

      // Inicialización de Economía Celular y Depredación (Agar.io + Spore)
      this.vacuoleManager = new VacuoleManager();
      this.hud = new Hud(this.vacuoleManager);
      this.predationSystem = new PredationSystem(this.physicsWorld, this.scene, this.player, this.vacuoleManager);

      // Inicialización del Sistema Inmunológico y Director de Amenazas (Etapa 5)
      this.threatDirector = new ThreatDirector(this.physicsWorld, this.scene);
      this.threatDirector.onThreatChanged = (threat) => {
        this.hud.updateThreat(threat);
      };
      this.threatDirector.onWarningAlert = (title, desc, level) => {
        this.hud.showThreatAlert(title, desc, level);
      };

      // Notificar al Director de Amenazas cuando la bacteria consume tejido o presas
      this.predationSystem.onPredationActivity = (type) => {
        if (type === 'pellet') {
          this.bioAudio.playEatPop(1.1);
          this.threatDirector.addInflammation(0.0035);
        } else if (type === 'microorganism') {
          this.bioAudio.playEatPop(0.75);
          this.cameraShake.addTrauma(0.18);
          this.threatDirector.addInflammation(0.016);
        } else if (type === 'adipocyte') {
          this.bioAudio.playImpactThud(1.2);
          this.cameraShake.addTrauma(0.25);
          this.threatDirector.addInflammation(0.022);
        }
      };

      // Notificaciones de recolección de nutrientes de bio-estructuras (Calcio, Péptidos, Esporas, Mitocondrias)
      this.predationSystem.onSpecializedNutrientCollected = (text, color) => {
        this.hud.showCustomPopup(text, color);
        this.threatDirector.addInflammation(0.008);

        if (text.includes('Destruido') || text.includes('Cristal')) {
          this.bioAudio.playCrystalCrunch();
          this.cameraShake.addTrauma(0.42);
          this.cameraShake.triggerHitStop(45);
        } else if (text.includes('Vibrión')) {
          this.bioAudio.playLysisExplosion();
          this.cameraShake.addTrauma(0.48);
          this.cameraShake.triggerHitStop(45);
        } else if (text.includes('Escudo') || text.includes('Calcio')) {
          this.bioAudio.playCrystalCrunch();
        } else if (text.includes('HP') || text.includes('Vitalidad') || text.includes('Mitocondrial')) {
          this.bioAudio.playHealChime();
        } else if (text.includes('Sobrecarga')) {
          this.bioAudio.playSprintWoosh();
        }
      };

      this.vacuoleManager.addStatsListener((stats) => {
        this.player.syncSizeWithHealth(stats.membraneIntegrity, stats.maxMembraneIntegrity);
      });
      this.vacuoleManager.addUpgradePurchasedListener((upId, up) => {
        this.player.applyUpgrades(this.vacuoleManager.upgrades);
        if (upId === 'membraneHardening' || upId === 'cellularRegen') {
          this.player.triggerHealPulse(this.scene);
        } else if (upId === 'turgor') {
          this.player.triggerShieldPulse(this.scene);
        } else {
          this.player.feedBounce(1.16);
        }
        this.hud.showCustomPopup(`🧬 ${up.name} Niv. ${up.level}/5!`, '#10b981');
      });
      this.player.syncSizeWithHealth(this.vacuoleManager.membraneIntegrity, this.vacuoleManager.maxMembraneIntegrity);
      this.player.applyUpgrades(this.vacuoleManager.upgrades);

      // 5. Inicialización del Mini-Mapa Radar Biológico (Estilo Starblast.io)
      this.minimap = new Minimap();

      // 6. Nódulos de Biopelícula Caústica (Mega-Alimento en 2 Capas: 60 Impactos y Campo Ácido)
      this.biofilmHubs = [
        new BiofilmHub(this.physicsWorld, this.scene, 0, 0, 20.0, 'Nódulo Caústico Alfa (Central - 60 Golpes)'),
        new BiofilmHub(this.physicsWorld, this.scene, 210, 160, 18.0, 'Nódulo Caústico Beta (60 Golpes)'),
        new BiofilmHub(this.physicsWorld, this.scene, -210, -160, 18.0, 'Nódulo Caústico Gamma (60 Golpes)'),
      ];

      // 7. Modal de Game Over y Lisis Celular
      this.gameOverModal = new GameOverModal();
      this.gameOverModal.onRespawnClick = () => {
        this.handlePlayerRespawn();
      };
      this.vacuoleManager.onDeath = (cause) => {
        this.handlePlayerDeath(cause);
      };

      this.isWasmReady = true;
      console.log('✅ Rapier2D WASM, Hidrodinámica, Sistema Inmune, Evolución y Mini-Mapa inicializados');
    } catch (err) {
      console.error('Error inicializando Rapier2D / Player:', err);
    }
  }

  /**
   * Cheat de Alto Rendimiento: Pre-renderiza un eritrocito bicóncavo con sombreado 3D
   * toroidal y depresión cóncava central directamente sobre un lienzo 2D en memoria.
   */
  private createPreRenderedErythrocyteTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const cx = 64;
    const cy = 64;

    // 1. Sombra volumétrica exterior difusa
    const shadowGrad = ctx.createRadialGradient(cx, cy, 38, cx, cy, 62);
    shadowGrad.addColorStop(0.0, 'rgba(40, 6, 8, 0.55)');
    shadowGrad.addColorStop(0.85, 'rgba(40, 6, 8, 0.15)');
    shadowGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.fill();

    // 2. Disco toroide exterior (curvatura bicóncava de hemoglobina)
    const bodyGrad = ctx.createRadialGradient(cx - 10, cy - 10, 8, cx, cy, 54);
    bodyGrad.addColorStop(0.0, '#dc2626');  // Brillo volumétrico esférico arterial
    bodyGrad.addColorStop(0.40, '#b91c1c'); // Rojo eritrocito cálido
    bodyGrad.addColorStop(0.75, '#7f1d1d'); // Sombra de curvatura somática
    bodyGrad.addColorStop(0.95, '#450a0a'); // Borde perimetral denso
    bodyGrad.addColorStop(1.0, 'rgba(69, 10, 10, 0)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, Math.PI * 2);
    ctx.fill();

    // 3. Depresión cóncava central característica (sin agujero)
    const dimpleGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 25);
    dimpleGrad.addColorStop(0.0, '#2a0507'); // Pozo cóncavo profundo
    dimpleGrad.addColorStop(0.65, '#5c0d11');
    dimpleGrad.addColorStop(1.0, 'rgba(185, 28, 28, 0)');
    ctx.fillStyle = dimpleGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fill();

    // 4. Especular sutil en el reborde superior
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx - 12, cy - 16, 22, 9, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(254, 202, 202, 0.28)';
    ctx.fill();
    ctx.restore();

    return new THREE.CanvasTexture(canvas);
  }

  private createBackgroundElements(): void {
    // 1. Capa densa de fondo: Glóbulos Rojos con Impostor Pre-renderizado e InstancedMesh (1 Solo Draw Call)
    const rbcTexture = this.createPreRenderedErythrocyteTexture();
    const rbcMat = new THREE.MeshBasicMaterial({
      map: rbcTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    const erythrocyteCount = 40;
    const rbcGeo = new THREE.PlaneGeometry(6.5, 6.5, 1, 1);
    this.erythrocyteInstancedMesh = new THREE.InstancedMesh(rbcGeo, rbcMat, erythrocyteCount);
    this.scene.add(this.erythrocyteInstancedMesh);
    this.erythrocyteData = [];

    for (let i = 0; i < erythrocyteCount; i++) {
      const z = -30 - Math.random() * 30;
      const x = (Math.random() - 0.5) * 750;
      const y = (Math.random() - 0.5) * 650;
      const scale = 1.0 + Math.random() * 1.4;
      const rotZ = Math.random() * Math.PI * 2;

      this.dummyObj.position.set(x, y, z);
      this.dummyObj.rotation.z = rotZ;
      this.dummyObj.scale.set(scale, scale, 1);
      this.dummyObj.updateMatrix();
      this.erythrocyteInstancedMesh.setMatrixAt(i, this.dummyObj.matrix);

      this.erythrocyteData.push({
        x,
        y,
        z,
        baseScale: scale,
        rotZ,
        rotSpeedX: (Math.random() - 0.5) * 0.45,
        rotSpeedZ: (Math.random() - 0.5) * 0.25,
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.25 + Math.random() * 0.35,
      });
    }
    this.erythrocyteInstancedMesh.instanceMatrix.needsUpdate = true;

    // 2. Capa densa de Vesículas Lipídicas y Vacuolas en Z (-30 a -60) con InstancedMesh (1 Solo Draw Call)
    const canvasVes = document.createElement('canvas');
    canvasVes.width = 128;
    canvasVes.height = 128;
    const vctx = canvasVes.getContext('2d')!;
    const vgrad = vctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    vgrad.addColorStop(0.0, 'rgba(254, 240, 138, 0.14)');
    vgrad.addColorStop(0.55, 'rgba(245, 158, 11, 0.28)');
    vgrad.addColorStop(0.85, 'rgba(244, 63, 94, 0.45)');
    vgrad.addColorStop(0.96, 'rgba(255, 235, 175, 0.88)');
    vgrad.addColorStop(1.0, 'rgba(255, 235, 175, 0.0)');
    vctx.fillStyle = vgrad;
    vctx.beginPath();
    vctx.arc(64, 64, 60, 0, Math.PI * 2);
    vctx.fill();
    const vesTexture = new THREE.CanvasTexture(canvasVes);

    const vesGeo = new THREE.PlaneGeometry(1, 1);
    const vesicleCount = 20;
    const vMat = new THREE.MeshBasicMaterial({
      map: vesTexture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.deepVesicleInstancedMesh = new THREE.InstancedMesh(vesGeo, vMat, vesicleCount);
    this.scene.add(this.deepVesicleInstancedMesh);
    this.deepVesicleData = [];

    for (let i = 0; i < vesicleCount; i++) {
      const z = -30 - Math.random() * 30;
      const x = (Math.random() - 0.5) * 750;
      const y = (Math.random() - 0.5) * 650;
      const baseScale = 14 + Math.random() * 22;

      this.dummyObj.position.set(x, y, z);
      this.dummyObj.rotation.z = Math.random() * Math.PI * 2;
      this.dummyObj.scale.set(baseScale, baseScale, 1);
      this.dummyObj.updateMatrix();
      this.deepVesicleInstancedMesh.setMatrixAt(i, this.dummyObj.matrix);

      this.deepVesicleData.push({
        x,
        y,
        z,
        baseScale,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 0.5,
      });
    }
    this.deepVesicleInstancedMesh.instanceMatrix.needsUpdate = true;

    // 3. Partículas de Esporas Doradas Bioluminiscentes Flotantes (Points - 1 Solo Draw Call)
    const sporeCanvas = document.createElement('canvas');
    sporeCanvas.width = 64;
    sporeCanvas.height = 64;
    const sctx = sporeCanvas.getContext('2d')!;
    const sgrad = sctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    sgrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    sgrad.addColorStop(0.22, 'rgba(254, 240, 138, 0.95)');
    sgrad.addColorStop(0.60, 'rgba(245, 158, 11, 0.70)');
    sgrad.addColorStop(1.0, 'rgba(180, 83, 9, 0.0)');
    sctx.fillStyle = sgrad;
    sctx.beginPath();
    sctx.arc(32, 32, 30, 0, Math.PI * 2);
    sctx.fill();
    const sporeTexture = new THREE.CanvasTexture(sporeCanvas);

    const sporeCount = 400;
    const sporePositions = new Float32Array(sporeCount * 3);
    for (let i = 0; i < sporeCount; i++) {
      sporePositions[i * 3] = (Math.random() - 0.5) * 750;
      sporePositions[i * 3 + 1] = (Math.random() - 0.5) * 650;
      sporePositions[i * 3 + 2] = -25 + Math.random() * 35;
    }

    const sporeGeo = new THREE.BufferGeometry();
    sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePositions, 3));
    const sporeMat = new THREE.PointsMaterial({
      map: sporeTexture,
      color: 0xffea75,
      size: 1.5,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sporeParticles = new THREE.Points(sporeGeo, sporeMat);
    this.particlesGroup.add(this.sporeParticles);
  }

  /**
   * Permite alternar la visibilidad de los eritrocitos del fondo en tiempo real
   */
  public toggleErythrocytes(): boolean {
    if (this.erythrocyteInstancedMesh) {
      this.erythrocyteInstancedMesh.visible = !this.erythrocyteInstancedMesh.visible;
      return this.erythrocyteInstancedMesh.visible;
    }
    return false;
  }

  private onResize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = (-this.frustumSize * aspect) / 2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;
    this.camera.updateProjectionMatrix();

    if (window.innerWidth !== this.lastWindowWidth || window.innerHeight !== this.lastWindowHeight) {
      this.lastWindowWidth = window.innerWidth;
      this.lastWindowHeight = window.innerHeight;
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(1.0);
    }
  }

  public updateMouseWorld(): void {
    this.mouseUnprojectVec.set(this.mouseScreen.x, this.mouseScreen.y, 0);
    this.mouseUnprojectVec.unproject(this.camera);
    this.mouseWorld.set(this.mouseUnprojectVec.x, this.mouseUnprojectVec.y);

    if (this.player) {
      this.player.mouseWorld.copy(this.mouseWorld);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouseScreen.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseScreen.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.updateMouseWorld();
  }

  public update(): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // Actualizar sistema de Screen Shake y Hit-Stop
    const isHitStopped = this.cameraShake.isHitStopped();
    const shake = this.cameraShake.update(dt);

    // 0. Sincronizar coordenadas mundiales del cursor con la cámara antes del step de físicas
    this.updateMouseWorld();

    // 1. Simulación Física Determinista Rapier2D a 60 Hz con Hidrodinámica
    if (this.isWasmReady && this.physicsWorld && this.player) {
      this.vacuoleManager.isInvulnerable = this.player.invulnerabilityTimer > 0;
      if (this.player.currentMass > this.peakMass) {
        this.peakMass = this.player.currentMass;
      }

      // Sonido reactivo de sprint
      if (this.player.isSprinting && !this.wasSprintingLastFrame) {
        this.bioAudio.playSprintWoosh();
      }
      this.wasSprintingLastFrame = this.player.isSprinting;

      // Latido cardíaco en baja salud (< 35% HP)
      const hpPercent = this.vacuoleManager.maxHp > 0 ? this.vacuoleManager.currentHp / this.vacuoleManager.maxHp : 1.0;
      this.bioAudio.updateHeartbeat(hpPercent, time);

      // Si hay un hit-stop activo (micro-pausa de 35-50ms), congelar simulación física para transmitir impacto
      if (!isHitStopped) {
        this.physicsWorld.step(dt, (fixedDt) => {
          this.player.physicsUpdate(fixedDt, this.hydroSystem, this.vacuoleManager);
        });

        // 2. Actualización de Economía Celular y Depredación (Agar.io + Spore)
        if (this.vacuoleManager) {
          this.vacuoleManager.update(dt);
          if (this.hud) {
            this.hud.updateStats(this.vacuoleManager.getStats());
          }
        }
        if (this.predationSystem) {
          this.predationSystem.update(dt, time);
        }

        // 3.5. Vaso Capilar Continuo ("Dark Capillary" - 60 FPS)
        const curPlayerPos = this.player.body.translation();
        const playerRadius = this.player.baseRadius * this.player.currentScale;

        if (this.tissueArchitecture) {
          this.tissueArchitecture.update(dt, time);
        }

        // 3.6. Nódulos de Biopelícula Caústica (Mega-Alimento en 2 Capas y 60 Impactos - 3x Dificultad)
        let isPlayerInCausticField = false;
        let activeHubName = '';
        let activeHubHealth = 60;
        let activeHubMaxHealth = 60;

        for (const hub of this.biofilmHubs) {
          const res = hub.update(dt, time, curPlayerPos, this.vacuoleManager);
          if (res.inField) {
            isPlayerInCausticField = true;
            activeHubName = res.name;
            activeHubHealth = res.health;
            activeHubMaxHealth = res.maxHealth;
          }

          // Contacto físico con el núcleo central blindado (60 impactos)
          if (!hub.isDestroyed && this.predationSystem) {
            const { dx, dy, dist } = getToroidalDelta(curPlayerPos.x, curPlayerPos.y, hub.position.x, hub.position.y);
            if (dist <= playerRadius + hub.coreRadius + 0.45) {
              const isRamming = this.player.isSprinting && (this.player.getSpeed() > 11.2 || this.player.currentMass >= 1.35);
              if (isRamming) {
                const hitRes = hub.hitCore(
                  time,
                  this.scene,
                  this.physicsWorld,
                  this.predationSystem.atpOrbs,
                  this.biofilmChunks,
                  this.player,
                  this.vacuoleManager
                );

                if (hitRes.recoilDamage > 0) {
                  this.bioAudio.playImpactThud(1.4);
                  this.cameraShake.addTrauma(0.35);
                  this.cameraShake.triggerHitStop(40);

                  const angle = Math.atan2(dy, dx);
                  this.player.body.applyImpulse({ x: -Math.cos(angle) * 48.0, y: -Math.sin(angle) * 48.0 }, true);
                  this.player.feedBounce(1.22);
                  this.hud.showCustomPopup(`💥 -7.5 HP (Retroceso Cáustico) | Núcleo: ${hub.health}/60`, '#ef4444');

                  if (hitRes.destroyed) {
                    this.bioAudio.playLysisExplosion();
                    this.cameraShake.addTrauma(0.55);
                    this.hud.showCustomPopup('🌟 ¡MEGA-NÓDULO DESTRUIDO TRAS 60 GOLPES! FESTÍN COLOSAL', '#10b981');
                  }
                }
              } else {
                this.vacuoleManager.takeDamage(9.0 * dt, 'Espículas Cáusticas de Núcleo');
                const angle = Math.atan2(dy, dx);
                this.player.body.applyImpulse({ x: -Math.cos(angle) * 12.0 * dt, y: -Math.sin(angle) * 12.0 * dt }, true);
              }
            }
          }
        }

        if (this.hud) {
          this.hud.setSanctuaryStatus(isPlayerInCausticField, activeHubName, activeHubHealth, activeHubMaxHealth);
        }

        // 3.6. Actualización y Engullimiento de Trozos de Biopelícula (BiofilmChunks)
        for (let i = this.biofilmChunks.length - 1; i >= 0; i--) {
          const chunk = this.biofilmChunks[i];
          chunk.update(dt, time);

          let cPos = chunk.body.translation();
          if (isOutsideBounds(cPos.x, cPos.y)) {
            const wrapped = wrapPosition(cPos.x, cPos.y);
            chunk.body.setTranslation(wrapped, true);
            cPos = chunk.body.translation();
          }

          const { dist: cDist } = getToroidalDelta(curPlayerPos.x, curPlayerPos.y, cPos.x, cPos.y);
          if (cDist <= playerRadius + chunk.radius + 0.35) {
            chunk.isConsumed = true;
            this.player.grow(chunk.massValue);
            this.vacuoleManager.addAtp(chunk.atpValue);
            this.player.feedBounce(1.15);
            this.bioAudio.playEatPop(0.9);
            this.hud.showCustomPopup(`+${chunk.massValue} µg (Trozo Biopelícula)`, '#14b8a6');
            chunk.dispose(this.scene, this.physicsWorld);
            this.biofilmChunks.splice(i, 1);
          }
        }

        // 4. Sistema Inmunológico y Depredación Hostil (Etapa 5)
        if (this.threatDirector) {
          this.threatDirector.update(
            dt,
            time,
            this.player,
            this.vacuoleManager,
            this.predationSystem.atpOrbs,
            (text, _x, _y, color) => {
              this.hud.showCustomPopup(text, color);
            },
            false
          );
        }
      }

      // 4. Actualización Visual del Jugador (Posición, Rotación y Flagelos)
      this.player.visualUpdate(dt, time);

      // 5. Envolvente Toroidal del Jugador (Wrapping)
      let playerPos = this.player.body.translation();
      if (isOutsideBounds(playerPos.x, playerPos.y)) {
        const wrapped = wrapPosition(playerPos.x, playerPos.y);
        this.player.body.setTranslation(wrapped, true);
        this.player.group.position.set(wrapped.x, wrapped.y, 0);
        playerPos = this.player.body.translation();
      }

      // 6. Seguimiento Suave y Continuo de Cámara (Toroidal Seamless Follow) + Screen Shake
      const { dx, dy } = getToroidalDelta(
        this.baseCameraPos.x,
        this.baseCameraPos.y,
        playerPos.x,
        playerPos.y
      );
      this.baseCameraPos.x += dx * Math.min(dt * 3.5, 1.0);
      this.baseCameraPos.y += dy * Math.min(dt * 3.5, 1.0);

      const wrappedCam = wrapPosition(this.baseCameraPos.x, this.baseCameraPos.y);
      this.baseCameraPos.x = wrappedCam.x;
      this.baseCameraPos.y = wrappedCam.y;

      // Aplicar posición con sacudida no lineal y rotación Z
      this.camera.position.set(
        this.baseCameraPos.x + shake.x,
        this.baseCameraPos.y + shake.y,
        50
      );
      this.camera.rotation.z = shake.roll;

      // Zoom dinámico suave al crecer la bacteria
      const targetFrustum = 42.0 * Math.pow(this.player.currentScale, 0.28);
      if (Math.abs(this.frustumSize - targetFrustum) > 0.05) {
        this.frustumSize += (targetFrustum - this.frustumSize) * Math.min(dt * 2.5, 1.0);
        this.onResize();
      }

      // Re-proyectar coordenadas mundiales del cursor con la nueva posición de cámara
      this.updateMouseWorld();
    }

    // 7. Actualización del Fondo Orgánico Cálido de Microscopía
    if (this.backgroundMesh) {
      this.backgroundMesh.position.set(this.baseCameraPos.x, this.baseCameraPos.y, -78);
    }

    // 7.2. Deriva y Tumbling 3D Simulado de Glóbulos Rojos (InstancedMesh - 1 Solo Draw Call)
    if (this.erythrocyteInstancedMesh && this.erythrocyteInstancedMesh.visible) {
      for (let i = 0; i < this.erythrocyteData.length; i++) {
        const ed = this.erythrocyteData[i];
        ed.rotZ += ed.rotSpeedZ * dt;
        ed.x += Math.sin(time * ed.driftSpeed + ed.driftPhase) * 0.03;
        ed.y += Math.cos(time * ed.driftSpeed * 0.85 + ed.driftPhase) * 0.025;

        if (isOutsideBounds(ed.x, ed.y, 25)) {
          const wrapped = wrapPosition(ed.x, ed.y);
          ed.x = wrapped.x;
          ed.y = wrapped.y;
        }

        // Tumbling simulado con oscilación de escala para simular giro 3D
        const tumble = 0.82 + Math.sin(time * ed.rotSpeedX + ed.driftPhase) * 0.28;
        this.dummyObj.position.set(ed.x, ed.y, ed.z);
        this.dummyObj.rotation.z = ed.rotZ;
        this.dummyObj.scale.set(ed.baseScale * tumble, ed.baseScale, 1.0);
        this.dummyObj.updateMatrix();
        this.erythrocyteInstancedMesh.setMatrixAt(i, this.dummyObj.matrix);
      }
      this.erythrocyteInstancedMesh.instanceMatrix.needsUpdate = true;
    }

    // 7.4. Pulsación Hidrodinámica y Deriva de Vesículas Densas (InstancedMesh - 1 Solo Draw Call)
    if (this.deepVesicleInstancedMesh) {
      for (let i = 0; i < this.deepVesicleData.length; i++) {
        const vd = this.deepVesicleData[i];
        const pulse = 1.0 + Math.sin(time * vd.pulseSpeed + vd.pulsePhase) * 0.05;
        const s = vd.baseScale * pulse;
        vd.x += Math.cos(time * 0.22 + vd.pulsePhase) * 0.02;
        vd.y += Math.sin(time * 0.26 + vd.pulsePhase) * 0.018;

        if (isOutsideBounds(vd.x, vd.y, 30)) {
          const wrapped = wrapPosition(vd.x, vd.y);
          vd.x = wrapped.x;
          vd.y = wrapped.y;
        }

        this.dummyObj.position.set(vd.x, vd.y, vd.z);
        this.dummyObj.rotation.z = vd.pulsePhase;
        this.dummyObj.scale.set(s, s, 1.0);
        this.dummyObj.updateMatrix();
        this.deepVesicleInstancedMesh.setMatrixAt(i, this.dummyObj.matrix);
      }
      this.deepVesicleInstancedMesh.instanceMatrix.needsUpdate = true;
    }

    // 7.5. Deriva fluida de las micro-esporas doradas bioluminiscentes (sin sobrecarga CPU ni re-subida de buffers)
    if (this.particlesGroup) {
      this.particlesGroup.position.x = Math.sin(time * 0.20) * 2.5;
      this.particlesGroup.position.y = Math.cos(time * 0.17) * 2.0;
    }

    // 7.8. Actualización de la Atmósfera Spore (Macro-Organismos en DoF, Bio-Vesículas y Bokeh)
    if (this.tissueArchitecture) {
      this.tissueArchitecture.update(dt, time, this.baseCameraPos);
    }

    // 8. Actualización en Tiempo Real del Mini-Mapa Radar Biológico (60 FPS Nativos, Zero-GC por paso directo de referencias)
    if (this.minimap && this.minimap.isVisible && this.player) {
      const pPos = this.player.body.translation();
      const pRot = this.player.body.rotation();

      this.minimapData.player.x = pPos.x;
      this.minimapData.player.y = pPos.y;
      this.minimapData.player.rotation = pRot;

      this.minimapData.adipocytes = this.predationSystem ? this.predationSystem.adipocytes : [];
      this.minimapData.bioStructures = this.predationSystem ? this.predationSystem.bioStructures : [];
      this.minimapData.microorganisms = this.predationSystem ? this.predationSystem.microorganisms : [];
      this.minimapData.neutrophils = this.threatDirector ? this.threatDirector.neutrophils : [];
      this.minimapData.macrophage =
        this.threatDirector &&
        this.threatDirector.macrophage &&
        !this.threatDirector.macrophage.isDead
          ? this.threatDirector.macrophage
          : null;
      this.minimapData.nutrients = this.predationSystem ? this.predationSystem.nutrients : [];
      this.minimapData.biofilmHubs = this.biofilmHubs;
      this.minimapData.biofilmChunks = this.biofilmChunks;
      this.minimapData.tissueWalls = this.tissueArchitecture ? this.tissueArchitecture.wallSegments : [];
      this.minimapData.bioVesicles = this.tissueArchitecture ? this.tissueArchitecture.vesiclesData : [];

      this.minimap.update(time, this.minimapData);
    }

    // 5. Telemetría y Estadísticas
    this.frameCount++;
    if (time - this.lastFpsUpdate >= 0.35) {
      this.currentFps = Math.round(this.frameCount / (time - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = time;

      if (this.onTelemetryUpdate) {
        const speed = this.player ? this.player.getSpeed() : 0;
        const mass = this.player ? this.player.currentMass : 1.0;
        const scale = this.player ? this.player.currentScale : 1.0;
        const tier = this.player ? this.player.currentSpecies.tier : 1;
        const species = this.player ? this.player.currentSpecies.name : 'Bacilo';
        this.onTelemetryUpdate({
          fps: this.currentFps,
          wasmReady: this.isWasmReady,
          mouseWorld: this.mouseWorld.clone(),
          cellSpeed: Math.round(speed * 10) / 10,
          cellMass: Math.round(mass * 100) / 100,
          cellScale: Math.round(scale * 100) / 100,
          cellTier: tier,
          cellSpecies: species,
        });
      }
    }

    // 6. Renderizado Directo de Alto Rendimiento (60+ FPS sin sobrecarga de post-procesamiento)
    this.renderer.render(this.scene, this.camera);
  }

  private handlePlayerDeath(cause: string): void {
    if (!this.player || this.gameOverModal.isOpen()) return;

    // 1. Calcular duración de supervivencia en la sesión
    const elapsedSec = Math.floor((performance.now() - this.sessionStartTime) / 1000);
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = (elapsedSec % 60).toString().padStart(2, '0');
    const survivalTime = `${mins}:${secs}`;

    // 2. Dispersión y derrame de ATP por lisis bacteriana
    if (this.predationSystem && this.vacuoleManager.atp > 0) {
      const dropCount = Math.min(18, Math.max(3, Math.floor(this.vacuoleManager.atp / 2.5)));
      const pPos = this.player.body.translation();
      for (let i = 0; i < dropCount; i++) {
        const angle = (i / dropCount) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 3.5 + Math.random() * 5.0;
        const orb = new AtpOrb(
          this.scene,
          pPos.x + Math.cos(angle) * 1.5,
          pPos.y + Math.sin(angle) * 1.5,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          4
        );
        this.predationSystem.atpOrbs.push(orb);
      }
    }

    const species = this.player.currentSpecies;
    const finalMass = Math.max(this.peakMass, this.player.currentMass);
    const atpRemaining = this.vacuoleManager.atp;

    // 3. Ejecutar animación de lisis celular y despliegue del modal de Game Over
    this.player.triggerLysis(this.scene, () => {
      this.gameOverModal.open({
        speciesName: species.name,
        speciesRole: species.role,
        peakMass: Math.round(finalMass * 100) / 100,
        atp: Math.round(atpRemaining),
        survivalTime,
        cause,
      });
    });
  }

  private handlePlayerRespawn(): void {
    this.player.respawn(0, 0);
    this.vacuoleManager.resetForRespawn();
    this.sessionStartTime = performance.now();
    this.peakMass = 1.0;
    this.camera.position.set(0, 0, 50);
    this.hud.showCustomPopup('🛡️ ESPORA GERMINADA: 3s DE INMUNIDAD', '#10b981');
  }
}
