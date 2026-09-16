import * as THREE from 'three';
import { PhysicsWorld } from '../physics/World';
import { HydrodynamicsSystem } from '../systems/HydrodynamicsSystem';
import { Player } from '../entities/Player';

export interface TelemetryData {
  fps: number;
  wasmReady: boolean;
  mouseWorld: THREE.Vector2;
  cellSpeed: number;
}

export class Stage0 {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  
  // Módulos de Física e Hidrodinámica
  private physicsWorld!: PhysicsWorld;
  private hydroSystem!: HydrodynamicsSystem;
  private player!: Player;
  private isWasmReady = false;

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

    // 7. Eventos de Ventana y Ratón
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
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
      this.isWasmReady = true;
      console.log('✅ Rapier2D WASM e Hidrodinámica inicializados a 60 Hz');
    } catch (err) {
      console.error('Error inicializando Rapier2D / Player:', err);
    }
  }

  private createBackgroundElements(): void {
    // 1. Glóbulos Rojos (Eritrocitos) Claramente Visibles en el Fondo
    const rbcGeo = new THREE.TorusGeometry(1.6, 0.7, 12, 24);
    const rbcMat = new THREE.MeshStandardMaterial({
      color: 0xd32f2f,
      emissive: 0x660000,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.65,
    });

    for (let i = 0; i < 35; i++) {
      const rbc = new THREE.Mesh(rbcGeo, rbcMat);
      rbc.position.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 60,
        -5 - Math.random() * 12
      );
      rbc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.erythrocyteGroup.add(rbc);
    }

    // 2. Gránulos de Glucógeno y Nutrientes (Gemas Doradas Brillantes)
    const nutGeo = new THREE.DodecahedronGeometry(0.35);
    const nutMat = new THREE.MeshStandardMaterial({
      color: 0xffc107,
      emissive: 0xff9800,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });

    for (let i = 0; i < 60; i++) {
      const nutrient = new THREE.Mesh(nutGeo, nutMat);
      nutrient.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 5
      );
      this.particlesGroup.add(nutrient);
    }
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
        this.player.physicsUpdate(fixedDt, this.hydroSystem);
      });

      // 2. Actualización Visual del Jugador (Posición, Rotación y Flagelos)
      this.player.visualUpdate(dt, time);

      // 3. Seguimiento Suave de la Cámara al Jugador (Smooth Follow)
      const playerPos = this.player.body.translation();
      this.camera.position.x += (playerPos.x - this.camera.position.x) * Math.min(dt * 3.0, 1.0);
      this.camera.position.y += (playerPos.y - this.camera.position.y) * Math.min(dt * 3.0, 1.0);
    }

    // 4. Deriva Suave de Glóbulos Rojos y Nutrientes
    this.erythrocyteGroup.children.forEach((rbc, idx) => {
      rbc.position.x += Math.sin(time * 0.4 + idx) * 0.015;
      rbc.rotation.x += 0.004;
      rbc.rotation.y += 0.006;
    });

    this.particlesGroup.children.forEach((nutrient, idx) => {
      nutrient.rotation.y += 0.03;
      nutrient.position.y += Math.sin(time * 1.5 + idx) * 0.01;
    });

    // 5. Telemetría y Estadísticas
    this.frameCount++;
    if (time - this.lastFpsUpdate >= 0.35) {
      this.currentFps = Math.round(this.frameCount / (time - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = time;

      if (this.onTelemetryUpdate) {
        const speed = this.player ? this.player.getSpeed() : 0;
        this.onTelemetryUpdate({
          fps: this.currentFps,
          wasmReady: this.isWasmReady,
          mouseWorld: this.mouseWorld.clone(),
          cellSpeed: Math.round(speed * 10) / 10,
        });
      }
    }

    // 6. Renderizado de la Escena
    this.renderer.render(this.scene, this.camera);
  }
}
