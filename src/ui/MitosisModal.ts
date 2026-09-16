import { EvolutionSystem } from '../systems/EvolutionSystem';
import { BacteriaSpecies } from '../data/MutationTree';
import { Player } from '../entities/Player';

export class MitosisModal {
  private evolutionSystem: EvolutionSystem;
  private player: Player;
  private modalContainer: HTMLDivElement;
  public isOpen = false;

  constructor(evolutionSystem: EvolutionSystem, player: Player) {
    this.evolutionSystem = evolutionSystem;
    this.player = player;

    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'mitosis-modal-overlay';
    this.modalContainer.className = 'modal-overlay hidden';
    document.body.appendChild(this.modalContainer);

    // Cerrar con tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
      if ((e.key === 'm' || e.key === 'M') && !this.isOpen) {
        this.open();
      }
    });
  }

  public open(): void {
    const options = this.evolutionSystem.getAvailableEvolutions();
    if (options.length === 0) {
      alert(`La especie ${this.player.currentSpecies.name} ha alcanzado el ápice evolutivo de su linaje.`);
      return;
    }

    this.isOpen = true;
    this.modalContainer.classList.remove('hidden');
    this.render(options);
  }

  public close(): void {
    this.isOpen = false;
    this.modalContainer.classList.add('hidden');
  }

  private render(options: BacteriaSpecies[]): void {
    const current = this.player.currentSpecies;

    let cardsHtml = '';
    options.forEach((opt) => {
      const hpDiff = opt.hp - current.hp;
      const speedDiff = (opt.maxSpeed - current.maxSpeed).toFixed(1);
      const socketsCount = opt.sockets.length;

      cardsHtml += `
        <div class="mutation-card" data-species-id="${opt.id}">
          <div class="mutation-badge">Tier ${opt.tier} • ${opt.archetype}</div>
          <h3 class="mutation-name">${opt.name}</h3>
          <p class="mutation-desc">${opt.description}</p>

          <div class="mutation-stats">
            <div class="stat-row">
              <span>HP Membrana:</span>
              <span class="stat-val ${hpDiff >= 0 ? 'good' : 'bad'}">${opt.hp} (${hpDiff >= 0 ? '+' : ''}${hpDiff})</span>
            </div>
            <div class="stat-row">
              <span>Cápsula (Escudo):</span>
              <span class="stat-val">${opt.shield}</span>
            </div>
            <div class="stat-row">
              <span>Velocidad Max:</span>
              <span class="stat-val ${Number(speedDiff) >= 0 ? 'good' : 'bad'}">${opt.maxSpeed} u/s</span>
            </div>
            <div class="stat-row">
              <span>Ranuras de Organelos:</span>
              <span class="stat-val good">${socketsCount} Sockets</span>
            </div>
          </div>

          <button class="evolve-btn" data-target-id="${opt.id}">
            🧬 Dividirse en ${opt.name}
          </button>
        </div>
      `;
    });

    this.modalContainer.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">🧬 MITOSIS CELULAR: RAMIFICACIÓN TAXONÓMICA</h2>
            <div class="modal-subtitle">Especie Actual: <b>${current.name} (Tier ${current.tier})</b></div>
          </div>
          <button id="close-mitosis-btn" class="modal-close-btn">&times;</button>
        </div>

        <div class="mutations-grid">
          ${cardsHtml}
        </div>
      </div>
    `;

    // Eventos de botones
    const closeBtn = document.getElementById('close-mitosis-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    const evolveBtns = this.modalContainer.querySelectorAll('.evolve-btn');
    evolveBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetId = (e.currentTarget as HTMLElement).getAttribute('data-target-id');
        const targetSpecies = options.find((o) => o.id === targetId);
        if (targetSpecies) {
          this.evolutionSystem.evolve(targetSpecies);
          this.close();
        }
      });
    });
  }
}
