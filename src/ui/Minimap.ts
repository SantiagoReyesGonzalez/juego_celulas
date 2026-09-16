import { getSectorLabel, getToroidalDelta } from '../physics/WorldTopology';

export interface MinimapEntity {
  x: number;
  y: number;
  radius?: number;
  type?: string;
}

export interface MinimapData {
  player: {
    x: number;
    y: number;
    rotation: number;
    color?: string;
  };
  adipocytes: MinimapEntity[];
  microorganisms: MinimapEntity[];
  neutrophils: MinimapEntity[];
  macrophage?: MinimapEntity | null;
  nutrients?: MinimapEntity[];
  biofilmHubs?: MinimapEntity[];
  biofilmChunks?: MinimapEntity[];
}

export class Minimap {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private coordsLabel: HTMLSpanElement;
  private sectorLabel: HTMLSpanElement;
  private zoomBtn: HTMLButtonElement;
  private toggleBtn: HTMLButtonElement;

  private isExpanded = true;
  private isVisible = true;
  private radarAngle = 0;

  // Zoom del Radar: 2x (~70u) o 3x (~105u) respecto a la pantalla
  private zoomLevels = [
    { label: '2.0x', range: 72.0 },
    { label: '3.0x', range: 108.0 },
  ];
  private currentZoomIndex = 0; // Por defecto 2.0x
  public get radarRange(): number {
    return this.zoomLevels[this.currentZoomIndex].range;
  }

  // Dimensiones del lienzo del radar circular
  private cssWidth = 190;
  private cssHeight = 190;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'bio-minimap-container';
    this.container.className = 'minimap-panel';

    this.container.innerHTML = `
      <div class="minimap-header">
        <div class="radar-title-group">
          <span class="radar-live-dot"></span>
          <span class="radar-title">📡 BIO-RADAR</span>
        </div>
        <div class="radar-actions">
          <span id="minimap-sector" class="minimap-sector-pill">SEC: --</span>
          <button id="minimap-zoom-btn" class="minimap-btn zoom-btn" title="Alternar Rango de Detección (2x / 3x)">2.0x</button>
          <button id="minimap-toggle-btn" class="minimap-btn" title="Minimizar / Expandir (Tecla TAB o N)">−</button>
        </div>
      </div>
      <div class="minimap-canvas-wrapper">
        <canvas id="bio-minimap-canvas"></canvas>
      </div>
      <div class="minimap-footer">
        <span id="minimap-coords" class="radar-coords">X: 0.0 | Y: 0.0</span>
        <span class="radar-topology-badge">CENTRO: JUGADOR</span>
      </div>
    `;

    document.body.appendChild(this.container);

    this.canvas = this.container.querySelector('#bio-minimap-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;
    this.coordsLabel = this.container.querySelector('#minimap-coords') as HTMLSpanElement;
    this.sectorLabel = this.container.querySelector('#minimap-sector') as HTMLSpanElement;
    this.zoomBtn = this.container.querySelector('#minimap-zoom-btn') as HTMLButtonElement;
    this.toggleBtn = this.container.querySelector('#minimap-toggle-btn') as HTMLButtonElement;

    this.setupCanvas();
    this.bindEvents();
  }

  private setupCanvas(): void {
    this.canvas.width = this.cssWidth * this.dpr;
    this.canvas.height = this.cssHeight * this.dpr;
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;
  }

