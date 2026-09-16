import { EvolutionSystem } from '../systems/EvolutionSystem';
import { BacteriaSpecies, SPECIES_CATALOG, CellRole } from '../data/MutationTree';
import { Player } from '../entities/Player';

export class MitosisModal {
  private evolutionSystem: EvolutionSystem;
  private player: Player;
  private modalContainer: HTMLDivElement;
  public isOpen = false;
  public onMitosisNotReady?: (current: number, cap: number) => void;

  private selectedSpeciesId: string;
  private currentRootId: string;

  constructor(evolutionSystem: EvolutionSystem, player: Player) {
    this.evolutionSystem = evolutionSystem;
    this.player = player;
    this.selectedSpeciesId = player.currentSpecies.id;
    this.currentRootId = player.currentSpecies.id;

    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'mitosis-modal-overlay';
    this.modalContainer.className = 'modal-overlay hidden';
    document.body.appendChild(this.modalContainer);

    // Detener propagación de eventos para que no afecten al juego
    this.modalContainer.addEventListener('mousedown', (e) => e.stopPropagation());
    this.modalContainer.addEventListener('mouseup', (e) => e.stopPropagation());
    this.modalContainer.addEventListener('click', (e) => e.stopPropagation());

    // Atajos de teclado (Escape y M para cerrar/abrir)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      } else if (e.key === 'm' || e.key === 'M') {
        if (this.isOpen) {
          this.close();
        } else {
          this.open();
        }
      }
    });

    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.drawConnectionLines();
      }
    });
  }

  public open(forceSelectedId?: string): void {
    this.isOpen = true;
    this.player.isControlsLocked = true;
    this.player.isThrusting = false;
    this.player.isSprintRequested = false;
    this.modalContainer.classList.remove('hidden');

    this.currentRootId = this.player.currentSpecies.id;
    const available = this.evolutionSystem.getAvailableEvolutions();

    if (forceSelectedId) {
      this.selectedSpeciesId = forceSelectedId;
    } else if (available.length > 0 && this.evolutionSystem.canMitosis()) {
      this.selectedSpeciesId = available[0].id;
    } else {
      this.selectedSpeciesId = this.player.currentSpecies.id;
    }

    this.render();
    requestAnimationFrame(() => this.drawConnectionLines());
  }

  public close(): void {
    this.isOpen = false;
    this.player.isControlsLocked = false;
    this.player.isThrusting = false;
    this.player.isSprintRequested = false;
    this.modalContainer.classList.add('hidden');
  }

  /**
   * Obtiene la estructura en capas de la pirámide partiendo de la célula actual en la base
   */
  private getPyramidLayers(rootSpecies: BacteriaSpecies): Record<number, BacteriaSpecies[]> {
    const layers: Record<number, BacteriaSpecies[]> = {};
    const rootTier = rootSpecies.tier;

    // Piso 0 (Base inferior): La célula raíz (actual)
    layers[rootTier] = [rootSpecies];

    // Pisos superiores (Arriba): Hijos directos y descendientes
    for (let t = rootTier + 1; t <= 5; t++) {
      const prevNodes = layers[t - 1] || [];
      const prevIds = new Set(prevNodes.map((n) => n.id));
      const currentTierNodes = Object.values(SPECIES_CATALOG).filter(
        (sp) => sp.tier === t && sp.parentIds.some((pId) => prevIds.has(pId))
      );
      layers[t] = currentTierNodes;
    }

    return layers;
  }

  private render(): void {
    const current = this.player.currentSpecies;
    const rootSpecies = SPECIES_CATALOG[this.currentRootId] || current;
    const canMitosis = this.evolutionSystem.canMitosis();
    const availableEvolutions = this.evolutionSystem.getAvailableEvolutions();
    const availableIds = new Set(availableEvolutions.map((sp) => sp.id));
    const currentAtp = Math.round(this.evolutionSystem.vacuoleManager.atp);
    const atpCap = this.evolutionSystem.vacuoleManager.atpCapacity;

    const selectedSpecies = SPECIES_CATALOG[this.selectedSpeciesId] || current;
    const pyramidLayers = this.getPyramidLayers(rootSpecies);

    // Obtener los tiers ordenados de menor a mayor (Base abajo -> Cúspide arriba)
    const tierNumbers = Object.keys(pyramidLayers)
      .map(Number)
      .sort((a, b) => a - b);

    // Construir los pisos de la pirámide de abajo hacia arriba
    let pyramidRowsHtml = '';
    tierNumbers.forEach((tierNum) => {
      const nodes = pyramidLayers[tierNum] || [];
      const isBase = tierNum === rootSpecies.tier;
      const isNext = tierNum === rootSpecies.tier + 1;
      const isApex = tierNum === 5;

      let rowLabel = `NIVEL ${tierNum}`;
      if (isBase) rowLabel = `📍 BASE: CÉLULA ACTUAL`;
      else if (isNext) rowLabel = `🧬 MITOSIS INMEDIATA (MUTAR)`;
      else if (isApex) rowLabel = `👑 CÚSPIDE: SUPER MACRO TITANES`;

      let nodesHtml = '';
      nodes.forEach((sp) => {
        const isCurrent = sp.id === current.id;
        const isAvailable = availableIds.has(sp.id);
        const isSelected = sp.id === selectedSpecies.id;
        const roleClass = this.getRoleClass(sp.role);

        let stateClass = 'node-locked';
        let badgeText = `Tier ${sp.tier}`;

        if (isCurrent) {
          stateClass = 'node-current';
          badgeText = 'ACTUAL';
        } else if (isAvailable && canMitosis) {
          stateClass = 'node-available';
          badgeText = '¡MUTAR!';
        } else if (isAvailable) {
          stateClass = 'node-unlocked-pending';
          badgeText = 'DISPONIBLE';
        } else if (isApex) {
          stateClass = 'node-apex';
          badgeText = 'TITÁN';
        }

        nodesHtml += `
          <div 
            id="pyramid-node-${sp.id}"
            class="pyramid-node ${stateClass} ${isSelected ? 'node-selected' : ''} ${roleClass}"
            data-species-id="${sp.id}"
          >
            <div class="p-node-header">
              <span class="p-node-icon">${sp.icon}</span>
              <span class="p-node-badge">${badgeText}</span>
            </div>
            <div class="p-node-name">${sp.name}</div>
            <div class="p-node-archetype">${sp.archetype}</div>
            ${
              isAvailable && canMitosis
                ? `<div class="p-node-action">🧬 Mutar</div>`
                : ''
            }
          </div>
        `;
      });

      pyramidRowsHtml += `
        <div class="pyramid-floor ${isBase ? 'floor-base' : ''} ${isNext ? 'floor-next' : ''} ${isApex ? 'floor-apex' : ''}" data-tier="${tierNum}">
          <div class="floor-tag">${rowLabel}</div>
          <div class="floor-nodes-row">
            ${nodesHtml}
          </div>
        </div>
      `;
    });

    // Si está en Tier 1, ofrecer selector de linaje para comparar el otro inicio
    let branchSwitcherHtml = '';
    if (current.tier === 1) {
      const isMicro = rootSpecies.id === 'micrococcus';
      branchSwitcherHtml = `
        <div class="branch-switcher">
          <span class="switcher-label">Linaje Base:</span>
          <button class="switch-btn ${isMicro ? 'active' : ''}" data-root="micrococcus">
            ⚡ Rama Micrococcus (Ágil)
          </button>
          <button class="switch-btn ${!isMicro ? 'active' : ''}" data-root="bacillus_primus">
            🛡️ Rama Bacillus (Tanque)
          </button>
        </div>
      `;
    }

    // Panel de Inspección Lateral
    const inspectorHtml = this.renderInspector(selectedSpecies, current, canMitosis, availableIds);

    this.modalContainer.innerHTML = `
      <div class="pyramid-modal-window">
        <!-- Barra Superior Compacta -->
        <div class="pyramid-header">
          <div class="header-left">
            <span class="header-title">🧬 PIRÁMIDE EVOLUTIVA ASCENDENTE</span>
            <span class="header-badge">Proyección de Abajo hacia Arriba</span>
          </div>
          <div class="header-center">
            <span class="cell-status-label">Célula: <b>${current.name}</b></span>
            <span class="atp-status-pill ${canMitosis ? 'ready' : 'pending'}">
              ⚡ ${currentAtp} / ${atpCap} ATP (${Math.round((currentAtp / atpCap) * 100)}%)
              ${canMitosis ? ' • ¡MITOSIS LISTA!' : ''}
            </span>
          </div>
          <button id="close-pyramid-btn" class="pyramid-close-btn">&times;</button>
        </div>

        <!-- Área Central: Pirámide Ascendente + Inspector -->
        <div class="pyramid-content">
          <!-- Lienzo de la Pirámide -->
          <div class="pyramid-canvas-area" id="pyramid-canvas-viewport">
            <svg id="pyramid-svg-layer" class="pyramid-svg-lines"></svg>
            
            <div class="pyramid-stack">
              ${pyramidRowsHtml}
            </div>

            ${branchSwitcherHtml}
          </div>

          <!-- Inspector Lateral Compacto -->
          <div class="pyramid-inspector-dock">
            ${inspectorHtml}
          </div>
        </div>

        <!-- Barra Inferior de Roles -->
        <div class="pyramid-footer">
          <div class="role-pill"><span>⚡</span> Interceptor</div>
          <div class="role-pill"><span>🛡️</span> Acorazado</div>
          <div class="role-pill"><span>⚔️</span> Depredador Lítico</div>
          <div class="role-pill"><span>🔋</span> Asimilador</div>
          <div class="role-pill"><span>👑</span> Titán Nivel 5</div>
        </div>
      </div>
    `;

    // Listeners
    const closeBtn = document.getElementById('close-pyramid-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Clic en los nodos para inspeccionar
    const nodes = this.modalContainer.querySelectorAll('.pyramid-node');
    nodes.forEach((n) => {
      n.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).getAttribute('data-species-id');
        if (id) {
          this.selectedSpeciesId = id;
          this.render();
          requestAnimationFrame(() => this.drawConnectionLines());
        }
      });
    });

    // Selector de linajes si está en Tier 1
    const switchBtns = this.modalContainer.querySelectorAll('.switch-btn');
    switchBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const root = (e.currentTarget as HTMLElement).getAttribute('data-root');
        if (root) {
          this.currentRootId = root;
          this.selectedSpeciesId = root;
          this.render();
          requestAnimationFrame(() => this.drawConnectionLines());
        }
      });
    });

    // Botón de mutar en el inspector
    const mutateBtn = document.getElementById('inspector-mutate-btn');
    if (mutateBtn) {
      mutateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const target = SPECIES_CATALOG[this.selectedSpeciesId];
        if (target && this.evolutionSystem.canMitosis()) {
          const success = this.evolutionSystem.evolve(target);
          if (success) {
            this.close();
          }
        }
      });
    }
  }

  private renderInspector(
    selected: BacteriaSpecies,
    current: BacteriaSpecies,
    canMitosis: boolean,
    availableIds: Set<string>
  ): string {
    const isCurrent = selected.id === current.id;
    const isAvailable = availableIds.has(selected.id);
    const hpDiff = selected.hp - current.hp;
    const shieldDiff = selected.shield - current.shield;
    const speedDiff = (selected.maxSpeed - current.maxSpeed).toFixed(1);
    const massDiff = (selected.mass - current.mass).toFixed(2);
    const vacuoleDiff = selected.vacuoleCapacity - current.vacuoleCapacity;

    let actionBtnHtml = '';
    if (isCurrent) {
      actionBtnHtml = `
        <div class="insp-status-badge current">
          ✓ Esta es tu célula activa (Base)
        </div>
      `;
    } else if (isAvailable && canMitosis) {
      actionBtnHtml = `
        <button id="inspector-mutate-btn" class="insp-mutate-btn active-btn">
          🧬 Mutar en ${selected.name}
        </button>
      `;
    } else if (isAvailable && !canMitosis) {
      const atp = Math.round(this.evolutionSystem.vacuoleManager.atp);
      const cap = this.evolutionSystem.vacuoleManager.atpCapacity;
      actionBtnHtml = `
        <div class="insp-status-badge locked">
          ⚠️ Requiere Vacuola al 100% (${atp}/${cap} ATP)
        </div>
      `;
    } else {
      const parentNames = selected.parentIds.map((pId) => SPECIES_CATALOG[pId]?.name || pId).join(', ');
      actionBtnHtml = `
        <div class="insp-status-badge future">
          🔒 Proyección futura • Vía: <b>${parentNames || 'Nivel inferior'}</b>
        </div>
      `;
    }

    return `
      <div class="insp-card">
        <div class="insp-top">
          <span class="insp-icon">${selected.icon}</span>
          <div class="insp-title-box">
            <span class="insp-tag ${this.getRoleClass(selected.role)}">Tier ${selected.tier} • ${selected.role}</span>
            <h3 class="insp-name">${selected.name}</h3>
            <span class="insp-archetype">${selected.archetype}</span>
          </div>
        </div>

        <p class="insp-desc">${selected.description}</p>

        <div class="insp-stats-grid">
          <div class="stat-cell">
            <span class="stat-lbl">HP Membrana</span>
            <span class="stat-num ${hpDiff >= 0 ? 'good' : 'bad'}">${selected.hp} (${hpDiff >= 0 ? '+' : ''}${hpDiff})</span>
          </div>
          <div class="stat-cell">
            <span class="stat-lbl">Escudo Osmótico</span>
            <span class="stat-num ${shieldDiff >= 0 ? 'good' : 'bad'}">${selected.shield} (${shieldDiff >= 0 ? '+' : ''}${shieldDiff})</span>
          </div>
          <div class="stat-cell">
            <span class="stat-lbl">Velocidad Punta</span>
            <span class="stat-num ${Number(speedDiff) >= 0 ? 'good' : 'bad'}">${selected.maxSpeed} u/s</span>
          </div>
          <div class="stat-cell">
            <span class="stat-lbl">Masa Celular</span>
            <span class="stat-num ${Number(massDiff) >= 0 ? 'good' : 'bad'}">${selected.mass} μg (${Number(massDiff) >= 0 ? '+' : ''}${massDiff})</span>
          </div>
          <div class="stat-cell">
            <span class="stat-lbl">Vacuola ATP</span>
            <span class="stat-num ${vacuoleDiff >= 0 ? 'good' : 'bad'}">${selected.vacuoleCapacity} ATP (${vacuoleDiff >= 0 ? '+' : ''}${vacuoleDiff})</span>
          </div>
          <div class="stat-cell">
            <span class="stat-lbl">Organelos</span>
            <span class="stat-num good">${selected.sockets.length} Sockets</span>
          </div>
        </div>

        <div class="insp-action-box">
          ${actionBtnHtml}
        </div>
      </div>
    `;
  }

  /**
   * Dibuja los cables SVG que conectan a los padres (abajo) con sus hijos (arriba)
   */
  private drawConnectionLines(): void {
    const svg = document.getElementById('pyramid-svg-layer') as SVGSVGElement | null;
    const viewport = document.getElementById('pyramid-canvas-viewport');
    if (!svg || !viewport) return;

    const vRect = viewport.getBoundingClientRect();
    svg.setAttribute('width', `${viewport.clientWidth}`);
    svg.setAttribute('height', `${viewport.clientHeight}`);
    svg.innerHTML = '';

    const current = this.player.currentSpecies;
    const available = this.evolutionSystem.getAvailableEvolutions();
    const availableIds = new Set(available.map((a) => a.id));

    // Conectar nodos visibles en la pirámide
    const visibleNodes = viewport.querySelectorAll('.pyramid-node');
    visibleNodes.forEach((childNode) => {
      const childId = childNode.getAttribute('data-species-id');
      if (!childId) return;

      const childSp = SPECIES_CATALOG[childId];
      if (!childSp) return;

      childSp.parentIds.forEach((parentId) => {
        const parentNode = document.getElementById(`pyramid-node-${parentId}`);
        if (!parentNode) return;

        const pRect = parentNode.getBoundingClientRect();
        const cRect = childNode.getBoundingClientRect();

        // Padre abajo (Top center del padre) -> Hijo arriba (Bottom center del hijo)
        const startX = pRect.left + pRect.width / 2 - vRect.left;
        const startY = pRect.top - vRect.top;

        const endX = cRect.left + cRect.width / 2 - vRect.left;
        const endY = cRect.bottom - vRect.top;

        const dy = (startY - endY) * 0.5;
        const pathData = `M ${startX} ${startY} C ${startX} ${startY - dy}, ${endX} ${endY + dy}, ${endX} ${endY}`;

        let wireClass = 'p-wire-future';
        if (parentId === current.id && availableIds.has(childId)) {
          wireClass = 'p-wire-active';
        }

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', pathData);
        pathEl.setAttribute('class', `pyramid-wire ${wireClass}`);
        svg.appendChild(pathEl);
      });
    });
  }

  private getRoleClass(role: CellRole): string {
    switch (role) {
      case CellRole.INTERCEPTOR:
        return 'role-interceptor';
      case CellRole.ARMORED_TANK:
        return 'role-tank';
      case CellRole.LYTIC_PREDATOR:
        return 'role-predator';
      case CellRole.METABOLIC_HARVESTER:
        return 'role-harvester';
      case CellRole.APEX_TITAN:
        return 'role-titan';
      default:
        return '';
    }
  }
}
