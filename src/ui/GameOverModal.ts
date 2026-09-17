export interface GameOverStats {
  speciesName: string;
  speciesRole: string;
  peakMass: number;
  atp: number;
  survivalTime: string;
  cause: string;
}

export class GameOverModal {
  private overlay: HTMLDivElement;
  private causeEl: HTMLElement;
  private speciesEl: HTMLElement;
  private roleEl: HTMLElement;
  private massEl: HTMLElement;
  private atpEl: HTMLElement;
  private timeEl: HTMLElement;
  private respawnBtn: HTMLButtonElement;

  public onRespawnClick?: () => void;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'game-over-overlay';
    this.overlay.className = 'game-over-overlay hidden';

    this.overlay.innerHTML = `
      <div class="game-over-window">
        <div class="game-over-header">
          <div class="game-over-icon-box">
            <span class="game-over-skull">☠️</span>
          </div>
          <h2 class="game-over-title">LISIS CELULAR DETECTADA</h2>
          <p id="game-over-cause" class="game-over-subtitle">La membrana bacteriana ha colapsado irreversiblemente.</p>
        </div>

        <div class="game-over-stats-grid">
          <div class="game-over-stat-card">
            <span class="stat-icon">🧬</span>
            <div class="stat-info">
              <span class="stat-label">Especie Alcanzada</span>
              <b id="game-over-species" class="stat-value">Micrococcus Luteus</b>
              <span id="game-over-role" class="stat-sub">Rol: Esférica Base</span>
            </div>
          </div>

          <div class="game-over-stat-card">
            <span class="stat-icon">⚖️</span>
            <div class="stat-info">
              <span class="stat-label">Masa Celular</span>
              <b id="game-over-mass" class="stat-value">1.00 µg</b>
              <span class="stat-sub">Volumen e integridad celular</span>
            </div>
          </div>

          <div class="game-over-stat-card">
            <span class="stat-icon">⚡</span>
            <div class="stat-info">
              <span class="stat-label">ATP en Vacuola</span>
              <b id="game-over-atp" class="stat-value">0 ATP</b>
              <span class="stat-sub">Derramado en lisis</span>
            </div>
          </div>

          <div class="game-over-stat-card">
            <span class="stat-icon">⏱️</span>
            <div class="stat-info">
              <span class="stat-label">Tiempo Sobrevivido</span>
              <b id="game-over-time" class="stat-value">00:00</b>
              <span class="stat-sub">Duración de la colonia</span>
            </div>
          </div>
        </div>

        <div class="game-over-footer">
          <button id="game-over-respawn-btn" class="game-over-btn">
            <span class="btn-glow"></span>
            <span class="btn-content">🧬 GERMINAR NUEVA ESPORA (REAPARECER)</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.causeEl = this.overlay.querySelector('#game-over-cause') as HTMLElement;
    this.speciesEl = this.overlay.querySelector('#game-over-species') as HTMLElement;
    this.roleEl = this.overlay.querySelector('#game-over-role') as HTMLElement;
    this.massEl = this.overlay.querySelector('#game-over-mass') as HTMLElement;
    this.atpEl = this.overlay.querySelector('#game-over-atp') as HTMLElement;
    this.timeEl = this.overlay.querySelector('#game-over-time') as HTMLElement;
    this.respawnBtn = this.overlay.querySelector('#game-over-respawn-btn') as HTMLButtonElement;

    this.respawnBtn.addEventListener('click', () => {
      this.close();
      if (this.onRespawnClick) {
        this.onRespawnClick();
      }
    });
  }

  public open(stats: GameOverStats): void {
    this.causeEl.textContent = stats.cause || 'La membrana bacteriana ha colapsado ante el entorno hostil.';
    this.speciesEl.textContent = stats.speciesName;
    this.roleEl.textContent = `Rol: ${stats.speciesRole}`;
    this.massEl.textContent = `${stats.peakMass.toFixed(2)} µg`;
    this.atpEl.textContent = `${stats.atp} ATP`;
    this.timeEl.textContent = stats.survivalTime;

    this.overlay.classList.remove('hidden');
  }

  public isOpen(): boolean {
    return !this.overlay.classList.contains('hidden');
  }

  public close(): void {
    this.overlay.classList.add('hidden');
  }
}
