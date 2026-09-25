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
  micrococcus: {
    id: 'micrococcus',
    name: 'Micrococcus Radiatus',
    tier: 1,
    archetype: 'Microorganismo Base',
    role: CellRole.INTERCEPTOR,
    icon: '⚡',
    description: 'Coco esférico de alta agilidad quimiotáctica. Gran equilibrio hidrodinámico y rápido viraje.',
    morphology: CellMorphology.COCCUS,
    mass: 1.0,
    hp: 100,
    shield: 50,
    hpRegen: 2.0,
    shieldRegen: 5.0,
    maxSpeed: 15.0,
    acceleration: 28.0,
    turnRate: 3.6,
    vacuoleCapacity: 80,
    color: 0x00ff88,
    emissive: 0x059669,
    sockets: [SocketType.POSTERIOR],
    parentIds: [],
  },
};

export class MutationTree {
  public static getSpecies(id: string): BacteriaSpecies {
    const sp = SPECIES_CATALOG[id];
    if (!sp) {
      return SPECIES_CATALOG.micrococcus;
    }
    return sp;
  }
}
