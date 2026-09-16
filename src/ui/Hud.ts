import { VacuoleManager, CellStats } from '../systems/VacuoleManager';
import { ThreatTelemetry } from '../systems/ThreatDirector';

const UPGRADE_META: Record<string, { icon: string; shortName: string; fullName: string; benefit: string }> = {
  propulsion: {
    icon: '🚀',
    shortName: 'Impulso',
    fullName: 'Impulso Flagelar',
    benefit: '+15% Empuje y +10% Velocidad Máx',
  },
  sprintPower: {
    icon: '⚡',
    shortName: 'Sprint',
    fullName: 'Sprint de Caza',
    benefit: '+20% Fuerza y -15% Coste de ATP',
  },
  membraneHardening: {
    icon: '❤️',
    shortName: 'Vida',
    fullName: 'Refuerzo de Membrana',
    benefit: '+25 HP Máximo y curación inmediata',
  },
  cellularRegen: {
    icon: '🌱',
    shortName: 'Regen',
    fullName: 'Regeneración Tisular',
    benefit: '+1.5 HP/s Reparación Pasiva Continua',
  },
  turgor: {
    icon: '🛡️',
    shortName: 'Escudo',
    fullName: 'Turgencia Osmótica',
    benefit: '+15 Escudo y +50% Regeneración',
  },
  digestiveEfficiency: {
    icon: '🧬',
    shortName: 'Digestión',
    fullName: 'Eficiencia Enzimática',
    benefit: '+25% Biomasa Asimilada',
  },
  chemotaxis: {
    icon: '🧲',
    shortName: 'Imán ATP',
    fullName: 'Atracción Quimiotáctica',
    benefit: '+20% ATP por Alimento Absorbido',
  },
  vacuoleCapacity: {
    icon: '🔋',
    shortName: 'Vacuola',
    fullName: 'Capacidad de Vacuola',
    benefit: '+45 Capacidad Máxima de ATP',
  },
};

export class Hud {
  private vacuoleManager: VacuoleManager;
  private container: HTMLDivElement;

  // Elementos de los Medidores Arcade
  private hpBarFill!: HTMLDivElement;
  private hpText!: HTMLSpanElement;
  private shieldBarFill!: HTMLDivElement;
  private shieldText!: HTMLSpanElement;
  private atpBarFill!: HTMLDivElement;
  private atpText!: HTMLSpanElement;

  // Medidor de Inflamación Tisular
  private threatBarFill!: HTMLDivElement;
  private threatTitle!: HTMLSpanElement;
  private threatText!: HTMLSpanElement;
  private threatIcon!: HTMLDivElement;
  private threatAlertBanner!: HTMLDivElement;
  private threatAlertTitle!: HTMLElement;
  private threatAlertDesc!: HTMLSpanElement;

  // Banner de Mitosis
  private mitosisBanner!: HTMLDivElement;

  // Banner de Zona Segura / Biopelícula
  private sanctuaryBanner!: HTMLDivElement;
  private sanctuaryTitle!: HTMLElement;
  private sanctuaryDesc!: HTMLSpanElement;

  // Contenedor de Bio-Upgrades (8 Ranuras Canónicas)
  private upgradesList!: HTMLDivElement;

  // Contenedor de notificaciones flotantes
  private popupsContainer!: HTMLDivElement;

  // Valores cacheados para optimizar actualización DOM
  private lastHp = -1;
  private lastMaxHp = -1;
  private lastShield = -1;
  private lastMaxShield = -1;
  private lastAtp = -1;
  private lastAtpCap = -1;
  private lastMitosis = false;

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
      <!-- 1. Los 4 Medidores Biológicos Superiores (Estilo Arcade) -->
      <div id="cellular-meters">
        <!-- Vida (Membrana) -->
        <div class="arcade-meter hp-meter" title="Salud de la membrana bacteriana">
          <div class="meter-icon-wrap">❤️</div>
          <div class="meter-body">
            <div class="meter-info">
              <span class="meter-name">VIDA</span>
              <span id="hp-val" class="meter-val">100 / 100</span>
            </div>
            <div class="meter-track">
              <div id="hp-bar" class="meter-fill hp-fill" style="width: 100%;"></div>
            </div>
          </div>
        </div>

        <!-- Escudo Osmótico -->
        <div class="arcade-meter shield-meter" title="Presión osmótica que absorbe impactos antes de dañar la membrana">
          <div class="meter-icon-wrap">🛡️</div>
          <div class="meter-body">
            <div class="meter-info">
              <span class="meter-name">ESCUDO</span>
              <span id="shield-val" class="meter-val">50 / 50</span>
            </div>
            <div class="meter-track">
              <div id="shield-bar" class="meter-fill shield-fill" style="width: 100%;"></div>
            </div>
          </div>
        </div>

