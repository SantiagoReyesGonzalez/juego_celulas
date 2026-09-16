import { EvolutionSystem } from '../systems/EvolutionSystem';
import { BacteriaSpecies, SPECIES_CATALOG, MutationTree, CellRole } from '../data/MutationTree';
import { Player } from '../entities/Player';

export class MitosisModal {
  private evolutionSystem: EvolutionSystem;
  private player: Player;
  private modalContainer: HTMLDivElement;
  public isOpen = false;
  public onMitosisNotReady?: (current: number, cap: number) => void;

  private selectedSpeciesId: string;

  constructor(evolutionSystem: EvolutionSystem, player: Player) {
    this.evolutionSystem = evolutionSystem;
    this.player = player;
    this.selectedSpeciesId = player.currentSpecies.id;

    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'mitosis-modal-overlay';
    this.modalContainer.className = 'modal-overlay hidden';
    document.body.appendChild(this.modalContainer);

    // Detener propagación de eventos para aislar la UI del canvas
    this.modalContainer.addEventListener('mousedown', (e) => e.stopPropagation());
    this.modalContainer.addEventListener('mouseup', (e) => e.stopPropagation());
    this.modalContainer.addEventListener('click', (e) => e.stopPropagation());

    // Eventos de teclado
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

    const available = this.evolutionSystem.getAvailableEvolutions();
    if (forceSelectedId) {
      this.selectedSpeciesId = forceSelectedId;
    } else if (available.length > 0 && this.evolutionSystem.canMitosis()) {
      this.selectedSpeciesId = available[0].id;
    } else {
      this.selectedSpeciesId = this.player.currentSpecies.id;
    }

    this.render();
    setTimeout(() => this.drawConnectionLines(), 40);
  }

  public close(): void {
    this.isOpen = false;
    this.player.isControlsLocked = false;
    this.player.isThrusting = false;
    this.player.isSprintRequested = false;
    this.modalContainer.classList.add('hidden');
  }

