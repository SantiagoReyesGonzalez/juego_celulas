import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import { HydrodynamicsSystem } from '../systems/HydrodynamicsSystem';
import { Player } from '../entities/Player';
import { PredationSystem } from '../systems/PredationSystem';
import { VacuoleManager } from '../systems/VacuoleManager';
import { Hud } from '../ui/Hud';
import { EvolutionSystem } from '../systems/EvolutionSystem';
import { MitosisModal } from '../ui/MitosisModal';
import { ThreatDirector } from '../systems/ThreatDirector';

export interface TelemetryData {
  fps: number;
  wasmReady: boolean;
  mouseWorld: THREE.Vector2;
  cellSpeed: number;
  cellMass: number;
  cellScale: number;
}

export class Stage0 {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  
  // Módulos de Física, Economía e Hidrodinámica
  private physicsWorld!: PhysicsWorld;
  private hydroSystem!: HydrodynamicsSystem;
  private player!: Player;
  private isWasmReady = false;

  // Depredación Celular, Evolución, Sistema Inmunológico y UI
  public vacuoleManager!: VacuoleManager;
  public predationSystem!: PredationSystem;
  public hud!: Hud;
  public evolutionSystem!: EvolutionSystem;
  public mitosisModal!: MitosisModal;
  public threatDirector!: ThreatDirector;

  // Fondo Tisular y Entorno Biológico
  private particlesGroup: THREE.Group;
  private erythrocyteGroup: THREE.Group;

  // Interacción y Mouse
  private mouseScreen = new THREE.Vector2(0, 0);
  private mouseWorld = new THREE.Vector2(0, 0);
  private frustumSize = 42;

