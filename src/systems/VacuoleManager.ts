export interface BioUpgrade {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  description: string;
}

export interface CellStats {
  membraneIntegrity: number;
  maxMembraneIntegrity: number;
  osmoticPressure: number;
  maxOsmoticPressure: number;
  atp: number;
  atpCapacity: number;
  isMitosisReady: boolean;
}

export class VacuoleManager {
  // 1. Los 3 Medidores Celulares Canónicos
  public membraneIntegrity = 100;
  public maxMembraneIntegrity = 100;

  public osmoticPressure = 50;
  public maxOsmoticPressure = 50;
  public osmoticRegenRate = 4.0; // Puntos por segundo

  public atp = 0;
  public atpCapacity = 80;

  // 2. Upgrades Celulares estilo Starblast.io (8 estadísticas / 6 niveles)
  public upgrades: Record<string, BioUpgrade> = {
    propulsion: {
      id: 'propulsion',
      name: 'Propulsión Flagelar',
      level: 0,
      maxLevel: 5,
      baseCost: 15,
      costMultiplier: 1.5,
      description: '+15% Empuje y Velocidad Terminal',
    },
    toxinPower: {
      id: 'toxinPower',
      name: 'Potencia de Toxina',
      level: 0,
      maxLevel: 5,
      baseCost: 18,
      costMultiplier: 1.5,
      description: '+25% Daño y Velocidad de Proyectil',
    },
    fireRate: {
      id: 'fireRate',
      name: 'Cadencia de Eyección',
      level: 0,
      maxLevel: 5,
      baseCost: 20,
      costMultiplier: 1.6,
      description: '-18% Cooldown de Disparo',
    },
    chemotaxis: {
      id: 'chemotaxis',
      name: 'Radio de Quimiotaxis',
      level: 0,
      maxLevel: 5,
      baseCost: 12,
      costMultiplier: 1.4,
      description: '+2.5u Rango de Atracción Magnética',
    },
    turgor: {
      id: 'turgor',
      name: 'Turgencia Osmótica',
      level: 0,
      maxLevel: 5,
      baseCost: 22,
      costMultiplier: 1.5,
      description: '+15 Presión Osmótica (Escudo) y +50% Regeneración',
    },
    vacuoleCapacity: {
      id: 'vacuoleCapacity',
      name: 'Capacidad de Vacuola',
      level: 0,
      maxLevel: 5,
      baseCost: 25,
      costMultiplier: 1.7,
      description: '+40 Capacidad de Almacenamiento de ATP',
    },
  };

  // Eventos y callbacks
  public onStatsChanged?: (stats: CellStats) => void;
  public onAtpCollected?: (amount: number, total: number) => void;
  public onAtpLeak?: (lostAmount: number) => void;
  public onMitosisAvailable?: () => void;

  private mitosisNotified = false;

  constructor() {}

  /**
   * Regeneración pasiva de turgencia osmótica y sincronización periódica
   */
  public update(dt: number): void {
    if (this.osmoticPressure < this.maxOsmoticPressure) {
      this.osmoticPressure = Math.min(
        this.maxOsmoticPressure,
        this.osmoticPressure + this.osmoticRegenRate * dt
      );
      this.notifyStats();
    }
  }

  /**
   * Recolecta ATP al absorber orbes en la vacuola
   */
  public addAtp(amount: number): number {
    const spaceLeft = this.atpCapacity - this.atp;
    const added = Math.min(amount, spaceLeft);
    this.atp += added;

    if (this.onAtpCollected) {
      this.onAtpCollected(added, this.atp);
    }

    // Verificar si la vacuola está al 100% para Mitosis
    if (this.atp >= this.atpCapacity && !this.mitosisNotified) {
      this.mitosisNotified = true;
      if (this.onMitosisAvailable) {
        this.onMitosisAvailable();
      }
    }

    this.notifyStats();
    return added;
  }

  /**
   * Calcula el coste dinámico de un upgrade
   */
  public getUpgradeCost(upgradeId: string): number {
    const up = this.upgrades[upgradeId];
    if (!up || up.level >= up.maxLevel) return Infinity;
    return Math.round(up.baseCost * Math.pow(up.costMultiplier, up.level));
  }

  /**
   * Compra una bio-mejora gastando ATP de la vacuola
   */
  public buyUpgrade(upgradeId: string): boolean {
    const up = this.upgrades[upgradeId];
    if (!up) return false;

    const cost = this.getUpgradeCost(upgradeId);
    if (this.atp < cost || up.level >= up.maxLevel) {
      return false;
    }

    // Deducir coste
    this.atp -= cost;
    up.level++;

    // Aplicar efectos inmediatos en estadísticas base
    if (upgradeId === 'turgor') {
      this.maxOsmoticPressure += 15;
      this.osmoticPressure += 15;
      this.osmoticRegenRate *= 1.25;
    } else if (upgradeId === 'vacuoleCapacity') {
      this.atpCapacity += 45;
      this.mitosisNotified = false; // Requiere llenar la nueva capacidad
    }

    this.notifyStats();
    return true;
  }

  /**
   * Aplica daño a la bacteria: primero consume presión osmótica (escudo),
   * luego integridad de membrana. Si el impacto es severo, produce derrame de ATP (ATPLeak).
   */
  public takeDamage(amount: number): void {
    let remaining = amount;

    // 1. Absorber con Presión Osmótica
    if (this.osmoticPressure > 0) {
      const absorbed = Math.min(this.osmoticPressure, remaining);
      this.osmoticPressure -= absorbed;
      remaining -= absorbed;
    }

    // 2. Daño a la Integridad de Membrana
    if (remaining > 0) {
      this.membraneIntegrity = Math.max(0, this.membraneIntegrity - remaining);

      // Penalización ATPLeak si se daña la membrana y se tiene ATP almacenado
      if (this.atp > 0) {
        const leak = Math.min(this.atp, Math.max(4, Math.round(this.atp * 0.15)));
        this.atp -= leak;
        if (this.onAtpLeak) {
          this.onAtpLeak(leak);
        }
      }
    }

    this.notifyStats();
  }

  public getStats(): CellStats {
    return {
      membraneIntegrity: Math.round(this.membraneIntegrity),
      maxMembraneIntegrity: this.maxMembraneIntegrity,
      osmoticPressure: Math.round(this.osmoticPressure),
      maxOsmoticPressure: this.maxOsmoticPressure,
      atp: Math.round(this.atp),
      atpCapacity: this.atpCapacity,
      isMitosisReady: this.atp >= this.atpCapacity,
    };
  }

  public notifyStats(): void {
    if (this.onStatsChanged) {
      this.onStatsChanged(this.getStats());
    }
  }
}
