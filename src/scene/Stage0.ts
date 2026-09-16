import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d';

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
  
  // Rapier2D WASM
  private rapierWorld: RAPIER.World | null = null;
  private isWasmReady = false;

  // Célula / Bacteria Prototipo
  private cellGroup: THREE.Group;
  private cellPosition = new THREE.Vector2(0, 0);
  private cellVelocity = new THREE.Vector2(0, 0);
  private cellAngle = 0;
  private flagellaCurves: THREE.Line[] = [];

  // Partículas y Fondo Biológico
  private particlesGroup: THREE.Group;
  private erythrocyteGroup: THREE.Group;

  // Interacción y Mouse
  private mouseScreen = new THREE.Vector2(0, 0);
  private mouseWorld = new THREE.Vector2(0, 0);
  private frustumSize = 40;

  // Telemetría y tiempo
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

    // 2. Escena y Niebla Tisular
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060913, 0.025);

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

    // 4. Iluminación Biológica
    this.setupLighting();

    // 5. Entorno: Glóbulos Rojos y Partículas de Nutrientes
    this.particlesGroup = new THREE.Group();
    this.erythrocyteGroup = new THREE.Group();
    this.scene.add(this.erythrocyteGroup);
    this.scene.add(this.particlesGroup);
    this.createBackgroundElements();

    // 6. Entidad Célula Bacteriana
    this.cellGroup = new THREE.Group();
    this.createBacterialCell();
    this.scene.add(this.cellGroup);

    // 7. Eventos de Ventana y Mouse
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));

    // 8. Inicialización de Rapier2D WASM
    this.initPhysics();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x1a2e35, 1.5);
    this.scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 2.5);
    rimLight.position.set(10, 20, 30);
    this.scene.add(rimLight);

    const warmFill = new THREE.PointLight(0xd97706, 1.8, 80);
    warmFill.position.set(-15, -10, 15);
    this.scene.add(warmFill);
  }

  private async initPhysics(): Promise<void> {
    try {
      const gravity = { x: 0.0, y: 0.0 };
      // Compatibilidad con empaquetadores ESM / Vite
      const WorldClass = RAPIER.World || (RAPIER as unknown as { default?: { World?: typeof RAPIER.World } }).default?.World;
      if (WorldClass) {
        this.rapierWorld = new WorldClass(gravity);
        this.isWasmReady = true;
        console.log('✅ Rapier2D WASM inicializado con éxito a 60Hz');
      } else {
        console.warn('⚠️ World class no encontrada directamente en RAPIER');
      }
    } catch (err) {
      console.error('Error inicializando Rapier2D:', err);
    }
  }

  private createBacterialCell(): void {
    // Membrana Externa Lipídica (Verde Esmeralda Translúcido y Bioluminiscente)
    const membraneGeo = new THREE.CapsuleGeometry(1.2, 2.4, 16, 32);
    const membraneMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const membrane = new THREE.Mesh(membraneGeo, membraneMat);
    membrane.rotation.z = Math.PI / 2;
    this.cellGroup.add(membrane);

    // Citoplasma Interno y Núcleo Bioluminiscente
    const coreGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.cellGroup.add(core);

    // Orgánulos / Vacuolas de ATP internas
    for (let i = 0; i < 4; i++) {
      const vacGeo = new THREE.SphereGeometry(0.3, 12, 12);
      const vacMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.9,
      });
      const vac = new THREE.Mesh(vacGeo, vacMat);
      vac.position.set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.8, 0.2);
      this.cellGroup.add(vac);
    }

    // Flagelos Sinusoidales Ondulantes
    for (let i = -1; i <= 1; i++) {
      const curvePoints: THREE.Vector3[] = [];
      for (let j = 0; j < 25; j++) {
        curvePoints.push(new THREE.Vector3(-1.8 - j * 0.2, i * 0.4, 0));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: i === 0 ? 0x34d399 : 0x06b6d4,
        linewidth: 2,
        transparent: true,
        opacity: 0.7,
      });
      const flagellum = new THREE.Line(lineGeo, lineMat);
      this.flagellaCurves.push(flagellum);
      this.cellGroup.add(flagellum);
    }
  }

  private createBackgroundElements(): void {
    // 1. Glóbulos Rojos (Eritrocitos) Desenfocados en el Fondo
    const rbcGeo = new THREE.TorusGeometry(1.6, 0.7, 12, 24);
    const rbcMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.4,
    });

    for (let i = 0; i < 35; i++) {
      const rbc = new THREE.Mesh(rbcGeo, rbcMat);
      rbc.position.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 60,
        -15 - Math.random() * 20
      );
      rbc.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.erythrocyteGroup.add(rbc);
    }

    // 2. Gránulos de Glucógeno y Nutrientes Flotantes
    const nutGeo = new THREE.DodecahedronGeometry(0.35);
    const nutMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.3,
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

    // Convertir de pantalla a coordenadas mundiales
    const vector = new THREE.Vector3(this.mouseScreen.x, this.mouseScreen.y, 0);
    vector.unproject(this.camera);
    this.mouseWorld.set(vector.x, vector.y);
  }

  public update(): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // 1. Simulación de Rapier2D WASM (Tick a 60Hz)
    if (this.rapierWorld) {
      this.rapierWorld.step();
    }

    // 2. Hidrodinámica y Amortiguamiento Viscoso (F_drag = 0.5 * rho * Cd * A * v^2)
    const toMouse = new THREE.Vector2().subVectors(this.mouseWorld, this.cellPosition);
    const dist = toMouse.length();

    if (dist > 0.5) {
      // Fuerza de empuje proporcional a la distancia con límite máximo
      const thrustStrength = Math.min(dist * 6.0, 35.0);
      const thrustDir = toMouse.clone().normalize();
      const thrustForce = thrustDir.multiplyScalar(thrustStrength);

      // Integración de aceleración
      this.cellVelocity.add(thrustForce.multiplyScalar(dt));

      // Rotación suave hacia el objetivo
      const targetAngle = Math.atan2(toMouse.y, toMouse.x);
      let angleDiff = targetAngle - this.cellAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.cellAngle += angleDiff * Math.min(dt * 8.0, 1.0);
    }

    // Resistencia viscosa del fluido (Drag)
    const speed = this.cellVelocity.length();
    if (speed > 0.001) {
      const rho = 1.05; // Densidad capilar
      const cd = 0.8;   // Coeficiente de arrastre bacilo
      const dragMag = 0.5 * rho * cd * speed * speed + speed * 2.5; // Drag cuadrático + laminar
      const dragForce = this.cellVelocity.clone().normalize().multiplyScalar(-dragMag);
      this.cellVelocity.add(dragForce.multiplyScalar(dt));
    }

    // Actualizar posición de la célula
    this.cellPosition.add(this.cellVelocity.clone().multiplyScalar(dt));
    this.cellGroup.position.set(this.cellPosition.x, this.cellPosition.y, 0);
    this.cellGroup.rotation.z = this.cellAngle;

    // 3. Animación Ondulante de Flagelos (Ecuación Sinusoidal en Vértices)
    this.flagellaCurves.forEach((flagellum, idx) => {
      const positions = flagellum.geometry.attributes.position as THREE.BufferAttribute;
      const count = positions.count;
      const waveSpeed = 8.0;

      for (let j = 0; j < count; j++) {
        const xDist = j * 0.15;
        const wave = Math.sin(time * waveSpeed - xDist * 2.0 + idx) * (xDist * 0.25);
        positions.setY(j, (idx - 1) * 0.35 + wave);
      }
      positions.needsUpdate = true;
    });

    // 4. Deriva Suave de Glóbulos Rojos y Nutrientes en Segundo Plano
    this.erythrocyteGroup.children.forEach((rbc, idx) => {
      rbc.position.x += Math.sin(time * 0.5 + idx) * 0.02;
      rbc.rotation.x += 0.003;
      rbc.rotation.y += 0.005;
    });

    this.particlesGroup.children.forEach((nutrient, idx) => {
      nutrient.rotation.y += 0.02;
      nutrient.position.y += Math.sin(time * 1.2 + idx) * 0.01;
    });

    // 5. Medición de Telemetría (FPS)
    this.frameCount++;
    if (time - this.lastFpsUpdate >= 0.5) {
      this.currentFps = Math.round((this.frameCount / (time - this.lastFpsUpdate)));
      this.frameCount = 0;
      this.lastFpsUpdate = time;

      if (this.onTelemetryUpdate) {
        this.onTelemetryUpdate({
          fps: this.currentFps,
          wasmReady: this.isWasmReady,
          mouseWorld: this.mouseWorld.clone(),
          cellSpeed: Math.round(speed * 10) / 10,
        });
      }
    }

    // 6. Render
    this.renderer.render(this.scene, this.camera);
  }
}