  // Telemetría y Tiempo
  private clock = new THREE.Clock();
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 60;
  public onTelemetryUpdate?: (data: TelemetryData) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Renderizador WebGL 2.0
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x060913, 1.0);

    // 2. Escena y Niebla Tisular Suave
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x060913, 45, 110);

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

    // 4. Iluminación Biológica de Alto Contraste
    this.setupLighting();

    // 5. Entorno: Glóbulos Rojos y Nutrientes Flotantes
    this.particlesGroup = new THREE.Group();
    this.erythrocyteGroup = new THREE.Group();
    this.scene.add(this.erythrocyteGroup);
    this.scene.add(this.particlesGroup);
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

      // Teclas 1 - 6 para Bio-Mejoras biológicas
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 6 && this.vacuoleManager) {
        const upgradeKeys = ['propulsion', 'sprintPower', 'digestiveEfficiency', 'chemotaxis', 'turgor', 'vacuoleCapacity'];
        const upId = upgradeKeys[keyNum - 1];
        if (this.vacuoleManager.buyUpgrade(upId)) {
          this.player.applyUpgrades(this.vacuoleManager.upgrades);
        }
      }
    });
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x2a3b4c, 2.5);
    this.scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0x00ffcc, 4.5);
    rimLight.position.set(12, 22, 30);
    this.scene.add(rimLight);

    const warmFill = new THREE.PointLight(0xffa500, 3.5, 120);
    warmFill.position.set(-18, -12, 25);
    this.scene.add(warmFill);
  }

  private initPhysics(): void {
    try {
      this.physicsWorld = new PhysicsWorld();
      this.hydroSystem = new HydrodynamicsSystem();
      this.player = new Player(this.physicsWorld, this.scene);

      // Inicialización de Economía Celular y Depredación (Agar.io + Spore)
      this.vacuoleManager = new VacuoleManager();
      this.hud = new Hud(this.vacuoleManager);
      this.predationSystem = new PredationSystem(this.physicsWorld, this.scene, this.player, this.vacuoleManager);

      // Inicialización de Evolución Celular y Mitosis (Etapa 3)
      this.evolutionSystem = new EvolutionSystem(this.physicsWorld, this.scene, this.player, this.vacuoleManager);
      this.mitosisModal = new MitosisModal(this.evolutionSystem, this.player);

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
          this.threatDirector.addInflammation(0.0035);
        } else if (type === 'microorganism') {
          this.threatDirector.addInflammation(0.016);
        } else if (type === 'adipocyte') {
          this.threatDirector.addInflammation(0.022);
        }
      };

      this.hud.onMitosisClick = () => {
        this.mitosisModal.open();
      };

      this.mitosisModal.onMitosisNotReady = (current, cap) => {
        this.hud.showCustomPopup(`⚠️ Mitosis bloqueada: ${current} / ${cap} ATP necesarios`, '#f59e0b');
      };

      this.vacuoleManager.addStatsListener(() => {
        this.player.applyUpgrades(this.vacuoleManager.upgrades);
      });
      this.player.applyUpgrades(this.vacuoleManager.upgrades);

      this.isWasmReady = true;
      console.log('✅ Rapier2D WASM, Hidrodinámica, Sistema Inmune y Evolución inicializados a 60 Hz');
    } catch (err) {
      console.error('Error inicializando Rapier2D / Player:', err);
    }
  }

  private createBackgroundElements(): void {
    // 1. Glóbulos Rojos (Eritrocitos Bicóncavos Biológicos Reales - Sin Agujero de Dona)
    const rbcGeo = this.createBiconcaveErythrocyteGeometry(1.6);
    const rbcMat = new THREE.MeshStandardMaterial({
      color: 0x9b1b1b,
      emissive: 0x3d0707,
      emissiveIntensity: 0.35,
      roughness: 0.32,
      metalness: 0.08,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < 28; i++) {
      const rbc = new THREE.Mesh(rbcGeo, rbcMat);
      rbc.position.set(
        (Math.random() - 0.5) * 85,
        (Math.random() - 0.5) * 65,
        -6 - Math.random() * 12
      );
      // Inclinación suave y natural para apreciar la concavidad central sin orificio
      rbc.rotation.set(
        0.35 + (Math.random() - 0.5) * 0.7,
        (Math.random() - 0.5) * 0.7,
        Math.random() * Math.PI * 2
      );
      const scale = 0.7 + Math.random() * 0.5;
      rbc.scale.set(scale, scale, scale);
      this.erythrocyteGroup.add(rbc);
    }
  }

  /**
   * Genera la morfología biológica de un eritrocito humano (disco bicóncavo sólido sin agujero central).
   * Implementación basada en la formulación de Evans & Fung (1972).
   */
  private createBiconcaveErythrocyteGeometry(radius = 1.6): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const numSteps = 24;

    // Perfil superior: del centro cóncavo (r = 0) hacia el borde exterior grueso (r = radius)
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const r = t * radius;
      const factor = Math.sqrt(Math.max(0, 1.0 - t * t * 0.96));
      const h = (0.18 + 0.95 * t * t - 0.75 * Math.pow(t, 4)) * factor;
      points.push(new THREE.Vector2(r, Math.max(h, 0.04)));
    }

    // Perfil inferior: del borde exterior grueso de regreso al centro cóncavo inferior
    for (let i = numSteps; i >= 0; i--) {
      const t = i / numSteps;
      const r = t * radius;
      const factor = Math.sqrt(Math.max(0, 1.0 - t * t * 0.96));
      const h = (0.18 + 0.95 * t * t - 0.75 * Math.pow(t, 4)) * factor;
      points.push(new THREE.Vector2(r, -Math.max(h, 0.04)));
    }

    const geo = new THREE.LatheGeometry(points, 32);
    // Orientar para que la concavidad apunte hacia el plano de la cámara (Z)
    geo.rotateX(Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Permite alternar la visibilidad de los eritrocitos del fondo en tiempo real
   */
  public toggleErythrocytes(): boolean {
    this.erythrocyteGroup.visible = !this.erythrocyteGroup.visible;
    return this.erythrocyteGroup.visible;
  }

  private onResize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = (-this.frustumSize * aspect) / 2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouseScreen.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseScreen.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Convertir a coordenadas mundiales Three.js
    const vector = new THREE.Vector3(this.mouseScreen.x, this.mouseScreen.y, 0);
    vector.unproject(this.camera);
    this.mouseWorld.set(vector.x, vector.y);

    if (this.player) {
      this.player.mouseWorld.copy(this.mouseWorld);
    }
  }

  public update(): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // 1. Simulación Física Determinista Rapier2D a 60 Hz con Hidrodinámica
    if (this.isWasmReady && this.physicsWorld && this.player) {
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

      // 3. Actualización de Evolución Celular y Mitosis
      if (this.evolutionSystem) {
        this.evolutionSystem.update(dt);
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
          }
        );
      }

      // 4. Actualización Visual del Jugador (Posición, Rotación y Flagelos)
      this.player.visualUpdate(dt, time);

      // 5. Seguimiento Suave de la Cámara al Jugador y Zoom Orgánico (Agar.io)
      const playerPos = this.player.body.translation();
      this.camera.position.x += (playerPos.x - this.camera.position.x) * Math.min(dt * 3.5, 1.0);
      this.camera.position.y += (playerPos.y - this.camera.position.y) * Math.min(dt * 3.5, 1.0);

      // Zoom dinámico suave al crecer la bacteria
      const targetFrustum = 42.0 * Math.pow(this.player.currentScale, 0.28);
      if (Math.abs(this.frustumSize - targetFrustum) > 0.05) {
        this.frustumSize += (targetFrustum - this.frustumSize) * Math.min(dt * 2.5, 1.0);
        this.onResize();
      }
    }

    // 4. Deriva Suave de Glóbulos Rojos de Fondo
    this.erythrocyteGroup.children.forEach((rbc, idx) => {
      rbc.position.x += Math.sin(time * 0.4 + idx) * 0.015;
      rbc.rotation.x += 0.004;
      rbc.rotation.y += 0.006;
    });

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
        this.onTelemetryUpdate({
          fps: this.currentFps,
          wasmReady: this.isWasmReady,
          mouseWorld: this.mouseWorld.clone(),
          cellSpeed: Math.round(speed * 10) / 10,
          cellMass: Math.round(mass * 100) / 100,
          cellScale: Math.round(scale * 100) / 100,
        });
      }
    }

    // 6. Renderizado de la Escena
    this.renderer.render(this.scene, this.camera);
  }
}
