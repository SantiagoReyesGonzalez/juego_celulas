import { VacuoleManager, CellStats } from '../systems/VacuoleManager';

export class Hud {
  private vacuoleManager: VacuoleManager;
  private container: HTMLDivElement;

  // Elementos de los 3 Medidores
  private hpBarFill!: HTMLDivElement;
  private hpText!: HTMLSpanElement;
  private shieldBarFill!: HTMLDivElement;
  private shieldText!: HTMLSpanElement;
  private atpBarFill!: HTMLDivElement;
  private atpText!: HTMLSpanElement;

  // Banner de Mitosis
  private mitosisBanner!: HTMLDivElement;

  // Contenedor de Bio-Upgrades
  private upgradesList!: HTMLDivElement;

  // Contenedor de notificaciones flotantes
  private popupsContainer!: HTMLDivElement;

  constructor(vacuoleManager: VacuoleManager) {
    this.vacuoleManager = vacuoleManager;

    this.container = document.createElement('div');
    this.container.id = 'bio-hud-root';
    document.body.appendChild(this.container);

    this.buildHudElements();
    this.bindEvents();

    // Actualización inicial
    this.updateStats(this.vacuoleManager.getStats());
  }

  private buildHudElements(): void {
    this.container.innerHTML = `
      <!-- 1. Los 3 Medidores Biológicos Superiores -->
      <div id="cellular-meters">
        <!-- Integridad de Membrana (HP) -->
        <div class="meter-card hp-card">
          <div class="meter-header">
            <span class="meter-title">🛡️ Integridad Membrana</span>
            <span id="hp-val" class="meter-num">100 / 100</span>
          </div>
          <div class="meter-track">
            <div id="hp-bar" class="meter-fill hp-fill" style="width: 100%;"></div>
          </div>
        </div>

        <!-- Presión Osmótica (Turgencia / Escudo) -->
        <div class="meter-card shield-card">
          <div class="meter-header">
            <span class="meter-title">💧 Presión Osmótica</span>
            <span id="shield-val" class="meter-num">50 / 50</span>
          </div>
          <div class="meter-track">
            <div id="shield-bar" class="meter-fill shield-fill" style="width: 100%;"></div>
          </div>
        </div>

        <!-- Vacuola de ATP (Energía / Recursos) -->
        <div class="meter-card atp-card">
          <div class="meter-header">
            <span class="meter-title">⚡ Vacuola de ATP</span>
            <span id="atp-val" class="meter-num">0 / 80 (0%)</span>
          </div>
          <div class="meter-track">
            <div id="atp-bar" class="meter-fill atp-fill" style="width: 0%;"></div>
          </div>
        </div>
      </div>

      <!-- 2. Alerta de Mitosis Disponible -->
      <div id="mitosis-alert" class="mitosis-alert hidden">
        <div class="mitosis-glow"></div>
        <span class="mitosis-icon">🧬</span>
        <div class="mitosis-text">
          <b>¡VACUOLA AL 100%!</b>
          <span>Mitosis y Mutación de Tier Desbloqueadas</span>
        </div>
      </div>

      <!-- 3. Panel Lateral de Bio-Mejoras (Estilo Starblast.io) -->
      <div id="bio-upgrades-panel">
        <div class="upgrades-title">
          <span>🧬 Bio-Mejoras</span>
          <span class="upgrades-hint">Teclas [1 - 6]</span>
        </div>
        <div id="upgrades-list"></div>
      </div>

      <!-- 4. Contenedor de Textos Flotantes de ATP -->
      <div id="floating-popups"></div>
    `;

    this.hpBarFill = document.getElementById('hp-bar') as HTMLDivElement;
    this.hpText = document.getElementById('hp-val') as HTMLSpanElement;
    this.shieldBarFill = document.getElementById('shield-bar') as HTMLDivElement;
    this.shieldText = document.getElementById('shield-val') as HTMLSpanElement;
    this.atpBarFill = document.getElementById('atp-bar') as HTMLDivElement;
    this.atpText = document.getElementById('atp-val') as HTMLSpanElement;
    this.mitosisBanner = document.getElementById('mitosis-alert') as HTMLDivElement;
    this.upgradesList = document.getElementById('upgrades-list') as HTMLDivElement;
    this.popupsContainer = document.getElementById('floating-popups') as HTMLDivElement;

    this.renderUpgrades();
  }

