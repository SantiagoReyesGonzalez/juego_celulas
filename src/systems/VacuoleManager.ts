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

  public atp = 25;
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
    sprintPower: {
      id: 'sprintPower',
      name: 'Impulso de Caza (Sprint)',
      level: 0,
      maxLevel: 5,
      baseCost: 16,
      costMultiplier: 1.5,
      description: '+20% Aceleración de Sprint y -15% Coste de ATP',
    },
    digestiveEfficiency: {
      id: 'digestiveEfficiency',
      name: 'Eficiencia Enzimática',
      level: 0,
      maxLevel: 5,
      baseCost: 18,
      costMultiplier: 1.5,
      description: '+25% Biomasa Asimilada por Engullimiento',
    },
    chemotaxis: {
      id: 'chemotaxis',
      name: 'Receptores de Membrana',
      level: 0,
      maxLevel: 5,
      baseCost: 12,
      costMultiplier: 1.4,
      description: '+20% ATP Obtenido por Alimento Absorbido',
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

  // Eventos y callbacks (compatibilidad directa y soporte multilisterner)
  public onStatsChanged?: (stats: CellStats) => void;
  public onAtpCollected?: (amount: number, total: number) => void;
  public onAtpSpent?: (spentAmount: number, reason: string) => void;
  public onAtpLeak?: (lostAmount: number) => void;
  public onMitosisAvailable?: () => void;

  private statsListeners: Array<(stats: CellStats) => void> = [];
  private atpLeakListeners: Array<(lost: number) => void> = [];

  public addStatsListener(fn: (stats: CellStats) => void): void {
    this.statsListeners.push(fn);
  }

  public addAtpLeakListener(fn: (lost: number) => void): void {
    this.atpLeakListeners.push(fn);
  }

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

    if (this.onAtpCollected && added > 0) {
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
   * Gasta ATP para acciones activas (Sprint de caza, etc.)
   */
  public spendAtp(amount: number, reason = 'Sprint'): boolean {
    if (this.atp < amount) return false;
    this.atp -= amount;
    this.mitosisNotified = false;
    if (this.onAtpSpent) {
      this.onAtpSpent(amount, reason);
    }
    this.notifyStats();
    return true;
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
        for (const fn of this.atpLeakListeners) {
          fn(leak);
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
    const stats = this.getStats();
    if (this.onStatsChanged) {
      this.onStatsChanged(stats);
    }
    for (const fn of this.statsListeners) {
      fn(stats);
    }
  }
}