        <!-- ATP (Energía) -->
        <div class="arcade-meter atp-meter" title="Reserva energética de ATP para Sprint y Bio-Mejoras">
          <div class="meter-icon-wrap">⚡</div>
          <div class="meter-body">
            <div class="meter-info">
              <span class="meter-name">ATP</span>
              <span id="atp-val" class="meter-val">0 / 80</span>
            </div>
            <div class="meter-track">
              <div id="atp-bar" class="meter-fill atp-fill" style="width: 0%;"></div>
            </div>
          </div>
        </div>

        <!-- Alerta Inmunológica -->
        <div class="arcade-meter threat-meter" title="Nivel de alerta del sistema inmunitario del huésped">
          <div class="meter-icon-wrap" id="threat-icon">🟢</div>
          <div class="meter-body">
            <div class="meter-info">
              <span id="threat-title" class="meter-name">CALMA</span>
              <span id="threat-val" class="meter-val">5%</span>
            </div>
            <div class="meter-track">
              <div id="threat-bar" class="meter-fill threat-fill" style="width: 5%;"></div>
            </div>
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

      <!-- 3. Banner de Alerta Inmunológica -->
      <div id="threat-alert" class="threat-alert hidden">
        <span class="threat-alert-icon">⚠️</span>
        <div class="threat-alert-text">
          <b id="threat-alert-title">¡RESPUESTA INMUNITARIA!</b>
          <span id="threat-alert-desc">Los neutrófilos te persiguen por quimiotaxis</span>
        </div>
      </div>

      <!-- 3.5. Banner de Zona Segura / Nido de Biopelícula -->
      <div id="sanctuary-banner" class="sanctuary-banner hidden">
        <span class="sanctuary-icon">🛡️</span>
        <div class="sanctuary-text">
          <b id="sanctuary-title">ZONA SEGURA: NIDO DE BIOPELÍCULA</b>
          <span id="sanctuary-desc">Regeneración celular activa (+HP / +ATP / +ESCUDO) | Escudo repulsor activo</span>
        </div>
      </div>

      <!-- 4. Dock Inferior de 8 Bio-Mejoras -->
      <div id="bio-upgrades-dock">
        <div class="dock-header">
          <div class="dock-title-group">
            <span class="dock-logo">🧬</span>
            <span class="dock-title">BIO-MEJORAS</span>
            <span class="dock-badge">5 NIVELES</span>
          </div>
          <span class="dock-hint">Teclas <b>[1 - 8]</b> o Clic</span>
        </div>
        <div id="upgrades-dock-list"></div>
      </div>