  // Evento de clic en banner de mitosis
  public onMitosisClick?: () => void;

  private bindEvents(): void {
    // Clic en el banner de mitosis
    this.mitosisBanner.addEventListener('click', () => {
      if (this.onMitosisClick) {
        this.onMitosisClick();
      }
    });

    // Escuchar cambios de estadísticas desde VacuoleManager
    this.vacuoleManager.onStatsChanged = (stats) => {
      this.updateStats(stats);
      this.renderUpgrades();
    };

    // Notificaciones de ATP recolectado
    this.vacuoleManager.onAtpCollected = (amount) => {
      this.showAtpPopup(`+${amount} ATP`, '#facc15');
    };

    // Notificación de derrame de ATP por daño
    this.vacuoleManager.onAtpLeak = (lost) => {
      this.showAtpPopup(`-${lost} ATP Fuga!`, '#ef4444');
    };
  }

  public updateStats(stats: CellStats): void {
    // Membrana (HP)
    const hpPct = Math.max(0, Math.min(100, (stats.membraneIntegrity / stats.maxMembraneIntegrity) * 100));
    this.hpBarFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${stats.membraneIntegrity} / ${stats.maxMembraneIntegrity}`;

    // Presión Osmótica (Escudo)
    const shieldPct = Math.max(0, Math.min(100, (stats.osmoticPressure / stats.maxOsmoticPressure) * 100));
    this.shieldBarFill.style.width = `${shieldPct}%`;
    this.shieldText.textContent = `${stats.osmoticPressure} / ${stats.maxOsmoticPressure}`;

    // Vacuola ATP
    const atpPct = Math.max(0, Math.min(100, (stats.atp / stats.atpCapacity) * 100));
    this.atpBarFill.style.width = `${atpPct}%`;
    this.atpText.textContent = `${stats.atp} / ${stats.atpCapacity} (${Math.round(atpPct)}%)`;

    // Estado de Mitosis
    if (stats.isMitosisReady) {
      this.mitosisBanner.classList.remove('hidden');
    } else {
      this.mitosisBanner.classList.add('hidden');
    }
  }

  public renderUpgrades(): void {
    const keys = ['1', '2', '3', '4', '5', '6'];
    const ups = Object.values(this.vacuoleManager.upgrades);

    this.upgradesList.innerHTML = '';

    ups.forEach((up, idx) => {
      const key = keys[idx];
      const cost = this.vacuoleManager.getUpgradeCost(up.id);
      const isMax = up.level >= up.maxLevel;
      const canAfford = !isMax && this.vacuoleManager.atp >= cost;

      // Pips de nivel (e.g. ■■□□□)
      let pipsHtml = '';
      for (let i = 0; i < up.maxLevel; i++) {
        pipsHtml += `<span class="pip ${i < up.level ? 'active' : ''}"></span>`;
      }

      const item = document.createElement('div');
      item.className = `upgrade-item ${canAfford ? 'affordable' : ''} ${isMax ? 'maxed' : ''}`;
      item.innerHTML = `
        <div class="upgrade-key">[${key}]</div>
        <div class="upgrade-info">
          <div class="upgrade-name">${up.name}</div>
          <div class="upgrade-pips">${pipsHtml}</div>
        </div>
        <div class="upgrade-cost">${isMax ? 'MAX' : `${cost} ATP`}</div>
      `;

      // Clic para comprar con ratón
      item.addEventListener('click', () => {
        this.vacuoleManager.buyUpgrade(up.id);
      });

      this.upgradesList.appendChild(item);
    });
  }

  private showAtpPopup(text: string, color: string): void {
    const el = document.createElement('div');
    el.className = 'atp-popup';
    el.style.color = color;
    el.textContent = text;
    this.popupsContainer.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 1200);
  }
}
