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
import { Minimap } from '../ui/Minimap';
import { BiofilmHub } from '../entities/BiofilmHub';
import { BiofilmChunk } from '../entities/BiofilmChunk';
import { GameOverModal } from '../ui/GameOverModal';
import { AtpOrb } from '../entities/Resources';
import { wrapPosition, isOutsideBounds, getToroidalDelta } from '../physics/WorldTopology';

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
  public minimap!: Minimap;
  public gameOverModal!: GameOverModal;
  public biofilmHubs: BiofilmHub[] = [];
  public biofilmChunks: BiofilmChunk[] = [];
  private sessionStartTime = performance.now();
  private peakMass = 1.0;

  // Fondo Tisular y Entorno Biológico
  private particlesGroup: THREE.Group;
  private erythrocyteGroup: THREE.Group;
  private sporeParticles?: THREE.Points;

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
    this.renderer.setClearColor(0x090306, 1.0);

    // 2. Escena y Niebla Tisular Cálida ("Dark Capillary", estilo Imagen de Referencia 01)
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x090306, 38, 120);

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

  private setupLighting(): void {
    // Luz ambiental profunda color vino/capilar
    const ambientLight = new THREE.AmbientLight(0x380b15, 2.8);
    this.scene.add(ambientLight);

    // Realce cian eléctrico de alto contraste (rim light)
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 4.6);
    rimLight.position.set(15, 25, 30);
    this.scene.add(rimLight);

    // Acento verde esmeralda bioluminiscente
    const bioLight = new THREE.DirectionalLight(0x10b981, 2.6);
    bioLight.position.set(-15, -20, 25);
    this.scene.add(bioLight);

    // Luz de relleno cálida ámbar/naranja
    const warmFill = new THREE.PointLight(0xff7700, 3.8, 150);
    warmFill.position.set(-12, 16, 22);
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

      this.evolutionSystem = new EvolutionSystem(this.physicsWorld, this.scene, this.player, this.vacuoleManager);
      this.evolutionSystem.onEvolved = (species) => {
        this.hud.showCustomPopup(
          `🧬 ¡MUTACIÓN A TIER ${species.tier}: ${species.name.toUpperCase()}! Bio-Mejoras renovadas`,
          '#38bdf8'
        );
      };
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

      // Notificaciones de recolección de nutrientes de bio-estructuras (Calcio, Péptidos, Esporas, Mitocondrias)
      this.predationSystem.onSpecializedNutrientCollected = (text, color) => {
        this.hud.showCustomPopup(text, color);
        this.threatDirector.addInflammation(0.008);
      };

      this.hud.onMitosisClick = () => {
        this.mitosisModal.open();
      };

      this.mitosisModal.onMitosisNotReady = (current, cap) => {
        this.hud.showCustomPopup(`⚠️ Mitosis bloqueada: ${current} / ${cap} ATP necesarios`, '#f59e0b');
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

  private createBackgroundElements(): void {
    // 1. Glóbulos Rojos (Eritrocitos Bicóncavos Biológicos Reales - Sin Agujero de Dona)
    const rbcGeo = this.createBiconcaveErythrocyteGeometry(1.6);
    const rbcMat = new THREE.MeshStandardMaterial({
      color: 0x9e1a22,
      emissive: 0x42070e,
      emissiveIntensity: 0.45,
      roughness: 0.32,
      metalness: 0.08,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < 110; i++) {
      const rbc = new THREE.Mesh(rbcGeo, rbcMat);
      rbc.position.set(
        (Math.random() - 0.5) * 750,
        (Math.random() - 0.5) * 650,
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

    // 2. Polvo de Micro-Esporas Bioluminiscentes Doradas (estilo Imagen de Referencia 01)
    const sporeCount = 320;
    const sporePositions = new Float32Array(sporeCount * 3);
    for (let i = 0; i < sporeCount; i++) {
      sporePositions[i * 3] = (Math.random() - 0.5) * 750;
      sporePositions[i * 3 + 1] = (Math.random() - 0.5) * 650;
      sporePositions[i * 3 + 2] = -4 + Math.random() * 8;
    }
    const sporeGeo = new THREE.BufferGeometry();
    sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePositions, 3));
    const sporeMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.45,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
    });
    this.sporeParticles = new THREE.Points(sporeGeo, sporeMat);
    this.particlesGroup.add(this.sporeParticles);

    // 3. Estructuras Orgánicas de Tejido Vascular Capilar de Fondo ("Dark Capillary")
    const tissueGeo = new THREE.TorusGeometry(32.0, 4.5, 12, 32, Math.PI);
    const tissueMat = new THREE.MeshStandardMaterial({
      color: 0x36060f,
      emissive: 0x1d0207,
      emissiveIntensity: 0.4,
      roughness: 0.55,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 8; i++) {
      const wall = new THREE.Mesh(tissueGeo, tissueMat);
      wall.position.set(
        (Math.random() - 0.5) * 650,
        (Math.random() - 0.5) * 550,
        -7 - Math.random() * 5
      );
      wall.rotation.z = Math.random() * Math.PI * 2;
      const s = 1.4 + Math.random() * 1.8;
      wall.scale.set(s, s, s);
      this.particlesGroup.add(wall);
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
      this.vacuoleManager.isInvulnerable = this.player.invulnerabilityTimer > 0;
      if (this.player.currentMass > this.peakMass) {
        this.peakMass = this.player.currentMass;
      }

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

      // 3.5. Nódulos de Biopelícula Caústica (Mega-Alimento en 2 Capas y 60 Impactos - 3x Dificultad)
      const curPlayerPos = this.player.body.translation();
      const playerRadius = this.player.baseRadius * this.player.currentScale;
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
            // Requiere Sprint real a alta velocidad para romper la coraza mineralizada
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
                // Impulso de retroceso elástico al jugador
                const angle = Math.atan2(dy, dx);
                this.player.body.applyImpulse({ x: -Math.cos(angle) * 48.0, y: -Math.sin(angle) * 48.0 }, true);
                this.player.feedBounce(1.22);
                this.hud.showCustomPopup(`💥 -7.5 HP (Retroceso Cáustico) | Núcleo: ${hub.health}/60`, '#ef4444');

                if (hitRes.destroyed) {
                  this.hud.showCustomPopup('🌟 ¡MEGA-NÓDULO DESTRUIDO TRAS 60 GOLPES! FESTÍN COLOSAL', '#10b981');
                }
              }
            } else {
              // Contacto pasivo sin sprint: las espículas cáusticas erosionan severamente la membrana
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

      // 6. Seguimiento Suave y Continuo de Cámara (Toroidal Seamless Follow)
      const { dx, dy } = getToroidalDelta(
        this.camera.position.x,
        this.camera.position.y,
        playerPos.x,
        playerPos.y
      );
      this.camera.position.x += dx * Math.min(dt * 3.5, 1.0);
      this.camera.position.y += dy * Math.min(dt * 3.5, 1.0);

      const wrappedCam = wrapPosition(this.camera.position.x, this.camera.position.y);
      this.camera.position.x = wrappedCam.x;
      this.camera.position.y = wrappedCam.y;

      // Zoom dinámico suave al crecer la bacteria
      const targetFrustum = 42.0 * Math.pow(this.player.currentScale, 0.28);
      if (Math.abs(this.frustumSize - targetFrustum) > 0.05) {
        this.frustumSize += (targetFrustum - this.frustumSize) * Math.min(dt * 2.5, 1.0);
        this.onResize();
      }
    }

    // 7. Deriva y Envolvente Suave de Glóbulos Rojos de Fondo
    this.erythrocyteGroup.children.forEach((rbc, idx) => {
      rbc.position.x += Math.sin(time * 0.4 + idx) * 0.015;
      rbc.rotation.x += 0.004;
      rbc.rotation.y += 0.006;
      if (isOutsideBounds(rbc.position.x, rbc.position.y, 10)) {
        const wrapped = wrapPosition(rbc.position.x, rbc.position.y);
        rbc.position.x = wrapped.x;
        rbc.position.y = wrapped.y;
      }
    });

    // 7.5. Deriva suave de las micro-esporas bioluminiscentes doradas
    if (this.sporeParticles) {
      const posAttr = this.sporeParticles.geometry.attributes.position as THREE.BufferAttribute;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i) + Math.sin(time * 0.8 + i * 0.5) * 0.02;
        let x = posAttr.getX(i) + Math.cos(time * 0.6 + i * 0.4) * 0.015;
        posAttr.setXY(i, x, y);
      }
      posAttr.needsUpdate = true;
    }

    // 8. Actualización en Tiempo Real del Mini-Mapa Radar Biológico
    if (this.minimap && this.player) {
      const pPos = this.player.body.translation();
      const pRot = this.player.body.rotation();

      const adBlips = this.predationSystem
        ? this.predationSystem.adipocytes.map((ad) => {
            const pos = ad.body.translation();
            return { x: pos.x, y: pos.y, radius: ad.radius };
          })
        : [];

      const structBlips = this.predationSystem
        ? this.predationSystem.bioStructures.map((s) => {
            const pos = s.body.translation();
            return {
              x: pos.x,
              y: pos.y,
              radius: s.radius,
              color: s.config.radarColor,
            };
          })
        : [];

      const microBlips = this.predationSystem
        ? this.predationSystem.microorganisms.map((m) => {
            const pos = m.body.translation();
            return { x: pos.x, y: pos.y };
          })
        : [];

      const neutroBlips = this.threatDirector
        ? this.threatDirector.neutrophils.map((n) => {
            const pos = n.body.translation();
            return { x: pos.x, y: pos.y };
          })
        : [];

      const macroBlip =
        this.threatDirector &&
        this.threatDirector.macrophage &&
        !this.threatDirector.macrophage.isDead
          ? {
              x: this.threatDirector.macrophage.body.translation().x,
              y: this.threatDirector.macrophage.body.translation().y,
            }
          : null;

      const nutBlips = this.predationSystem
        ? this.predationSystem.nutrients.map((nut) => ({
            x: nut.position.x,
            y: nut.position.y,
          }))
        : [];

      const hubBlips = this.biofilmHubs.map((h) => ({
        x: h.position.x,
        y: h.position.y,
        radius: h.radius,
        type: 'biofilm',
      }));

      const chunkBlips = this.biofilmChunks.map((c) => {
        const pos = c.body.translation();
        return { x: pos.x, y: pos.y };
      });

      this.minimap.update(time, {
        player: { x: pPos.x, y: pPos.y, rotation: pRot },
        adipocytes: adBlips,
        bioStructures: structBlips,
        microorganisms: microBlips,
        neutrophils: neutroBlips,
        macrophage: macroBlip,
        nutrients: nutBlips,
        biofilmHubs: hubBlips,
        biofilmChunks: chunkBlips,
      });
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

    // 6. Renderizado de la Escena
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
    this.evolutionSystem.resetToBaseSpecies();
    this.sessionStartTime = performance.now();
    this.peakMass = 1.0;
    this.camera.position.set(0, 0, 50);
    this.hud.showCustomPopup('🛡️ ESPORA GERMINADA: 3s DE INMUNIDAD', '#10b981');
  }
}
