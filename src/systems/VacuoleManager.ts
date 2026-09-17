import { BacteriaSpecies } from '../data/MutationTree';

export interface BioUpgrade {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  description: string;
  benefit: string;
  statBonus: number;
}

export interface CellStats {
  membraneIntegrity: number;
  maxMembraneIntegrity: number;
  osmoticPressure: number;
  maxOsmoticPressure: number;
  atp: number;
  atpCapacity: number;
  isMitosisReady: boolean;
  currentTier?: number;
}

/**
 * Genera el catálogo completo de las 8 bio-mejoras canónicas adaptadas y balanceadas
 * específicamente para el Tier (1 al 5) de la bacteria.
 */
export function createTierUpgrades(tier: number): Record<string, BioUpgrade> {
  const t = Math.max(1, Math.min(5, tier));
  switch (t) {
    case 1:
      return {
        propulsion: {
          id: 'propulsion',
          name: 'Propulsión Flagelar Inicial',
          shortName: 'Impulso',
          icon: '🚀',
          level: 0,
          maxLevel: 5,
          baseCost: 15,
          costMultiplier: 1.45,
          description: '+15% Empuje y +10% Velocidad Punta',
          benefit: '+15% Empuje / +10% Vel. Punta',
          statBonus: 0.15,
        },
        sprintPower: {
          id: 'sprintPower',
          name: 'Impulso de Caza (Sprint)',
          shortName: 'Sprint',
          icon: '⚡',
          level: 0,
          maxLevel: 5,
          baseCost: 16,
          costMultiplier: 1.45,
          description: '+20% Fuerza de Sprint y -15% Coste de ATP',
          benefit: '+20% Sprint / -15% ATP',
          statBonus: 0.20,
        },
        membraneHardening: {
          id: 'membraneHardening',
          name: 'Refuerzo Lipídico',
          shortName: 'Vida',
          icon: '❤️',
          level: 0,
          maxLevel: 5,
          baseCost: 20,
          costMultiplier: 1.45,
          description: '+25 HP Máximo y Sanación Inmediata',
          benefit: '+25 HP y Curación Inmediata',
          statBonus: 25,
        },
        cellularRegen: {
          id: 'cellularRegen',
          name: 'Regeneración Tisular',
          shortName: 'Regen',
          icon: '🌱',
          level: 0,
          maxLevel: 5,
          baseCost: 22,
          costMultiplier: 1.45,
          description: '+1.5 HP/s de Reparación Tisular Continua',
          benefit: '+1.5 HP/s Reparación Tisular',
          statBonus: 1.5,
        },
        turgor: {
          id: 'turgor',
          name: 'Turgencia Osmótica',
          shortName: 'Escudo',
          icon: '🛡️',
          level: 0,
          maxLevel: 5,
          baseCost: 22,
          costMultiplier: 1.45,
          description: '+15 Presión Osmótica y +25% Regeneración',
          benefit: '+15 Escudo y Recarga Rápida',
          statBonus: 15,
        },
        digestiveEfficiency: {
          id: 'digestiveEfficiency',
          name: 'Eficiencia Enzimática',
          shortName: 'Digestión',
          icon: '🧬',
          level: 0,
          maxLevel: 5,
          baseCost: 18,
          costMultiplier: 1.45,
          description: '+25% Curación y Salud por Engullimiento',
          benefit: '+25% Curación al Absorber',
          statBonus: 0.25,
        },
        chemotaxis: {
          id: 'chemotaxis',
          name: 'Receptores de Membrana',
          shortName: 'Imán ATP',
          icon: '🧲',
          level: 0,
          maxLevel: 5,
          baseCost: 14,
          costMultiplier: 1.40,
          description: '+20% ATP Obtenido por Alimento Absorbido',
          benefit: '+20% ATP por Nutriente',
          statBonus: 0.20,
        },
        vacuoleCapacity: {
          id: 'vacuoleCapacity',
          name: 'Capacidad de Vacuola',
          shortName: 'Vacuola',
          icon: '🔋',
          level: 0,
          maxLevel: 5,
          baseCost: 25,
          costMultiplier: 1.50,
          description: '+45 Capacidad de Almacenamiento de ATP',
          benefit: '+45 Capacidad de Vacuola',
          statBonus: 45,
        },
      };

    case 2:
      return {
        propulsion: {
          id: 'propulsion',
          name: 'Doble Flagelo Coordinado',
          shortName: 'Doble Motor',
          icon: '🚀',
          level: 0,
          maxLevel: 5,
          baseCost: 28,
          costMultiplier: 1.45,
          description: '+18% Empuje y +12% Velocidad Punta',
          benefit: '+18% Empuje / +12% Vel. Punta',
          statBonus: 0.18,
        },
        sprintPower: {
          id: 'sprintPower',
          name: 'Sprint Hidrodinámico Fibrilar',
          shortName: 'Super Sprint',
          icon: '⚡',
          level: 0,
          maxLevel: 5,
          baseCost: 30,
          costMultiplier: 1.45,
          description: '+25% Aceleración y -18% Coste de ATP',
          benefit: '+25% Sprint / -18% ATP',
          statBonus: 0.25,
        },
        membraneHardening: {
          id: 'membraneHardening',
          name: 'Peptidoglicano Reforzado',
          shortName: 'Membrana +',
          icon: '❤️',
          level: 0,
          maxLevel: 5,
          baseCost: 35,
          costMultiplier: 1.45,
          description: '+50 HP Máximo y Sanación Inmediata',
          benefit: '+50 HP y Curación Inmediata',
          statBonus: 50,
        },
        cellularRegen: {
          id: 'cellularRegen',
          name: 'Biosíntesis Reparadora',
          shortName: 'Bio-Sanación',
          icon: '🌱',
          level: 0,
          maxLevel: 5,
          baseCost: 38,
          costMultiplier: 1.45,
          description: '+2.8 HP/s de Reparación Tisular Continua',
          benefit: '+2.8 HP/s Reparación Tisular',
          statBonus: 2.8,
        },
        turgor: {
          id: 'turgor',
          name: 'Presión Osmótica Estabilizada',
          shortName: 'Muro Osmótico',
          icon: '🛡️',
          level: 0,
          maxLevel: 5,
          baseCost: 36,
          costMultiplier: 1.45,
          description: '+30 Presión Osmótica y +30% Regeneración',
          benefit: '+30 Escudo y Muro Osmótico',
          statBonus: 30,
        },
        digestiveEfficiency: {
          id: 'digestiveEfficiency',
          name: 'Lisosomas Digestivos Activos',
          shortName: 'Lisis Digestiva',
          icon: '🧬',
          level: 0,
          maxLevel: 5,
          baseCost: 32,
          costMultiplier: 1.45,
          description: '+30% Curación y Salud por Engullimiento',
          benefit: '+30% Curación al Absorber',
          statBonus: 0.30,
        },
        chemotaxis: {
          id: 'chemotaxis',
          name: 'Canales Quimiorreceptores',
          shortName: 'Sensor ATP',
          icon: '🧲',
          level: 0,
          maxLevel: 5,
          baseCost: 26,
          costMultiplier: 1.40,
          description: '+25% ATP Obtenido por Alimento Absorbido',
          benefit: '+25% ATP por Nutriente',
          statBonus: 0.25,
        },
        vacuoleCapacity: {
          id: 'vacuoleCapacity',
          name: 'Vacuola Expandida de Reserva',
          shortName: 'Macro Vacuola',
          icon: '🔋',
          level: 0,
          maxLevel: 5,
          baseCost: 45,
          costMultiplier: 1.50,
          description: '+80 Capacidad de Almacenamiento de ATP',
          benefit: '+80 Capacidad de Vacuola',
          statBonus: 80,
        },
      };

    case 3:
      return {
        propulsion: {
          id: 'propulsion',
          name: 'Haces Flagelares Coordinados',
          shortName: 'Haces Ciliares',
          icon: '🚀',
          level: 0,
          maxLevel: 5,
          baseCost: 55,
          costMultiplier: 1.45,
          description: '+20% Empuje y +15% Velocidad Punta',
          benefit: '+20% Empuje / +15% Vel. Punta',
          statBonus: 0.20,
        },
        sprintPower: {
          id: 'sprintPower',
          name: 'Sobrecarga de Actina Hidrodinámica',
          shortName: 'Turbo Caza',
          icon: '⚡',
          level: 0,
          maxLevel: 5,
          baseCost: 60,
          costMultiplier: 1.45,
          description: '+30% Aceleración y -20% Coste de ATP',
          benefit: '+30% Sprint / -20% ATP',
          statBonus: 0.30,
        },
        membraneHardening: {
          id: 'membraneHardening',
          name: 'Pared de Queratina Microbiana',
          shortName: 'Pared Blindada',
          icon: '❤️',
          level: 0,
          maxLevel: 5,
          baseCost: 68,
          costMultiplier: 1.45,
          description: '+90 HP Máximo y Sanación Inmediata',
          benefit: '+90 HP y Curación Inmediata',
          statBonus: 90,
        },
        cellularRegen: {
          id: 'cellularRegen',
          name: 'Mitosis Tisular de Emergencia',
          shortName: 'Auto-Cura',
          icon: '🌱',
          level: 0,
          maxLevel: 5,
          baseCost: 72,
          costMultiplier: 1.45,
          description: '+5.0 HP/s de Reparación Tisular Continua',
          benefit: '+5.0 HP/s Reparación Tisular',
          statBonus: 5.0,
        },
        turgor: {
          id: 'turgor',
          name: 'Barrera Osmótica Hipertónica',
          shortName: 'Domo Protector',
          icon: '🛡️',
          level: 0,
          maxLevel: 5,
          baseCost: 70,
          costMultiplier: 1.45,
          description: '+60 Presión Osmótica y +35% Regeneración',
          benefit: '+60 Escudo y Domo Protector',
          statBonus: 60,
        },
        digestiveEfficiency: {
          id: 'digestiveEfficiency',
          name: 'Complejos Enzimáticos de Asalto',
          shortName: 'Asimilación +',
          icon: '🧬',
          level: 0,
          maxLevel: 5,
          baseCost: 65,
          costMultiplier: 1.45,
          description: '+35% Curación y Salud por Engullimiento',
          benefit: '+35% Curación al Absorber',
          statBonus: 0.35,
        },
        chemotaxis: {
          id: 'chemotaxis',
          name: 'Gradiente Polar Quimiotáctico',
          shortName: 'Vórtice ATP',
          icon: '🧲',
          level: 0,
          maxLevel: 5,
          baseCost: 52,
          costMultiplier: 1.40,
          description: '+30% ATP Obtenido por Alimento Absorbido',
          benefit: '+30% ATP por Nutriente',
          statBonus: 0.30,
        },
        vacuoleCapacity: {
          id: 'vacuoleCapacity',
          name: 'Cámara Vacuolar Multilobular',
          shortName: 'Cámara ATP',
          icon: '🔋',
          level: 0,
          maxLevel: 5,
          baseCost: 85,
          costMultiplier: 1.50,
          description: '+150 Capacidad de Almacenamiento de ATP',
          benefit: '+150 Capacidad de Vacuola',
          statBonus: 150,
        },
      };

    case 4:
      return {
        propulsion: {
          id: 'propulsion',
          name: 'Propulsión Axial de Alta Frecuencia',
          shortName: 'Motor Cuántico',
          icon: '🚀',
          level: 0,
          maxLevel: 5,
          baseCost: 100,
          costMultiplier: 1.45,
          description: '+24% Empuje y +18% Velocidad Punta',
          benefit: '+24% Empuje / +18% Vel. Punta',
          statBonus: 0.24,
        },
        sprintPower: {
          id: 'sprintPower',
          name: 'Impulso de Ruptura Tisular',
          shortName: 'Turbo Ruptura',
          icon: '⚡',
          level: 0,
          maxLevel: 5,
          baseCost: 110,
          costMultiplier: 1.45,
          description: '+35% Aceleración y -22% Coste de ATP',
          benefit: '+35% Sprint / -22% ATP',
          statBonus: 0.35,
        },
        membraneHardening: {
          id: 'membraneHardening',
          name: 'Matriz Membranal Cristalizada',
          shortName: 'Exo-Blindaje',
          icon: '❤️',
          level: 0,
          maxLevel: 5,
          baseCost: 125,
          costMultiplier: 1.45,
          description: '+160 HP Máximo y Sanación Inmediata',
          benefit: '+160 HP y Curación Inmediata',
          statBonus: 160,
        },
        cellularRegen: {
          id: 'cellularRegen',
          name: 'Ciclo Metabólico Ultra-Rápido',
          shortName: 'Regen Élite',
          icon: '🌱',
          level: 0,
          maxLevel: 5,
          baseCost: 130,
          costMultiplier: 1.45,
          description: '+8.5 HP/s de Reparación Tisular Continua',
          benefit: '+8.5 HP/s Reparación Tisular',
          statBonus: 8.5,
        },
        turgor: {
          id: 'turgor',
          name: 'Campo Osmótico Repulsor',
          shortName: 'Campo Fuerza',
          icon: '🛡️',
          level: 0,
          maxLevel: 5,
          baseCost: 125,
          costMultiplier: 1.45,
          description: '+110 Presión Osmótica y +40% Regeneración',
          benefit: '+110 Escudo y Campo de Fuerza',
          statBonus: 110,
        },
        digestiveEfficiency: {
          id: 'digestiveEfficiency',
          name: 'Vesículas Líticas Catabólicas',
          shortName: 'Digestión Lítica',
          icon: '🧬',
          level: 0,
          maxLevel: 5,
          baseCost: 115,
          costMultiplier: 1.45,
          description: '+40% Curación y Salud por Engullimiento',
          benefit: '+40% Curación al Absorber',
          statBonus: 0.40,
        },
        chemotaxis: {
          id: 'chemotaxis',
          name: 'Atracción Electrostática de ATP',
          shortName: 'Mega-Imán',
          icon: '🧲',
          level: 0,
          maxLevel: 5,
          baseCost: 95,
          costMultiplier: 1.40,
          description: '+35% ATP Obtenido por Alimento Absorbido',
          benefit: '+35% ATP por Nutriente',
          statBonus: 0.35,
        },
        vacuoleCapacity: {
          id: 'vacuoleCapacity',
          name: 'Condensador Energético Celular',
          shortName: 'Núcleo ATP',
          icon: '🔋',
          level: 0,
          maxLevel: 5,
          baseCost: 150,
          costMultiplier: 1.50,
          description: '+280 Capacidad de Almacenamiento de ATP',
          benefit: '+280 Capacidad de Vacuola',
          statBonus: 280,
        },
      };

    case 5:
    default:
      return {
        propulsion: {
          id: 'propulsion',
          name: 'Flujo Citoplasmático Titánico',
          shortName: 'Empuje Titán',
          icon: '👑',
          level: 0,
          maxLevel: 5,
          baseCost: 200,
          costMultiplier: 1.50,
          description: '+30% Empuje y +22% Velocidad Punta',
          benefit: '+30% Empuje / +22% Vel. Punta',
          statBonus: 0.30,
        },
        sprintPower: {
          id: 'sprintPower',
          name: 'Colisión Cinética Devastadora',
          shortName: 'Choque Colosal',
          icon: '👑',
          level: 0,
          maxLevel: 5,
          baseCost: 220,
          costMultiplier: 1.50,
          description: '+40% Aceleración y -25% Coste de ATP',
          benefit: '+40% Sprint / -25% ATP',
          statBonus: 0.40,
        },
        membraneHardening: {
          id: 'membraneHardening',
          name: 'Blindaje de Péptidos Titánico',
          shortName: 'Membrana Titán',
          icon: '👑',
          level: 0,
          maxLevel: 5,
          baseCost: 250,
          costMultiplier: 1.50,
          description: '+300 HP Máximo y Sanación Inmediata',
          benefit: '+300 HP y Curación Inmediata',
          statBonus: 300,
        },
        cellularRegen: {
          id: 'cellularRegen',
          name: 'Autorreparación Celular Inmortal',
          shortName: 'Sanación Inmortal',
          icon: '👑',
          level: 0,
          maxLevel: 5,
          baseCost: 260,
          costMultiplier: 1.50,
          description: '+15.0 HP/s de Reparación Tisular Continua',
          benefit: '+15.0 HP/s Reparación Tisular',
          statBonus: 15.0,
        },
        turgor: {
          id: 'turgor',
          name: 'Fortaleza Osmótica Monumental',
          shortName: 'Bastión Titán',
          icon: '👑',
          level: 0,
          maxLevel: 5,
          baseCost: 250,
          costMultiplier: 1.50,
          description: '+200 Presión Osmótica y +50% Regeneración',
          benefit: '+200 Escudo y Bastión Titán',
          statBonus: 200,
        },
        digestiveEfficiency: {
          id: 'digestiveEfficiency',
          name: 'Desintegración Molecular Total',
          shortName: 'Macro-Lisis',
          icon: '👑',
          level: 0,
          maxLevel: 5,
          baseCost: 230,
          costMultiplier: 1.50,
          description: '+50% Curación y Salud por Engullimiento',
          benefit: '+50% Curación al Absorber',
          statBonus: 0.50,
        },
        chemotaxis: {
          id: 'chemotaxis',
          name: 'Resonancia Bio-Magnética de Caza',
          shortName: 'Atracción Titán',
          icon: '👑',
          level: 0,
          maxLevel: 5,
          baseCost: 190,
          costMultiplier: 1.45,
          description: '+45% ATP Obtenido por Alimento Absorbido',
          benefit: '+45% ATP por Nutriente',
          statBonus: 0.45,
        },
        vacuoleCapacity: {
          id: 'vacuoleCapacity',
          name: 'Vacuola Colosal Infinita',
          shortName: 'Reserva Titán',
          icon: '👑',
          level: 0,
          maxLevel: 5,
          baseCost: 300,
          costMultiplier: 1.50,
          description: '+500 Capacidad de Almacenamiento de ATP',
          benefit: '+500 Capacidad de Vacuola',
          statBonus: 500,
        },
      };
  }
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
  public currentTier = 1;

  // 2. Upgrades Celulares estilo Starblast.io (8 bio-mejoras / 5 niveles máximos)
  public upgrades: Record<string, BioUpgrade> = createTierUpgrades(1);

  // Eventos y callbacks (compatibilidad directa y soporte multilisterner)
  public onStatsChanged?: (stats: CellStats) => void;
  public onAtpCollected?: (amount: number, total: number) => void;
  public onAtpSpent?: (spentAmount: number, reason: string) => void;
  public onAtpLeak?: (lostAmount: number) => void;
  public onMitosisAvailable?: () => void;
  public onUpgradePurchased?: (upgradeId: string, upgrade: BioUpgrade) => void;
  public onUpgradesReset?: () => void;
  public onDeath?: (cause: string) => void;
  public isDead = false;

  private statsListeners: Array<(stats: CellStats) => void> = [];
  private atpLeakListeners: Array<(lost: number) => void> = [];
  private upgradePurchasedListeners: Array<(upgradeId: string, upgrade: BioUpgrade) => void> = [];
  private upgradesResetListeners: Array<() => void> = [];

  public addStatsListener(fn: (stats: CellStats) => void): void {
    this.statsListeners.push(fn);
  }

  public addAtpLeakListener(fn: (lost: number) => void): void {
    this.atpLeakListeners.push(fn);
  }

  public addUpgradePurchasedListener(fn: (upgradeId: string, upgrade: BioUpgrade) => void): void {
    this.upgradePurchasedListeners.push(fn);
  }

  public addUpgradesResetListener(fn: () => void): void {
    this.upgradesResetListeners.push(fn);
  }

  private mitosisNotified = false;

  constructor(initialTier = 1) {
    this.currentTier = initialTier;
    this.upgrades = createTierUpgrades(initialTier);
  }

  public get currentHp(): number {
    return this.membraneIntegrity;
  }

  public get maxHp(): number {
    return this.maxMembraneIntegrity;
  }

  /**
   * Reinicia a nivel 0 y genera un catálogo de bio-mejoras totalmente nuevo adaptado
   * a la taxonomía y nivel/Tier de la bacteria recién evolucionada.
   */
  public resetAndGenerateUpgrades(species: BacteriaSpecies): void {
    this.currentTier = species.tier || 1;
    this.upgrades = createTierUpgrades(this.currentTier);

    // Actualizar estadísticas base canónicas directas de la especie objetivo
    this.maxMembraneIntegrity = species.hp;
    this.membraneIntegrity = species.hp;
    this.membraneRegenRate = species.hpRegen || 0.0;

    this.maxOsmoticPressure = species.shield;
    this.osmoticPressure = species.shield;
    this.osmoticRegenRate = species.shieldRegen || 4.0;

    this.atpCapacity = species.vacuoleCapacity;
    this.atp = 0; // El ATP se consume en la mitosis celular
    this.mitosisNotified = false;
    this.isDead = false;

    // Notificar a los oyentes (HUD, UI, etc.) para regenerar el dock de cartas
    if (this.onUpgradesReset) {
      this.onUpgradesReset();
    }
    for (const fn of this.upgradesResetListeners) {
      fn();
    }

    this.notifyStats();
  }

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

    // Aplicar efectos inmediatos en estadísticas base escalados según el Tier de la bacteria
    if (upgradeId === 'membraneHardening') {
      const bonus = up.statBonus || 25;
      this.maxMembraneIntegrity += bonus;
      this.membraneIntegrity = Math.min(this.maxMembraneIntegrity, this.membraneIntegrity + bonus);
    } else if (upgradeId === 'cellularRegen') {
      const bonus = up.statBonus || 1.5;
      this.membraneRegenRate += bonus;
    } else if (upgradeId === 'turgor') {
      const bonus = up.statBonus || 15;
      this.maxOsmoticPressure += bonus;
      this.osmoticPressure += bonus;
      this.osmoticRegenRate *= 1.25;
    } else if (upgradeId === 'vacuoleCapacity') {
      const bonus = up.statBonus || 45;
      this.atpCapacity += bonus;
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

  /**
   * Recarga directamente la presión osmótica (escudo) al consumir minerales o cristales de calcio
   */
  public rechargeShield(amount: number): number {
    if (this.isDead) return 0;
    const missing = this.maxOsmoticPressure - this.osmoticPressure;
    const added = Math.min(amount, Math.max(0, missing));
    this.osmoticPressure += added;
    if (added > 0) {
      this.notifyStats();
    }
    return added;
  }

  /**
   * Cura directamente la integridad de membrana celular al consumir péptidos o nutrientes reparadores
   */
  public healMembrane(amount: number): number {
    if (this.isDead) return 0;
    const missing = this.maxMembraneIntegrity - this.membraneIntegrity;
    const added = Math.min(amount, Math.max(0, missing));
    this.membraneIntegrity += added;
    if (added > 0) {
      this.notifyStats();
    }
    return added;
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
      currentTier: this.currentTier,
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