      <!-- 5. Contenedor de Textos Flotantes de ATP -->
      <div id="floating-popups"></div>
    `;

    this.hpBarFill = document.getElementById('hp-bar') as HTMLDivElement;
    this.hpText = document.getElementById('hp-val') as HTMLSpanElement;
    this.shieldBarFill = document.getElementById('shield-bar') as HTMLDivElement;
    this.shieldText = document.getElementById('shield-val') as HTMLSpanElement;
    this.atpBarFill = document.getElementById('atp-bar') as HTMLDivElement;
    this.atpText = document.getElementById('atp-val') as HTMLSpanElement;
    this.threatBarFill = document.getElementById('threat-bar') as HTMLDivElement;
    this.threatTitle = document.getElementById('threat-title') as HTMLSpanElement;
    this.threatText = document.getElementById('threat-val') as HTMLSpanElement;
    this.threatIcon = document.getElementById('threat-icon') as HTMLDivElement;
    this.threatAlertBanner = document.getElementById('threat-alert') as HTMLDivElement;
    this.threatAlertTitle = document.getElementById('threat-alert-title') as HTMLElement;
    this.threatAlertDesc = document.getElementById('threat-alert-desc') as HTMLSpanElement;
    this.sanctuaryBanner = document.getElementById('sanctuary-banner') as HTMLDivElement;
    this.sanctuaryTitle = document.getElementById('sanctuary-title') as HTMLElement;
    this.sanctuaryDesc = document.getElementById('sanctuary-desc') as HTMLSpanElement;
    this.mitosisBanner = document.getElementById('mitosis-alert') as HTMLDivElement;

    this.upgradesList = document.getElementById('upgrades-dock-list') as HTMLDivElement;
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

    // Escuchar cambios de estadísticas desde VacuoleManager mediante multi-listener
    this.vacuoleManager.addStatsListener((stats) => {
      this.updateStats(stats);
      this.renderUpgrades();
    });

    // Notificaciones de ATP recolectado
    this.vacuoleManager.onAtpCollected = (amount) => {
      this.showAtpPopup(`+${Math.round(amount)} ATP`, '#facc15');
    };

    // Notificaciones de ATP gastado (Sprint, upgrades)
    this.vacuoleManager.onAtpSpent = (spent, reason) => {
      this.showAtpPopup(`-${Math.round(spent)} ATP (${reason})`, '#f97316');
    };

    // Notificación de derrame de ATP por daño mediante multi-listener
    this.vacuoleManager.addAtpLeakListener((lost) => {
      this.showAtpPopup(`-${lost} ATP Fuga!`, '#ef4444');
    });
  }

  public updateStats(stats: CellStats): void {
    // Membrana (HP)
    if (stats.membraneIntegrity !== this.lastHp || stats.maxMembraneIntegrity !== this.lastMaxHp) {
      this.lastHp = stats.membraneIntegrity;
      this.lastMaxHp = stats.maxMembraneIntegrity;
      const hpPct = Math.max(0, Math.min(100, (stats.membraneIntegrity / stats.maxMembraneIntegrity) * 100));
      this.hpBarFill.style.width = `${hpPct}%`;
      this.hpText.textContent = `${stats.membraneIntegrity} / ${stats.maxMembraneIntegrity}`;
    }

    // Presión Osmótica (Escudo)
    if (stats.osmoticPressure !== this.lastShield || stats.maxOsmoticPressure !== this.lastMaxShield) {
      this.lastShield = stats.osmoticPressure;
      this.lastMaxShield = stats.maxOsmoticPressure;
      const shieldPct = Math.max(0, Math.min(100, (stats.osmoticPressure / stats.maxOsmoticPressure) * 100));
      this.shieldBarFill.style.width = `${shieldPct}%`;
      this.shieldText.textContent = `${stats.osmoticPressure} / ${stats.maxOsmoticPressure}`;
    }

    // Vacuola ATP
    if (stats.atp !== this.lastAtp || stats.atpCapacity !== this.lastAtpCap) {
      this.lastAtp = stats.atp;
      this.lastAtpCap = stats.atpCapacity;
      const atpPct = Math.max(0, Math.min(100, (stats.atp / stats.atpCapacity) * 100));
      this.atpBarFill.style.width = `${atpPct}%`;
      this.atpText.textContent = `${stats.atp} / ${stats.atpCapacity} (${Math.round(atpPct)}%)`;
    }

    // Estado de Mitosis
    if (stats.isMitosisReady !== this.lastMitosis) {
      this.lastMitosis = stats.isMitosisReady;
      if (stats.isMitosisReady) {
        this.mitosisBanner.classList.remove('hidden');
      } else {
        this.mitosisBanner.classList.add('hidden');
      }
    }
  }

  public renderUpgrades(): void {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const ups = Object.values(this.vacuoleManager.upgrades);

    this.upgradesList.innerHTML = '';

    ups.forEach((up, idx) => {
      const key = keys[idx] || `${idx + 1}`;
      const meta = UPGRADE_META[up.id] || {
        icon: '✨',
        shortName: up.name,
        fullName: up.name,
        benefit: up.description,
      };
      const cost = this.vacuoleManager.getUpgradeCost(up.id);
      const isMax = up.level >= up.maxLevel;
      const canAfford = !isMax && this.vacuoleManager.atp >= cost;

      // Exactamente 5 pips de nivel con feedback cromático y animado
      let pipsHtml = '';
      for (let i = 0; i < up.maxLevel; i++) {
        const isFilled = i < up.level;
        pipsHtml += `<span class="dock-pip ${isFilled ? 'active' : ''} ${isMax ? 'maxed' : ''}"></span>`;
      }

      const card = document.createElement('div');
      card.className = `dock-upgrade-card ${canAfford ? 'affordable' : ''} ${isMax ? 'maxed' : 'pending'}`;
      card.setAttribute('data-upgrade-id', up.id);

      card.innerHTML = `
        <div class="dock-card-top">
          <span class="dock-key-badge">[${key}]</span>
          <span class="dock-lvl-badge ${isMax ? 'gold' : ''}">${isMax ? 'MAX' : `${up.level}/5`}</span>
        </div>
        <div class="dock-icon-wrapper">
          <span class="dock-icon">${meta.icon}</span>
        </div>
        <span class="dock-name">${meta.shortName}</span>
        <div class="dock-pips-container">${pipsHtml}</div>
        <div class="dock-cost-btn ${canAfford ? 'can-buy' : ''} ${isMax ? 'is-max' : ''}">
          ${isMax ? '★ MAX' : `⚡ ${cost}`}
        </div>
        <!-- Tooltip Flotante Arcade al pasar el cursor -->
        <div class="dock-tooltip">
          <div class="tooltip-title">${meta.icon} ${meta.fullName}</div>
          <div class="tooltip-desc">${meta.benefit}</div>
          <div class="tooltip-footer">
            <span>${isMax ? 'Nivel Máximo (5/5)' : `Nivel ${up.level}/${up.maxLevel}`}</span>
            <span class="tooltip-cost">${isMax ? '★ COMPLETO' : `Coste: ${cost} ATP [${key}]`}</span>
          </div>
        </div>
      `;

      // Clic para comprar con ratón (con detención de propagación para no accionar controles de juego)
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.vacuoleManager.buyUpgrade(up.id);
      });

      this.upgradesList.appendChild(card);
    });
  }

  public showAtpPopup(text: string, color: string, screenX?: number, screenY?: number): void {
    const el = document.createElement('div');
    el.className = 'atp-popup';
    el.style.color = color;
    el.textContent = text;

    // Si no se especifican coordenadas de pantalla, colocar de forma visible y estilizada
    if (screenX !== undefined && screenY !== undefined) {
      el.style.left = `${screenX}px`;
      el.style.top = `${screenY}px`;
    } else {
      const offset = (Math.random() - 0.5) * 80;
      el.style.left = `calc(50% + ${offset}px)`;
      el.style.top = `72px`;
    }

    this.popupsContainer.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 1100);
  }

  public showCustomPopup(text: string, color = '#ffffff', screenX?: number, screenY?: number): void {
    this.showAtpPopup(text, color, screenX, screenY);
  }

  public updateThreat(threat: ThreatTelemetry): void {
    const pct = Math.max(0, Math.min(100, Math.round(threat.inflammation * 100)));
    this.threatBarFill.style.width = `${pct}%`;

    if (threat.alertLevel === 'CRITICAL') {
      this.threatTitle.textContent = 'TORMENTA';
      this.threatTitle.style.color = '#ef4444';
      this.threatText.textContent = `${pct}%`;
      if (this.threatIcon) this.threatIcon.textContent = '🚨';
      this.threatBarFill.style.background = 'linear-gradient(90deg, #e11d48, #ef4444)';
      this.threatBarFill.style.boxShadow = '0 0 10px #ef4444';
    } else if (threat.alertLevel === 'ALERT') {
      this.threatTitle.textContent = 'ALERTA';
      this.threatTitle.style.color = '#f59e0b';
      this.threatText.textContent = `${pct}%`;
      if (this.threatIcon) this.threatIcon.textContent = '⚠️';
      this.threatBarFill.style.background = 'linear-gradient(90deg, #d97706, #f59e0b)';
      this.threatBarFill.style.boxShadow = '0 0 8px #f59e0b';
    } else {
      this.threatTitle.textContent = 'CALMA';
      this.threatTitle.style.color = '#10b981';
      this.threatText.textContent = `${pct}%`;
      if (this.threatIcon) this.threatIcon.textContent = '🟢';
      this.threatBarFill.style.background = 'linear-gradient(90deg, #059669, #10b981)';
      this.threatBarFill.style.boxShadow = '0 0 8px #10b981';
    }
  }

  private alertTimeout?: any;
  public showThreatAlert(title: string, desc: string, level: 'info' | 'warn' | 'danger'): void {
    if (this.alertTimeout) clearTimeout(this.alertTimeout);

    this.threatAlertBanner.className = `threat-alert ${level}`;
    this.threatAlertTitle.textContent = title;
    this.threatAlertDesc.textContent = desc;

    this.alertTimeout = setTimeout(() => {
      this.threatAlertBanner.classList.add('hidden');
    }, 3800);
  }

  public setSanctuaryStatus(inside: boolean, hubName?: string, health = 20, maxHealth = 20): void {
    if (inside) {
      this.sanctuaryBanner.classList.remove('hidden');
      if (hubName) {
        this.sanctuaryTitle.textContent = `☣️ CAMPO CÁUSTICO: ${hubName.toUpperCase()}`;
        this.sanctuaryDesc.textContent = `Erosión tisular (-3.2 HP/s) | Golpea el Núcleo: ${health} / ${maxHealth} impactos`;
      }
    } else {
      this.sanctuaryBanner.classList.add('hidden');
    }
  }
}