  private render(): void {
    const current = this.player.currentSpecies;
    const canMitosis = this.evolutionSystem.canMitosis();
    const availableEvolutions = this.evolutionSystem.getAvailableEvolutions();
    const availableIds = new Set(availableEvolutions.map((sp) => sp.id));
    const allTiers = MutationTree.getAllTiers();
    const currentAtp = Math.round(this.evolutionSystem.vacuoleManager.atp);
    const atpCap = this.evolutionSystem.vacuoleManager.atpCapacity;

    const selectedSpecies = SPECIES_CATALOG[this.selectedSpeciesId] || current;

    // Generar columnas del Árbol (Tiers 1 a 5)
    let columnsHtml = '';
    const tierLabels = [
      { num: 1, title: 'TIER 1 (2 Células)' },
      { num: 2, title: 'TIER 2 (4 Células)' },
      { num: 3, title: 'TIER 3 (8 Células)' },
      { num: 4, title: 'TIER 4 (10 Células)' },
      { num: 5, title: 'TIER 5 (5 Macro Titanes)' },
    ];

    tierLabels.forEach(({ num, title }) => {
      const speciesList = allTiers[num] || [];
      let nodesHtml = '';

      speciesList.forEach((sp) => {
        const isCurrent = sp.id === current.id;
        const isAvailable = availableIds.has(sp.id);
        const isSelected = sp.id === selectedSpecies.id;
        const roleClass = this.getRoleClass(sp.role);

        let stateClass = 'node-locked';
        let badgeText = `T${sp.tier}`;

        if (isCurrent) {
          stateClass = 'node-current';
          badgeText = 'ACTUAL';
        } else if (isAvailable && canMitosis) {
          stateClass = 'node-available';
          badgeText = '¡MUTAR!';
        } else if (isAvailable) {
          stateClass = 'node-unlocked-pending';
          badgeText = 'SIGUIENTE';
        }

        nodesHtml += `
          <div 
            id="tree-node-${sp.id}"
            class="tree-node ${stateClass} ${isSelected ? 'node-selected' : ''} ${roleClass}"
            data-species-id="${sp.id}"
          >
            <div class="node-header">
              <span class="node-role-icon">${sp.icon}</span>
              <span class="node-tier-badge">${badgeText}</span>
            </div>
            <div class="node-name">${sp.name}</div>
            <div class="node-archetype">${sp.archetype}</div>
            ${
              isAvailable && canMitosis
                ? `<div class="node-action-glow">Evolucionar</div>`
                : ''
            }
          </div>
        `;
      });

      columnsHtml += `
        <div class="tree-tier-column" data-tier="${num}">
          <div class="tier-column-header">
            <span class="tier-num-pill">Nivel ${num}</span>
            <span class="tier-subtitle">${title}</span>
          </div>
          <div class="tier-nodes-stack">
            ${nodesHtml}
          </div>
        </div>
      `;
    });

    // Panel de Inspección de la Especie Seleccionada
    const inspectorHtml = this.renderInspector(selectedSpecies, current, canMitosis, availableIds);

    this.modalContainer.innerHTML = `
      <div class="tree-modal-window">
        <!-- Encabezado del Árbol de Evolución -->
        <div class="tree-header">
          <div class="tree-title-group">
            <div class="tree-title-row">
              <span class="tree-main-title">🧬 ÁRBOL TAXONÓMICO DE EVOLUCIÓN CELULAR</span>
              <span class="starblast-badge">Estilo Starblast.io</span>
            </div>
            <div class="tree-status-sub">
              Célula Actual: <b style="color: #38bdf8;">${current.name} (Tier ${current.tier})</b>
              &nbsp;•&nbsp; 
              Vacuola ATP: <b style="color: ${canMitosis ? '#10b981' : '#f59e0b'};">${currentAtp} / ${atpCap} ATP (${Math.round((currentAtp / atpCap) * 100)}%)</b>
              ${
                canMitosis
                  ? ' &nbsp;•&nbsp; <span class="mitosis-ready-pill">¡MITOSIS LISTA! Elige tu mutación</span>'
                  : ' &nbsp;•&nbsp; <span class="mitosis-locked-pill">Llena la vacuola al 100% para mutar</span>'
              }
            </div>
          </div>
          <button id="close-tree-btn" class="tree-close-btn">&times;</button>
        </div>

        <!-- Cuerpo con Árbol SVG y Panel de Inspección Lateral -->
        <div class="tree-body-layout">
          <div class="tree-scroll-container" id="tree-scroll-viewport">
            <svg id="tree-connections-svg" class="tree-svg-layer"></svg>
            <div class="tree-columns-grid">
              ${columnsHtml}
            </div>
          </div>

          <!-- Panel de Inspección Lateral -->
          <div class="tree-inspector-panel">
            ${inspectorHtml}
          </div>
        </div>

        <!-- Leyenda de Roles en la Barra Inferior -->
        <div class="tree-footer-legend">
          <div class="legend-item"><span class="legend-icon">⚡</span> <b>Interceptor:</b> Velocidad punta y agilidad</div>
          <div class="legend-item"><span class="legend-icon">🛡️</span> <b>Acorazado:</b> Membrana pesada y escudo</div>
          <div class="legend-item"><span class="legend-icon">⚔️</span> <b>Depredador Lítico:</b> Daño de sprint y lisis</div>
          <div class="legend-item"><span class="legend-icon">🔋</span> <b>Asimilador:</b> Vacuola gigante y absorción</div>
          <div class="legend-item"><span class="legend-icon">👑</span> <b>Titán:</b> Super macro célula de Tier 5</div>
        </div>
      </div>
    `;

    // Asignar listeners
    const closeBtn = document.getElementById('close-tree-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Clic en los nodos del árbol para inspeccionar
    const nodeEls = this.modalContainer.querySelectorAll('.tree-node');
    nodeEls.forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const speciesId = (e.currentTarget as HTMLElement).getAttribute('data-species-id');
        if (speciesId) {
          this.selectedSpeciesId = speciesId;
          this.render();
          this.drawConnectionLines();
        }
      });
    });

    // Botón de Evolución en el Inspector
    const evolveActionBtn = document.getElementById('inspector-evolve-btn');
    if (evolveActionBtn) {
      evolveActionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const targetSpecies = SPECIES_CATALOG[this.selectedSpeciesId];
        if (targetSpecies && this.evolutionSystem.canMitosis()) {
          const success = this.evolutionSystem.evolve(targetSpecies);
          if (success) {
            this.close();
          }
        }
      });
    }

    // Scroll para enfocar la célula actual o seleccionada
    const selectedEl = document.getElementById(`tree-node-${this.selectedSpeciesId}`);
    const viewport = document.getElementById('tree-scroll-viewport');
    if (selectedEl && viewport) {
      const offset = selectedEl.offsetLeft - viewport.clientWidth / 2 + selectedEl.clientWidth / 2;
      viewport.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
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
        <div class="inspector-status-badge current-status">
          ✓ Esta es tu célula actual
        </div>
      `;
    } else if (isAvailable && canMitosis) {
      actionBtnHtml = `
        <button id="inspector-evolve-btn" class="inspector-evolve-btn ready">
          🧬 Mutar en ${selected.name}
        </button>
      `;
    } else if (isAvailable && !canMitosis) {
      const currentAtp = Math.round(this.evolutionSystem.vacuoleManager.atp);
      const cap = this.evolutionSystem.vacuoleManager.atpCapacity;
      actionBtnHtml = `
        <div class="inspector-status-badge locked-status">
          ⚠️ Requiere Vacuola al 100% (${currentAtp} / ${cap} ATP)
        </div>
      `;
    } else {
      const parentNames = selected.parentIds.map((pId) => SPECIES_CATALOG[pId]?.name || pId).join(', ');
      actionBtnHtml = `
        <div class="inspector-status-badge future-status">
          🔒 Bloqueado • Evoluciona antes desde: <b>${parentNames || 'Tier anterior'}</b>
        </div>
      `;
    }

    return `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="inspector-role-badge ${this.getRoleClass(selected.role)}">
            <span>${selected.icon}</span>
            <span>Tier ${selected.tier} • ${selected.role}</span>
          </div>
          <h2 class="inspector-name">${selected.name}</h2>
          <div class="inspector-archetype">${selected.archetype}</div>
        </div>

        <p class="inspector-desc">${selected.description}</p>

        <div class="inspector-stats-table">
          <div class="stat-heading">📊 Estadísticas Comparativas</div>
          <div class="stat-row">
            <span>HP Membrana:</span>
            <span class="stat-val ${hpDiff >= 0 ? 'good' : 'bad'}">${selected.hp} (${hpDiff >= 0 ? '+' : ''}${hpDiff})</span>
          </div>
          <div class="stat-row">
            <span>Presión Osmótica (Escudo):</span>
            <span class="stat-val ${shieldDiff >= 0 ? 'good' : 'bad'}">${selected.shield} (${shieldDiff >= 0 ? '+' : ''}${shieldDiff})</span>
          </div>
          <div class="stat-row">
            <span>Velocidad Terminal:</span>
            <span class="stat-val ${Number(speedDiff) >= 0 ? 'good' : 'bad'}">${selected.maxSpeed} u/s (${Number(speedDiff) >= 0 ? '+' : ''}${speedDiff})</span>
          </div>
          <div class="stat-row">
            <span>Masa Inercial:</span>
            <span class="stat-val">${selected.mass} μg (${Number(massDiff) >= 0 ? '+' : ''}${massDiff})</span>
          </div>
          <div class="stat-row">
            <span>Capacidad Vacuola ATP:</span>
            <span class="stat-val good">${selected.vacuoleCapacity} ATP (${vacuoleDiff >= 0 ? '+' : ''}${vacuoleDiff})</span>
          </div>
          <div class="stat-row">
            <span>Ranuras de Organelos:</span>
            <span class="stat-val good">${selected.sockets.length} Sockets</span>
          </div>
        </div>

        <div class="inspector-footer">
          ${actionBtnHtml}
        </div>
      </div>
    `;
  }

  private drawConnectionLines(): void {
    const svg = document.getElementById('tree-connections-svg') as SVGSVGElement | null;
    const viewport = document.getElementById('tree-scroll-viewport');
    if (!svg || !viewport) return;

    // Ajustar resolución interna del SVG al tamaño real de contenido del árbol
    const scrollW = viewport.scrollWidth;
    const scrollH = viewport.scrollHeight;
    svg.setAttribute('width', `${scrollW}`);
    svg.setAttribute('height', `${scrollH}`);
    svg.innerHTML = '';

    const current = this.player.currentSpecies;
    const availableEvolutions = this.evolutionSystem.getAvailableEvolutions();
    const availableIds = new Set(availableEvolutions.map((e) => e.id));
    const ancestors = MutationTree.getAncestors(current.id);

    // Trazar una curva Bézier cúbica suave entre cada par Padre -> Hijo
    Object.values(SPECIES_CATALOG).forEach((childSp) => {
      const childNode = document.getElementById(`tree-node-${childSp.id}`);
      if (!childNode) return;

      childSp.parentIds.forEach((parentId) => {
        const parentNode = document.getElementById(`tree-node-${parentId}`);
        if (!parentNode) return;

        const parentX = parentNode.offsetLeft + parentNode.offsetWidth;
        const parentY = parentNode.offsetTop + parentNode.offsetHeight / 2;

        const childX = childNode.offsetLeft;
        const childY = childNode.offsetTop + childNode.offsetHeight / 2;

        const dx = (childX - parentX) * 0.52;
        const pathData = `M ${parentX} ${parentY} C ${parentX + dx} ${parentY}, ${childX - dx} ${childY}, ${childX} ${childY}`;

        // Clasificar estilo del cable de conexión
        let lineClass = 'tree-wire-inactive';
        if (ancestors.has(parentId) && (ancestors.has(childSp.id) || childSp.id === current.id)) {
          lineClass = 'tree-wire-ancestor';
        } else if (parentId === current.id && availableIds.has(childSp.id)) {
          lineClass = 'tree-wire-available';
        }

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', pathData);
        pathEl.setAttribute('class', `tree-wire ${lineClass}`);
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