  private bindEvents(): void {
    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleZoom();
    });

    // Teclas TAB o N para alternar colapso, Tecla Z para alternar zoom
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Tab' || e.code === 'KeyN') {
        e.preventDefault();
        this.toggle();
      } else if (e.code === 'KeyZ') {
        this.cycleZoom();
      }
    });

    window.addEventListener('resize', () => {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.setupCanvas();
    });
  }

  public cycleZoom(): void {
    this.currentZoomIndex = (this.currentZoomIndex + 1) % this.zoomLevels.length;
    this.zoomBtn.textContent = this.zoomLevels[this.currentZoomIndex].label;
  }

  public toggle(): boolean {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      this.container.classList.remove('collapsed');
      this.toggleBtn.textContent = '−';
    } else {
      this.container.classList.add('collapsed');
      this.toggleBtn.textContent = '+';
    }
    return this.isExpanded;
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }

  /**
   * Renderizado en tiempo real del radar de proximidad centrado en el jugador
   */
  public update(time: number, data: MinimapData): void {
    const px = data.player.x;
    const py = data.player.y;

    if (!this.isVisible || !this.isExpanded) {
      this.coordsLabel.textContent = `X: ${px.toFixed(1)} | Y: ${py.toFixed(1)}`;
      this.sectorLabel.textContent = `SEC: ${getSectorLabel(px, py)}`;
      return;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const renderW = this.cssWidth;
    const renderH = this.cssHeight;
    const centerX = renderW / 2;
    const centerY = renderH / 2;
    const radarRadius = Math.min(renderW, renderH) * 0.46; // ~87px

    // 1. Limpiar Lienzo
    ctx.clearRect(0, 0, renderW, renderH);

    // 2. Máscara Circular del Radar
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    ctx.clip();

    // Fondo del radar con gradiente radial orgánico
    const bgGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radarRadius);
    bgGrad.addColorStop(0, 'rgba(8, 20, 36, 0.95)');
    bgGrad.addColorStop(0.7, 'rgba(4, 10, 22, 0.96)');
    bgGrad.addColorStop(1, 'rgba(2, 6, 16, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, renderW, renderH);

    // 3. Anillos Concéntricos de Alcance
    // Anillo interior: Vista en Pantalla (1.0x pantalla ~32u)
    const screenRingR = (32.0 / this.radarRange) * radarRadius;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, screenRingR, 0, Math.PI * 2);
    ctx.stroke();

    // Anillo intermedio (~60u)
    const midRingR = (60.0 / this.radarRange) * radarRadius;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, midRingR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Retícula en cruz (Eje X / Eje Y centrados en el jugador)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - radarRadius, centerY);
    ctx.lineTo(centerX + radarRadius, centerY);
    ctx.moveTo(centerX, centerY - radarRadius);
    ctx.lineTo(centerX, centerY + radarRadius);
    ctx.stroke();

    // 4. Haz Giratorio de Escáner Radar (Sonar Sweep)
    this.radarAngle = (time * 2.2) % (Math.PI * 2);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-this.radarAngle);
    const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radarRadius);
    sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    sweepGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.15)');
    sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radarRadius, -0.35, 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 5. Gránulos de Nutrientes Cercanos (pequeños destellos dorados)
    if (data.nutrients && data.nutrients.length > 0) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.65)';
      for (let i = 0; i < data.nutrients.length; i++) {
        const nut = data.nutrients[i];
        const { dx, dy, dist } = getToroidalDelta(px, py, nut.x, nut.y);
        if (dist <= this.radarRange) {
          const rx = centerX + (dx / this.radarRange) * radarRadius;
          const ry = centerY - (dy / this.radarRange) * radarRadius; // Y invertido para pantalla
          ctx.fillRect(rx - 0.75, ry - 0.75, 1.5, 1.5);
        }
      }
    }

    // 6. Microorganismos Cercanos (puntos esmeralda)
    if (data.microorganisms) {
      ctx.fillStyle = '#22c55e';
      data.microorganisms.forEach((m) => {
        const { dx, dy, dist } = getToroidalDelta(px, py, m.x, m.y);
        if (dist <= this.radarRange) {
          const rx = centerX + (dx / this.radarRange) * radarRadius;
          const ry = centerY - (dy / this.radarRange) * radarRadius;
          ctx.beginPath();
          ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 7. Adipocitos (Grandes Reservas Lipídicas)
    if (data.adipocytes) {
      data.adipocytes.forEach((ad) => {
        const { dx, dy, dist } = getToroidalDelta(px, py, ad.x, ad.y);
        if (dist <= this.radarRange) {
          const rx = centerX + (dx / this.radarRange) * radarRadius;
          const ry = centerY - (dy / this.radarRange) * radarRadius;
          const r = Math.max(2.5, ((ad.radius || 2.5) / this.radarRange) * radarRadius * 1.5);

          // Halo ámbar
          ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
          ctx.beginPath();
          ctx.arc(rx, ry, r + 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Núcleo brillante
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(rx, ry, r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 7.5. Nódulos de Biopelícula Caústica (Mega-Alimento en 2 Capas: Campo + Núcleo)
    if (data.biofilmHubs && data.biofilmHubs.length > 0) {
      data.biofilmHubs.forEach((hub) => {
        const { dx, dy, dist } = getToroidalDelta(px, py, hub.x, hub.y);
        const fieldWorldR = hub.radius || 19.0;
        const coreWorldR = 3.6;

        if (dist <= this.radarRange + fieldWorldR) {
          const rx = centerX + (dx / this.radarRange) * radarRadius;
          const ry = centerY - (dy / this.radarRange) * radarRadius;
          const screenFieldR = Math.max(5.0, (fieldWorldR / this.radarRange) * radarRadius);
          const screenCoreR = Math.max(2.5, (coreWorldR / this.radarRange) * radarRadius);

          // 1. Campo cáustico exterior (Domo translúcido verde ácido)
          ctx.fillStyle = 'rgba(6, 78, 59, 0.28)';
          ctx.beginPath();
          ctx.arc(rx, ry, screenFieldR, 0, Math.PI * 2);
          ctx.fill();

          // Anillo perimétrico exterior punteado (Peligro de erosión)
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(rx, ry, screenFieldR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // 2. Núcleo central blindado (20 impactos a romper)
          const corePulse = 1.0 + Math.sin(time * 4.0) * 0.1;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(rx, ry, screenCoreR * corePulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(rx, ry, screenCoreR * corePulse, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Fuera de radar: Baliza direccional de Mega-Nódulo en el borde
          const angle = Math.atan2(-dy, dx);
          const edgeX = centerX + Math.cos(angle) * (radarRadius - 5);
          const edgeY = centerY + Math.sin(angle) * (radarRadius - 5);

          ctx.save();
          ctx.translate(edgeX, edgeY);
          ctx.rotate(angle);
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.moveTo(4.0, 0);
          ctx.lineTo(0, 2.5);
          ctx.lineTo(-4.0, 0);
          ctx.lineTo(0, -2.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });
    }

    // 7.6. Fragmentos Comestibles de Biopelícula (Biofilm Chunks Flotantes)
    if (data.biofilmChunks && data.biofilmChunks.length > 0) {
      ctx.fillStyle = '#2dd4bf';
      data.biofilmChunks.forEach((chunk) => {
        const { dx, dy, dist } = getToroidalDelta(px, py, chunk.x, chunk.y);
        if (dist <= this.radarRange) {
          const rx = centerX + (dx / this.radarRange) * radarRadius;
          const ry = centerY - (dy / this.radarRange) * radarRadius;
          ctx.beginPath();
          ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 8. Amenazas Inmunológicas: Neutrófilos (Puntos Rojos)
    if (data.neutrophils) {
      data.neutrophils.forEach((n) => {
        const { dx, dy, dist } = getToroidalDelta(px, py, n.x, n.y);
        if (dist <= this.radarRange) {
          const rx = centerX + (dx / this.radarRange) * radarRadius;
          const ry = centerY - (dy / this.radarRange) * radarRadius;
          const pulse = 1.0 + Math.sin(time * 8.0) * 0.3;

          // Halo de peligro rojo
          ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
          ctx.beginPath();
          ctx.arc(rx, ry, 4.0 * pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (dist <= this.radarRange * 1.35) {
          // Indicador de amenaza acercándose en el perímetro del radar (Off-screen Warning)
          const angle = Math.atan2(-dy, dx);
          const edgeX = centerX + Math.cos(angle) * (radarRadius - 4);
          const edgeY = centerY + Math.sin(angle) * (radarRadius - 4);

          ctx.fillStyle = 'rgba(244, 63, 94, 0.85)';
          ctx.beginPath();
          ctx.arc(edgeX, edgeY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Macrófago Boss (Alerta Crítica)
    if (data.macrophage) {
      const { dx, dy, dist } = getToroidalDelta(px, py, data.macrophage.x, data.macrophage.y);
      if (dist <= this.radarRange) {
        const rx = centerX + (dx / this.radarRange) * radarRadius;
        const ry = centerY - (dy / this.radarRange) * radarRadius;
        const pingRadius = (time * 16.0) % 18;
        const pingAlpha = Math.max(0, 1.0 - pingRadius / 18);

        ctx.strokeStyle = `rgba(225, 29, 72, ${pingAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, ry, pingRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(rx, ry, 5.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (dist <= this.radarRange * 1.6) {
        // Alerta de proximidad periférica del Macrófago Boss
        const angle = Math.atan2(-dy, dx);
        const edgeX = centerX + Math.cos(angle) * (radarRadius - 6);
        const edgeY = centerY + Math.sin(angle) * (radarRadius - 6);

        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(edgeX, edgeY, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 9. Marcador Central del Jugador (Siempre en el centro del radar)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-data.player.rotation);

    // Halo bioluminiscente del jugador
    const playerPulse = 1.0 + Math.sin(time * 5.0) * 0.18;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 7.0 * playerPulse, 0, Math.PI * 2);
    ctx.fill();

    // Flecha direccional de navegación
    ctx.fillStyle = '#34d399';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(7.5, 0);       // Proa
    ctx.lineTo(-5.0, -4.5);   // Ala izquierda
    ctx.lineTo(-2.2, 0);      // Propulsor
    ctx.lineTo(-5.0, 4.5);    // Ala derecha
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Termina clip circular

    // 10. Borde Perimetral Metálico/Cian del Escáner
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Marcas cardinales sutiles en el bisel
    ctx.fillStyle = '#38bdf8';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', centerX, centerY - radarRadius + 7);
    ctx.fillText('S', centerX, centerY + radarRadius - 7);
    ctx.fillText('E', centerX + radarRadius - 7, centerY);
    ctx.fillText('O', centerX - radarRadius + 7, centerY);

    ctx.restore();

    // 11. Textos Informativos del HUD
    this.coordsLabel.textContent = `X: ${px.toFixed(1)} | Y: ${py.toFixed(1)}`;
    this.sectorLabel.textContent = `SEC: ${getSectorLabel(px, py)}`;
  }
}
