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
    benefit: '+25% Curación y Salud',
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

interface UpgradeCardRef {
  card: HTMLDivElement;
  lvlBadge: HTMLSpanElement;
  pips: HTMLSpanElement[];
  costBtn: HTMLDivElement;
  tooltipLvl: HTMLSpanElement;
  tooltipCost: HTMLSpanElement;
  key: string;
}

export class Hud {
  private vacuoleManager: VacuoleManager;
  private container: HTMLDivElement;

  // Probeta Biológica Horizontal de Salud de Membrana (Copia Fiel de ref_01)
  private vialDock!: HTMLDivElement;
  private vialLiquid!: HTMLDivElement;
  private vialHpText!: HTMLDivElement;
  private atpDisplayVal!: HTMLSpanElement;

  // Banners y Alertas Reactivas
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
  private upgradeCards: Map<string, UpgradeCardRef> = new Map();
  private lastRenderedAtp = -1;
  private lastRenderedLevels: Record<string, number> = {};

  // Contenedor de notificaciones flotantes
  private popupsContainer!: HTMLDivElement;

  // Valores cacheados para optimizar actualización DOM
  private lastHp = -1;
  private lastMaxHp = -1;
  private lastShield = -1;
  private lastMaxShield = -1;
  private lastDisplayedAtp = -1;
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
      <!-- 1. Probeta Biológica Horizontal de Membrana (Esquina Superior Izquierda - Copia Fiel de ref_01) -->
      <div id="bio-vial-dock" class="bio-vial-dock" title="Integridad de Membrana">
        <div class="bio-vial-wrapper">
          <!-- Cilios orgánicos ondulantes en la base posterior izquierda -->
          <div class="vial-cilia-cluster">
            <span class="vial-cilium c1"></span>
            <span class="vial-cilium c2"></span>
            <span class="vial-cilium c3"></span>
            <span class="vial-cilium c4"></span>
          </div>

          <!-- Bulbo orgánico basal izquierdo -->
          <div class="vial-bulb-node"></div>

          <!-- Cápsula / Tubo de Vidrio Orgánico -->
          <div id="vial-capsule" class="vial-capsule">
            <!-- Sombra cilíndrica profunda -->
            <div class="vial-deep-shadow"></div>

            <!-- Fluido bioluminiscente esmeralda (salud de membrana) -->
            <div id="vial-liquid" class="vial-liquid" style="width: 100%;">
              <div class="liquid-meniscus"></div>
            </div>

            <!-- Brillo especular superior curvo de cristal húmedo -->
            <div class="vial-glass-specular"></div>

            <!-- Lectura numérica sutil integrada -->
            <div id="vial-hp-text" class="vial-hp-readout">100 / 100</div>
          </div>
        </div>

        <!-- Fila de Espora Ámbar Flotante y Contador de Recursos (Copia Fiel de ref_01) -->
        <div class="bio-atp-row" title="Reserva de ATP / Nutrientes">
          <div class="amber-spore-orb atp-orb-gem"></div>
          <span id="atp-display-val" class="spore-counter-text atp-readout-text">0</span>
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

    this.vialDock = document.getElementById('bio-vial-dock') as HTMLDivElement;
    this.vialLiquid = document.getElementById('vial-liquid') as HTMLDivElement;
    this.vialHpText = document.getElementById('vial-hp-text') as HTMLDivElement;
    this.atpDisplayVal = document.getElementById('atp-display-val') as HTMLSpanElement;

    this.threatAlertBanner = document.getElementById('threat-alert') as HTMLDivElement;
    this.threatAlertTitle = document.getElementById('threat-alert-title') as HTMLElement;
    this.threatAlertDesc = document.getElementById('threat-alert-desc') as HTMLSpanElement;
    this.sanctuaryBanner = document.getElementById('sanctuary-banner') as HTMLDivElement;
    this.sanctuaryTitle = document.getElementById('sanctuary-title') as HTMLElement;
    this.sanctuaryDesc = document.getElementById('sanctuary-desc') as HTMLSpanElement;
    this.mitosisBanner = document.getElementById('mitosis-alert') as HTMLDivElement;

    this.upgradesList = document.getElementById('upgrades-dock-list') as HTMLDivElement;
    this.popupsContainer = document.getElementById('floating-popups') as HTMLDivElement;

    this.initUpgradeCards();
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

    // Actualizar visual de cartas inmediatamente al comprar cualquier mejora
    this.vacuoleManager.addUpgradePurchasedListener(() => {
      this.renderUpgrades(true);
    });

