import { WORLD_WIDTH, WORLD_HEIGHT, HALF_WIDTH, HALF_HEIGHT, getSectorLabel } from '../physics/WorldTopology';

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
}

export class Minimap {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private coordsLabel: HTMLSpanElement;
  private sectorLabel: HTMLSpanElement;
  private toggleBtn: HTMLButtonElement;

  private isExpanded = true;
  private isVisible = true;
  private radarAngle = 0;

  // Dimensiones en píxeles CSS del lienzo
  private cssWidth = 190;
  private cssHeight = 160;
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
          <button id="minimap-toggle-btn" class="minimap-btn" title="Minimizar / Expandir (Tecla TAB o N)">−</button>
        </div>
      </div>
      <div class="minimap-canvas-wrapper">
        <canvas id="bio-minimap-canvas"></canvas>
      </div>
      <div class="minimap-footer">
        <span id="minimap-coords" class="radar-coords">X: 0.0 | Y: 0.0</span>
        <span class="radar-topology-badge">TOROIDAL 260x220</span>
      </div>
    `;

    document.body.appendChild(this.container);

    this.canvas = this.container.querySelector('#bio-minimap-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;
    this.coordsLabel = this.container.querySelector('#minimap-coords') as HTMLSpanElement;
    this.sectorLabel = this.container.querySelector('#minimap-sector') as HTMLSpanElement;
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

    // Clic en la cabecera para alternar
    const header = this.container.querySelector('.minimap-header') as HTMLElement;
    if (header) {
      header.addEventListener('click', () => this.toggle());
    }

    // Teclas TAB o N para alternar rápidamente durante la partida
    window.addEventListener('keydown', (e) => {
      // Ignorar si el usuario está escribiendo en un input
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Tab' || e.code === 'KeyN') {
        e.preventDefault();
        this.toggle();
      }
    });

    // Redimensión de ventana
    window.addEventListener('resize', () => {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.setupCanvas();
    });
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
   * Mapea una coordenada mundial (X, Y) a coordenadas del canvas (cx, cy)
   */
  private worldToCanvas(x: number, y: number, width: number, height: number): { cx: number; cy: number } {
    // Normalizar de [-HALF_WIDTH, HALF_WIDTH] a [0, width]
    const u = (x + HALF_WIDTH) / WORLD_WIDTH;
    // En el eje Y, el sistema cartesiano Three.js (+Y arriba) se invierte para Canvas (+Y abajo)
    const v = 1.0 - (y + HALF_HEIGHT) / WORLD_HEIGHT;

    return {
      cx: Math.max(0, Math.min(width, u * width)),
      cy: Math.max(0, Math.min(height, v * height)),
    };
  }

  /**
   * Renderizado en tiempo real del radar
   */
  public update(time: number, data: MinimapData): void {
    if (!this.isVisible || !this.isExpanded) {
      // Si está colapsado, solo actualizamos el badge de coordenadas
      this.coordsLabel.textContent = `X: ${data.player.x.toFixed(1)} | Y: ${data.player.y.toFixed(1)}`;
      this.sectorLabel.textContent = `SEC: ${getSectorLabel(data.player.x, data.player.y)}`;
      return;
    }

    const ctx = this.ctx;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    const renderW = this.cssWidth;
    const renderH = this.cssHeight;

    // 1. Limpiar Lienzo
    ctx.clearRect(0, 0, renderW, renderH);

    // Fondo del radar con gradiente radial orgánico
    const bgGrad = ctx.createRadialGradient(
      renderW / 2,
      renderH / 2,
      10,
      renderW / 2,
      renderH / 2,
      Math.max(renderW, renderH) * 0.7
    );
    bgGrad.addColorStop(0, 'rgba(10, 20, 36, 0.92)');
    bgGrad.addColorStop(1, 'rgba(4, 7, 16, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, renderW, renderH);

    // 2. Retícula y Cuadrícula de Sectores
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;

    // Eje vertical y horizontal central (X=0, Y=0)
    ctx.beginPath();
    ctx.moveTo(renderW / 2, 0);
    ctx.lineTo(renderW / 2, renderH);
    ctx.moveTo(0, renderH / 2);
    ctx.lineTo(renderW, renderH / 2);
    ctx.stroke();

    // Líneas de cuadrantes intermedios
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(renderW * 0.25, 0);
    ctx.lineTo(renderW * 0.25, renderH);
    ctx.moveTo(renderW * 0.75, 0);
    ctx.lineTo(renderW * 0.75, renderH);
    ctx.moveTo(0, renderH * 0.25);
    ctx.lineTo(renderW, renderH * 0.25);
    ctx.moveTo(0, renderH * 0.75);
    ctx.lineTo(renderW, renderH * 0.75);
    ctx.stroke();
    ctx.setLineDash([]);

    // Etiquetas de sectores (A1, B2...)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.font = '8px monospace';
    ctx.fillText('A', 4, 12);
    ctx.fillText('B', 4, renderH * 0.5 - 2);
    ctx.fillText('C', 4, renderH * 0.5 + 10);
    ctx.fillText('D', 4, renderH - 4);

    // 3. Haz Giratorio de Escáner Radar (Starblast style sweep)
    this.radarAngle = (time * 1.8) % (Math.PI * 2);
    const pPt = this.worldToCanvas(data.player.x, data.player.y, renderW, renderH);

    ctx.save();
    ctx.translate(pPt.cx, pPt.cy);
    ctx.rotate(-this.radarAngle);
    const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 36);
    sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 36, -0.35, 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. Gránulos de Nutrientes (Muestreo sutil estilo polvo biológico dorado)
    if (data.nutrients && data.nutrients.length > 0) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
      const step = Math.max(1, Math.floor(data.nutrients.length / 50));
      for (let i = 0; i < data.nutrients.length; i += step) {
        const nut = data.nutrients[i];
        const pt = this.worldToCanvas(nut.x, nut.y, renderW, renderH);
        ctx.fillRect(pt.cx - 0.75, pt.cy - 0.75, 1.5, 1.5);
      }
    }

    // 5. Adipocitos (Depósitos Lipídicos / Grandes Cosechas de ATP)
    if (data.adipocytes) {
      data.adipocytes.forEach((ad) => {
        const pt = this.worldToCanvas(ad.x, ad.y, renderW, renderH);
        const r = Math.max(2.2, ((ad.radius || 2.5) / WORLD_WIDTH) * renderW * 1.6);

        // Halo ámbar
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, r + 2.0, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo brillante
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 6. Microorganismos (Células del Ecosistema)
    if (data.microorganisms) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.85)';
      data.microorganisms.forEach((m) => {
        const pt = this.worldToCanvas(m.x, m.y, renderW, renderH);
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 7. Amenazas Inmunológicas: Neutrófilos y Macrófago (Marcadores Rojos)
    if (data.neutrophils) {
      data.neutrophils.forEach((n) => {
        const pt = this.worldToCanvas(n.x, n.y, renderW, renderH);
        const pulse = 1.0 + Math.sin(time * 8.0) * 0.25;

        // Halo de amenaza roja pulsante
        ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, 3.5 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Punto de contacto
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, 2.0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Macrófago Boss (Alerta Crítica)
    if (data.macrophage) {
      const pt = this.worldToCanvas(data.macrophage.x, data.macrophage.y, renderW, renderH);
      const pingRadius = (time * 18.0) % 18;
      const pingAlpha = Math.max(0, 1.0 - pingRadius / 18);

      // Onda de alerta expansiva
      ctx.strokeStyle = `rgba(225, 29, 72, ${pingAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt.cx, pt.cy, pingRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Marcador del titán
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(pt.cx, pt.cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 8. Marcador del Jugador (Flecha Direccional de Alta Precisión)
    ctx.save();
    ctx.translate(pPt.cx, pPt.cy);

    // La rotación en Three.js es anti-horaria; en Canvas con Y invertido se invierte el ángulo
    ctx.rotate(-data.player.rotation);

    // Halo bioluminiscente del jugador
    const playerPulse = 1.0 + Math.sin(time * 5.0) * 0.15;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, 6.0 * playerPulse, 0, Math.PI * 2);
    ctx.fill();

    // Flecha direccional estilizada (estilo nave de Starblast)
    ctx.fillStyle = '#34d399';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(6.5, 0);       // Punta frontal
    ctx.lineTo(-4.5, -4.0);   // Ala izquierda
    ctx.lineTo(-2.0, 0);      // Hendidura de propulsor
    ctx.lineTo(-4.5, 4.0);    // Ala derecha
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Borde perimetral con brillo cian
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.5, 0.5, renderW - 1, renderH - 1);

    ctx.restore();

    // 9. Actualización de textos del HUD
    this.coordsLabel.textContent = `X: ${data.player.x.toFixed(1)} | Y: ${data.player.y.toFixed(1)}`;
    this.sectorLabel.textContent = `SEC: ${getSectorLabel(data.player.x, data.player.y)}`;
  }
}
