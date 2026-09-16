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
  public membraneRegenRate = 0.0; // Puntos de vida por segundo (reparación pasiva continua)

  public osmoticPressure = 50;
  public maxOsmoticPressure = 50;
  public osmoticRegenRate = 4.0; // Puntos por segundo

  public atp = 25;
  public atpCapacity = 80;

  // 2. Upgrades Celulares estilo Starblast.io (8 bio-mejoras / 5 niveles máximos)
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
    membraneHardening: {
      id: 'membraneHardening',
      name: 'Refuerzo de Membrana',
      level: 0,
      maxLevel: 5,
      baseCost: 20,
      costMultiplier: 1.5,
      description: '+25 HP Máximo e Inmediata Recuperación',
    },
    cellularRegen: {
      id: 'cellularRegen',
      name: 'Regeneración Tisular',
      level: 0,
      maxLevel: 5,
      baseCost: 22,
      costMultiplier: 1.5,
      description: '+1.5 HP/s de Reparación Pasiva Continua',
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
    vacuoleCapacity: {
      id: 'vacuoleCapacity',
      name: 'Capacidad de Vacuola',
      level: 0,
      maxLevel: 5,
      baseCost: 25,
      costMultiplier: 1.7,
      description: '+45 Capacidad de Almacenamiento de ATP',
    },
  };

  // Eventos y callbacks (compatibilidad directa y soporte multilisterner)
  public onStatsChanged?: (stats: CellStats) => void;
  public onAtpCollected?: (amount: number, total: number) => void;
  public onAtpSpent?: (spentAmount: number, reason: string) => void;
  public onAtpLeak?: (lostAmount: number) => void;
  public onMitosisAvailable?: () => void;
  public onUpgradePurchased?: (upgradeId: string, upgrade: BioUpgrade) => void;
  public onDeath?: (cause: string) => void;
  public isDead = false;

  private statsListeners: Array<(stats: CellStats) => void> = [];
  private atpLeakListeners: Array<(lost: number) => void> = [];
  private upgradePurchasedListeners: Array<(upgradeId: string, upgrade: BioUpgrade) => void> = [];

  public addStatsListener(fn: (stats: CellStats) => void): void {
    this.statsListeners.push(fn);
  }

  public addAtpLeakListener(fn: (lost: number) => void): void {
    this.atpLeakListeners.push(fn);
  }

  public addUpgradePurchasedListener(fn: (upgradeId: string, upgrade: BioUpgrade) => void): void {
    this.upgradePurchasedListeners.push(fn);
  }

  private mitosisNotified = false;

  constructor() {}

  /**
   * Regeneración pasiva de turgencia osmótica y reparación continua de membrana
   */
  public update(dt: number): void {
    let statsChanged = false;

    // 1. Regeneración pasiva de Presión Osmótica (Escudo)
    if (this.osmoticPressure < this.maxOsmoticPressure) {
      this.osmoticPressure = Math.min(
        this.maxOsmoticPressure,
        this.osmoticPressure + this.osmoticRegenRate * dt
      );
      statsChanged = true;
    }

    // 2. Regeneración pasiva de Membrana Celular (Vida)
    if (this.membraneRegenRate > 0 && this.membraneIntegrity < this.maxMembraneIntegrity && !this.isDead) {
      this.membraneIntegrity = Math.min(
        this.maxMembraneIntegrity,
        this.membraneIntegrity + this.membraneRegenRate * dt
      );
      statsChanged = true;
    }

    if (statsChanged) {
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
    if (upgradeId === 'membraneHardening') {
      this.maxMembraneIntegrity += 25;
      this.membraneIntegrity = Math.min(this.maxMembraneIntegrity, this.membraneIntegrity + 25);
    } else if (upgradeId === 'cellularRegen') {
      this.membraneRegenRate += 1.5;
    } else if (upgradeId === 'turgor') {
      this.maxOsmoticPressure += 15;
      this.osmoticPressure += 15;
      this.osmoticRegenRate *= 1.25;
    } else if (upgradeId === 'vacuoleCapacity') {
      this.atpCapacity += 45;
      this.mitosisNotified = false; // Requiere llenar la nueva capacidad
    }

    if (this.onUpgradePurchased) {
      this.onUpgradePurchased(upgradeId, up);
    }
    for (const fn of this.upgradePurchasedListeners) {
      fn(upgradeId, up);
    }

    this.notifyStats();
    return true;
  }

  public isInvulnerable = false;

  /**
   * Aplica daño a la bacteria: primero consume presión osmótica (escudo),
   * luego integridad de membrana. Si el impacto es severo, produce derrame de ATP (ATPLeak).
   */
  public takeDamage(amount: number, cause = 'Daño Biológico'): void {
    if (this.isDead || this.isInvulnerable) return;

    let remaining = amount;

    // 1. Absorber con Presión Osmótica
    if (this.osmoticPressure > 0) {
      const absorbed = Math.min(this.osmoticPressure, remaining);
      this.osmoticPressure -= absorbed;
      remaining -= absorbed;
    }

    // 2. Daño a la Integridad de Membrana
    if (remaining > 0 && !this.isDead) {
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

      // LISIS CELULAR: Si la membrana llega a 0, la célula muere
      if (this.membraneIntegrity <= 0) {
        this.isDead = true;
        if (this.onDeath) {
          this.onDeath(cause);
        }
      }
    }

    this.notifyStats();
  }

  public resetForRespawn(): void {
    this.membraneIntegrity = this.maxMembraneIntegrity;
    this.osmoticPressure = this.maxOsmoticPressure;
    this.atp = 15;
    this.isDead = false;
    this.mitosisNotified = false;
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