    // Reconstruir reactivamente el dock de bio-mejoras al evolucionar o reaparecer
    this.vacuoleManager.addUpgradesResetListener(() => {
      this.refreshUpgradesForNewTier();
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
    // Membrana (HP) -> Drenado suave de derecha a izquierda del fluido esmeralda
    if (stats.membraneIntegrity !== this.lastHp || stats.maxMembraneIntegrity !== this.lastMaxHp) {
      this.lastHp = stats.membraneIntegrity;
      this.lastMaxHp = stats.maxMembraneIntegrity;
      const hpPct = Math.max(0, Math.min(100, (stats.membraneIntegrity / stats.maxMembraneIntegrity) * 100));
      if (this.vialLiquid) {
        this.vialLiquid.style.width = `${hpPct}%`;
      }
      if (this.vialHpText) {
        this.vialHpText.textContent = `${stats.membraneIntegrity} / ${stats.maxMembraneIntegrity}`;
      }
    }

    // Presión Osmótica (Escudo) -> Transición a halo cian eléctrico brillante en el borde
    if (stats.osmoticPressure !== this.lastShield || stats.maxOsmoticPressure !== this.lastMaxShield) {
      this.lastShield = stats.osmoticPressure;
      this.lastMaxShield = stats.maxOsmoticPressure;
      const hasShield = stats.osmoticPressure > 0;
      if (this.vialDock) {
        if (hasShield) {
          this.vialDock.classList.add('shield-active');
        } else {
          this.vialDock.classList.remove('shield-active');
        }
      }
    }

    // Vacuola ATP -> Contador numérico junto a la espora ámbar (actualización estrictamente solo al cambiar el entero)
    const currentAtpInt = Math.round(stats.atp);
    if (currentAtpInt !== this.lastDisplayedAtp) {
      this.lastDisplayedAtp = currentAtpInt;
      if (this.atpDisplayVal) {
        this.atpDisplayVal.textContent = `${currentAtpInt}`;
      }
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

  /**
   * Construye los elementos DOM de las 8 Bio-Mejoras UNA SOLA VEZ para evitar
   * destrucción del DOM y pérdida de eventos de clic por actualizaciones de 60 FPS.
   */
  private initUpgradeCards(): void {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const ups = Object.values(this.vacuoleManager.upgrades);

    this.upgradesList.innerHTML = '';
    this.upgradeCards.clear();

    ups.forEach((up, idx) => {
      const key = keys[idx] || `${idx + 1}`;
      const meta = {
        icon: up.icon || UPGRADE_META[up.id]?.icon || '✨',
        shortName: up.shortName || UPGRADE_META[up.id]?.shortName || up.name,
        fullName: up.name || UPGRADE_META[up.id]?.fullName || up.name,
        benefit: up.benefit || UPGRADE_META[up.id]?.benefit || up.description,
      };

      const card = document.createElement('div');
      card.className = 'dock-upgrade-card pending';
      card.setAttribute('data-upgrade-id', up.id);

      // Fila superior: Tecla de atajo y Nivel
      const top = document.createElement('div');
      top.className = 'dock-card-top';
      const keyBadge = document.createElement('span');
      keyBadge.className = 'dock-key-badge';
      keyBadge.textContent = `[${key}]`;
      const lvlBadge = document.createElement('span');
      lvlBadge.className = 'dock-lvl-badge';
      lvlBadge.textContent = `${up.level}/5`;
      top.appendChild(keyBadge);
      top.appendChild(lvlBadge);
      card.appendChild(top);

      // Icono
      const iconWrap = document.createElement('div');
      iconWrap.className = 'dock-icon-wrapper';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'dock-icon';
      iconSpan.textContent = meta.icon;
      iconWrap.appendChild(iconSpan);
      card.appendChild(iconWrap);

      // Nombre corto
      const nameSpan = document.createElement('span');
      nameSpan.className = 'dock-name';
      nameSpan.textContent = meta.shortName;
      card.appendChild(nameSpan);

      // 5 Pips de nivel
      const pipsContainer = document.createElement('div');
      pipsContainer.className = 'dock-pips-container';
      const pips: HTMLSpanElement[] = [];
      for (let i = 0; i < up.maxLevel; i++) {
        const pip = document.createElement('span');
        pip.className = 'dock-pip';
        pipsContainer.appendChild(pip);
        pips.push(pip);
      }
      card.appendChild(pipsContainer);

      // Botón de coste / estado
      const costBtn = document.createElement('div');
      costBtn.className = 'dock-cost-btn';
      costBtn.textContent = `⚡ ${up.baseCost}`;
      card.appendChild(costBtn);

      // Tooltip informativo
      const tooltip = document.createElement('div');
      tooltip.className = 'dock-tooltip';
      tooltip.innerHTML = `
        <div class="tooltip-title">${meta.icon} ${meta.fullName}</div>
        <div class="tooltip-desc">${meta.benefit}</div>
      `;
      const tooltipFooter = document.createElement('div');
      tooltipFooter.className = 'tooltip-footer';
      const tooltipLvl = document.createElement('span');
      tooltipLvl.textContent = `Nivel ${up.level}/${up.maxLevel}`;
      const tooltipCost = document.createElement('span');
      tooltipCost.className = 'tooltip-cost';
      tooltipCost.textContent = `Coste: ${up.baseCost} ATP [${key}]`;
      tooltipFooter.appendChild(tooltipLvl);
      tooltipFooter.appendChild(tooltipCost);
      tooltip.appendChild(tooltipFooter);
      card.appendChild(tooltip);

      // Aislamiento de eventos de ratón para que no activen mecánicas de juego en canvas
      card.addEventListener('pointerdown', (e) => e.stopPropagation());
      card.addEventListener('mousedown', (e) => e.stopPropagation());
      card.addEventListener('mouseup', (e) => e.stopPropagation());
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.handleUpgradeClick(up.id);
      });

      this.upgradesList.appendChild(card);
      this.upgradeCards.set(up.id, {
        card,
        lvlBadge,
        pips,
        costBtn,
        tooltipLvl,
        tooltipCost,
        key,
      });
    });

    this.renderUpgrades(true);
  }

  /**
   * Reconstruye y actualiza visualmente las 8 bio-mejoras para el nuevo Tier de la bacteria
   */
  public refreshUpgradesForNewTier(): void {
    this.initUpgradeCards();
    this.lastRenderedLevels = {};
    this.lastRenderedAtp = -1;
    this.renderUpgrades(true);
  }

  /**
   * Intenta comprar una mejora con ratón o teclado, ofreciendo retroalimentación inmediata
   * clara y sonora/visual al jugador en pantalla.
   */
  public handleUpgradeClick(upgradeId: string): boolean {
    const up = this.vacuoleManager.upgrades[upgradeId];
    if (!up) return false;

    if (up.level >= up.maxLevel) {
      this.showCustomPopup(`★ ${up.name} al Nivel Máximo (5/5)`, '#fbbf24');
      return false;
    }

    const cost = this.vacuoleManager.getUpgradeCost(upgradeId);
    if (this.vacuoleManager.atp < cost) {
      const falta = cost - Math.floor(this.vacuoleManager.atp);
      this.showCustomPopup(`⚡ Necesitas ${cost} ATP (Faltan ${falta})`, '#f87171');
      return false;
    }

    const success = this.vacuoleManager.buyUpgrade(upgradeId);
    if (success) {
      this.renderUpgrades(true);
    }
    return success;
  }

  /**
   * Actualiza el estado visual de las 8 cartas in-situ SIN reconstruir el DOM,
   * manteniendo intactos los listeners y la fluidez del navegador.
   */
  public renderUpgrades(force = false): void {
    const currentAtp = Math.floor(this.vacuoleManager.atp);

    // Detección de cambios: si el ATP entero y los niveles no han cambiado, omitir actualización
    let changed = force || currentAtp !== this.lastRenderedAtp;
    if (!changed) {
      for (const [id, up] of Object.entries(this.vacuoleManager.upgrades)) {
        if (this.lastRenderedLevels[id] !== up.level) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) return;

    this.lastRenderedAtp = currentAtp;

    for (const [id, up] of Object.entries(this.vacuoleManager.upgrades)) {
      this.lastRenderedLevels[id] = up.level;
      const ref = this.upgradeCards.get(id);
      if (!ref) continue;

      const cost = this.vacuoleManager.getUpgradeCost(id);
      const isMax = up.level >= up.maxLevel;
      const canAfford = !isMax && this.vacuoleManager.atp >= cost;

      // Clase de la tarjeta contenedora
      ref.card.className = `dock-upgrade-card ${canAfford ? 'affordable' : ''} ${isMax ? 'maxed' : 'pending'}`;

      // Etiqueta de nivel
      ref.lvlBadge.className = `dock-lvl-badge ${isMax ? 'gold' : ''}`;
      ref.lvlBadge.textContent = isMax ? 'MAX' : `${up.level}/5`;

      // Actualizar los 5 pips de nivel
      for (let i = 0; i < up.maxLevel; i++) {
        const isFilled = i < up.level;
        ref.pips[i].className = `dock-pip ${isFilled ? 'active' : ''} ${isMax ? 'maxed' : ''}`;
      }

      // Botón de coste
      ref.costBtn.className = `dock-cost-btn ${canAfford ? 'can-buy' : ''} ${isMax ? 'is-max' : ''}`;
      ref.costBtn.textContent = isMax ? '★ MAX' : `⚡ ${cost}`;

      // Pie del tooltip
      ref.tooltipLvl.textContent = isMax ? 'Nivel Máximo (5/5)' : `Nivel ${up.level}/${up.maxLevel}`;
      ref.tooltipCost.textContent = isMax ? '★ COMPLETO' : `Coste: ${cost} ATP [${ref.key}]`;
    }
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
    if (threat.alertLevel === 'CRITICAL') {
      this.showThreatAlert('¡RESPUESTA INMUNITARIA CRÍTICA!', 'Los macrófagos y neutrófilos te cercan', 'danger');
    } else if (threat.alertLevel === 'ALERT') {
      this.showThreatAlert('¡RESPUESTA INMUNITARIA!', 'Los neutrófilos te persiguen por quimiotaxis', 'warn');
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
