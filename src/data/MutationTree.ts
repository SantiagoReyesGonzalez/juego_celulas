export enum CellMorphology {
  COCCUS = 'COCCUS',
  DIPLOCOCCUS = 'DIPLOCOCCUS',
  BACILLUS = 'BACILLUS',
  STREPTOCOCCUS = 'STREPTOCOCCUS',
  VIBRIO = 'VIBRIO',
  SPIRILLUM = 'SPIRILLUM',
}

export enum SocketType {
  FRONTAL = 'FRONTAL',
  FRONTAL_LEFT = 'FRONTAL_LEFT',
  FRONTAL_RIGHT = 'FRONTAL_RIGHT',
  LATERAL_LEFT = 'LATERAL_LEFT',
  LATERAL_RIGHT = 'LATERAL_RIGHT',
  POSTERIOR = 'POSTERIOR',
  POSTERIOR_LEFT = 'POSTERIOR_LEFT',
  POSTERIOR_RIGHT = 'POSTERIOR_RIGHT',
}

export enum CellRole {
  INTERCEPTOR = 'INTERCEPTOR',
  ARMORED_TANK = 'ARMORED_TANK',
  LYTIC_PREDATOR = 'LYTIC_PREDATOR',
  METABOLIC_HARVESTER = 'METABOLIC_HARVESTER',
  APEX_TITAN = 'APEX_TITAN',
}

export interface BacteriaSpecies {
  id: string;
  name: string;
  tier: number;
  archetype: string;
  role: CellRole;
  icon: string;
  description: string;
  morphology: CellMorphology;
  mass: number;
  hp: number;
  shield: number;
  hpRegen: number;
  shieldRegen: number;
  maxSpeed: number;
  acceleration: number;
  turnRate: number;
  vacuoleCapacity: number;
  color: number;
  emissive: number;
  sockets: SocketType[];
  parentIds: string[];
}

export const SPECIES_CATALOG: Record<string, BacteriaSpecies> = {
  escherichia_coli: {
    id: 'escherichia_coli',
    name: 'Escherichia coli',
    tier: 1,
    archetype: 'Bacilo Flagelado Perítrico',
    role: CellRole.INTERCEPTOR,
    icon: '🦠',
    description: 'Bacilo entérico gramnegativo con cápsula gelatinosa verde esmeralda, corona perítrica de fimbrias y penacho de flagelos polares propulsores.',
    morphology: CellMorphology.BACILLUS,
    mass: 1.25,
    hp: 120,
    shield: 60,
    hpRegen: 2.5,
    shieldRegen: 5.0,
    maxSpeed: 16.0,
    acceleration: 30.0,
    turnRate: 3.8,
    vacuoleCapacity: 90,
    color: 0x10b981,   // Verde esmeralda orgánico fiel a la imagen de referencia
    emissive: 0x047857,
    sockets: [
      SocketType.POSTERIOR,
      SocketType.POSTERIOR_LEFT,
      SocketType.POSTERIOR_RIGHT,
    ],
    parentIds: [],
  },
  micrococcus: {
    id: 'escherichia_coli',
    name: 'Escherichia coli',
    tier: 1,
    archetype: 'Bacilo Flagelado Perítrico',
    role: CellRole.INTERCEPTOR,
    icon: '🦠',
    description: 'Bacilo entérico gramnegativo con cápsula gelatinosa verde esmeralda, corona perítrica de fimbrias y penacho de flagelos polares propulsores.',
    morphology: CellMorphology.BACILLUS,
    mass: 1.25,
    hp: 120,
    shield: 60,
    hpRegen: 2.5,
    shieldRegen: 5.0,
    maxSpeed: 16.0,
    acceleration: 30.0,
    turnRate: 3.8,
    vacuoleCapacity: 90,
    color: 0x10b981,
    emissive: 0x047857,
    sockets: [
      SocketType.POSTERIOR,
      SocketType.POSTERIOR_LEFT,
      SocketType.POSTERIOR_RIGHT,
    ],
    parentIds: [],
  },
};

export class MutationTree {
  public static getSpecies(id: string): BacteriaSpecies {
    const sp = SPECIES_CATALOG[id];
    if (!sp) {
      return SPECIES_CATALOG.escherichia_coli;
    }
    return sp;
  }
}
