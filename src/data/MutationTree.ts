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

export interface BacteriaSpecies {
  id: string;
  name: string;
  tier: number;
  archetype: string;
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
  // ================= TIER 1 =================
  micrococcus: {
    id: 'micrococcus',
    name: 'Micrococcus',
    tier: 1,
    archetype: 'Generalista Inicial',
    description: 'Coco primitivo esférico con gran agilidad y equilibrio físico en fluidos de baja viscosidad.',
    morphology: CellMorphology.COCCUS,
    mass: 1.0,
    hp: 100,
    shield: 50,
    hpRegen: 2.0,
    shieldRegen: 5.0,
    maxSpeed: 14.0,
    acceleration: 25.0,
    turnRate: 3.5,
    vacuoleCapacity: 80,
    color: 0x00ff88,
    emissive: 0x059669,
    sockets: [SocketType.POSTERIOR],
    parentIds: [],
  },

  // ================= TIER 2 =================
  diplococcus: {
    id: 'diplococcus',
    name: 'Diplococcus',
    tier: 2,
    archetype: 'Estructura Dual',
    description: 'Estructura esférica gemela con doble flagelo posterior para propulsión simétrica en fluidos tisulares.',
    morphology: CellMorphology.DIPLOCOCCUS,
    mass: 1.8,
    hp: 180,
    shield: 80,
    hpRegen: 3.0,
    shieldRegen: 7.0,
    maxSpeed: 12.0,
    acceleration: 20.0,
    turnRate: 2.8,
    vacuoleCapacity: 160,
    color: 0x06b6d4,
    emissive: 0x0891b2,
    sockets: [SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['micrococcus'],
  },

  bacillus_primitive: {
    id: 'bacillus_primitive',
    name: 'Bacilo Primitivo',
    tier: 2,
    archetype: 'Interceptor Veloz',
    description: 'Chasis alargado en cápsula con doble flagelo posterior. Mayor penetración hidrodinámica frontal y empuje superior.',
    morphology: CellMorphology.BACILLUS,
    mass: 1.4,
    hp: 150,
    shield: 60,
    hpRegen: 2.5,
    shieldRegen: 6.0,
    maxSpeed: 16.5,
    acceleration: 30.0,
    turnRate: 2.2,
    vacuoleCapacity: 160,
    color: 0x10b981,
    emissive: 0x047857,
    sockets: [SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['micrococcus'],
  },

  // ================= TIER 3 =================
  streptococcus: {
    id: 'streptococcus',
    name: 'Estreptococo',
    tier: 3,
    archetype: 'Fortaleza en Cadena',
    description: 'Cadena de cocos con enorme resistencia de membrana y múltiples sockets laterales de toxina.',
    morphology: CellMorphology.STREPTOCOCCUS,
    mass: 2.6,
    hp: 300,
    shield: 140,
    hpRegen: 5.0,
    shieldRegen: 10.0,
    maxSpeed: 10.0,
    acceleration: 16.0,
    turnRate: 2.0,
    vacuoleCapacity: 280,
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    sockets: [
      SocketType.FRONTAL_LEFT,
      SocketType.FRONTAL_RIGHT,
      SocketType.LATERAL_LEFT,
      SocketType.LATERAL_RIGHT,
      SocketType.POSTERIOR,
    ],
    parentIds: ['diplococcus'],
  },

  vibrio: {
    id: 'vibrio',
    name: 'Vibrio',
    tier: 3,
    archetype: 'Hostigador Curvo',
    description: 'Cuerpo curvo en forma de coma con flagelo polar hiperacelerado. Excelente maniobra y quimiotaxis.',
    morphology: CellMorphology.VIBRIO,
    mass: 2.0,
    hp: 240,
    shield: 100,
    hpRegen: 4.0,
    shieldRegen: 9.0,
    maxSpeed: 15.0,
    acceleration: 28.0,
    turnRate: 3.2,
    vacuoleCapacity: 280,
    color: 0xa855f7,
    emissive: 0x7e22ce,
    sockets: [SocketType.FRONTAL, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['diplococcus', 'bacillus_primitive'],
  },

  spirillum_minor: {
    id: 'spirillum_minor',
    name: 'Espirilo Menor',
    tier: 3,
    archetype: 'Perforador Rápido',
    description: 'Morfología helicoidal en sacacorchos. Atraviesa corrientes tisulares con mínima resistencia hidrodinámica.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 2.2,
    hp: 220,
    shield: 90,
    hpRegen: 3.5,
    shieldRegen: 8.5,
    maxSpeed: 17.5,
    acceleration: 32.0,
    turnRate: 3.8,
    vacuoleCapacity: 280,
    color: 0xf59e0b,
    emissive: 0xb45309,
    sockets: [SocketType.FRONTAL, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['bacillus_primitive'],
  },

  // ================= TIER 4 =================
  staphylococcus: {
    id: 'staphylococcus',
    name: 'Staphylococcus',
    tier: 4,
    archetype: 'Racimo Blindado',
    description: 'Conglomerado de cocos en racimo con coraza de peptidoglicano denso. Resistencia brutal a impactos.',
    morphology: CellMorphology.COCCUS,
    mass: 3.8,
    hp: 480,
    shield: 220,
    hpRegen: 7.0,
    shieldRegen: 14.0,
    maxSpeed: 9.0,
    acceleration: 14.0,
    turnRate: 1.8,
    vacuoleCapacity: 450,
    color: 0x6366f1,
    emissive: 0x4338ca,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['streptococcus'],
  },

  bacillus_anthracis: {
    id: 'bacillus_anthracis',
    name: 'Bacillus Anthracis',
    tier: 4,
    archetype: 'Acorazado de Choque',
    description: 'Bacilo gigante con cápsula de poli-D-ácido glutámico. Alta velocidad terminal y gran masa de embestida.',
    morphology: CellMorphology.BACILLUS,
    mass: 3.2,
    hp: 420,
    shield: 180,
    hpRegen: 6.0,
    shieldRegen: 12.0,
    maxSpeed: 15.5,
    acceleration: 24.0,
    turnRate: 2.0,
    vacuoleCapacity: 450,
    color: 0x14b8a6,
    emissive: 0x0f766e,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['vibrio', 'spirillum_minor'],
  },

  helicobacter: {
    id: 'helicobacter',
    name: 'Helicobacter',
    tier: 4,
    archetype: 'Perforador Ácido',
    description: 'Cuerpo en espiral con penacho de múltiples flagelos monopolares. Ráfagas de toxina ácida corrosiva.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 3.0,
    hp: 380,
    shield: 160,
    hpRegen: 5.5,
    shieldRegen: 11.0,
    maxSpeed: 17.0,
    acceleration: 30.0,
    turnRate: 3.4,
    vacuoleCapacity: 450,
    color: 0xec4899,
    emissive: 0xbe185d,
    sockets: [SocketType.FRONTAL, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['vibrio', 'spirillum_minor'],
  },

  // ================= TIER 5 =================
  clostridium: {
    id: 'clostridium',
    name: 'Clostridium',
    tier: 5,
    archetype: 'Coloso Neurotóxico',
    description: 'Titán anaerobio portador de la toxina más letal del reino biológico. Devasta leucocitos y tejidos densos.',
    morphology: CellMorphology.BACILLUS,
    mass: 4.8,
    hp: 650,
    shield: 300,
    hpRegen: 9.0,
    shieldRegen: 18.0,
    maxSpeed: 12.0,
    acceleration: 18.0,
    turnRate: 1.6,
    vacuoleCapacity: 700,
    color: 0x8b5cf6,
    emissive: 0x6d28d9,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['staphylococcus', 'bacillus_anthracis'],
  },

  pseudomonas: {
    id: 'pseudomonas',
    name: 'Pseudomonas',
    tier: 5,
    archetype: 'Matriz de Biopelícula',
    description: 'Chasis envuelto en alginato que produce escudos de biofilm impenetrables y proyectiles enzimáticos piociánicos.',
    morphology: CellMorphology.BACILLUS,
    mass: 4.2,
    hp: 580,
    shield: 280,
    hpRegen: 8.5,
    shieldRegen: 17.0,
    maxSpeed: 14.5,
    acceleration: 22.0,
    turnRate: 2.4,
    vacuoleCapacity: 700,
    color: 0x06b6d4,
    emissive: 0x0e7490,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['bacillus_anthracis', 'helicobacter'],
  },

  treponema: {
    id: 'treponema',
    name: 'Treponema',
    tier: 5,
    archetype: 'Endoflagelo Perforador',
    description: 'Espiroqueta con filamentos axiales internos que giran a miles de RPM. Capaz de sortear defensas tisulares.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 4.0,
    hp: 520,
    shield: 250,
    hpRegen: 8.0,
    shieldRegen: 16.0,
    maxSpeed: 18.0,
    acceleration: 32.0,
    turnRate: 3.6,
    vacuoleCapacity: 700,
    color: 0xf43f5e,
    emissive: 0xbe123c,
    sockets: [SocketType.FRONTAL, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['helicobacter'],
  },

  // ================= TIER 6 (TITANES CELULARES) =================
  deinococcus: {
    id: 'deinococcus',
    name: 'Deinococcus Radiodurans',
    tier: 6,
    archetype: 'Titán Inmortal',
    description: 'Célula ápice legendaria. Su cuádruple membrana y regeneración celular extrema la hacen casi invulnerable.',
    morphology: CellMorphology.COCCUS,
    mass: 6.5,
    hp: 1000,
    shield: 500,
    hpRegen: 15.0,
    shieldRegen: 30.0,
    maxSpeed: 11.0,
    acceleration: 16.0,
    turnRate: 2.0,
    vacuoleCapacity: 1200,
    color: 0xe11d48,
    emissive: 0x9f1239,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['clostridium'],
  },

  magnetospirillum: {
    id: 'magnetospirillum',
    name: 'Magnetospirillum Titan',
    tier: 6,
    archetype: 'Emperador Electromagnético',
    description: 'Contiene cadenas de cristales de magnetita que polarizan el medio acuático, atrayendo nutrientes de todo el mapa.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 5.5,
    hp: 850,
    shield: 420,
    hpRegen: 12.0,
    shieldRegen: 25.0,
    maxSpeed: 19.5,
    acceleration: 36.0,
    turnRate: 3.8,
    vacuoleCapacity: 1200,
    color: 0x8b5cf6,
    emissive: 0x5b21b6,
    sockets: [SocketType.FRONTAL, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['treponema'],
  },

  borrelia_colossus: {
    id: 'borrelia_colossus',
    name: 'Borrelia Colossus',
    tier: 6,
    archetype: 'Leviatán Tisular',
    description: 'Espirilo colosal de longitud extrema. Arrasa con su inmensa masa física mientras dispara andanadas químicas continuas.',
    morphology: CellMorphology.BACILLUS,
    mass: 6.0,
    hp: 920,
    shield: 450,
    hpRegen: 13.5,
    shieldRegen: 28.0,
    maxSpeed: 16.0,
    acceleration: 26.0,
    turnRate: 2.6,
    vacuoleCapacity: 1200,
    color: 0x10b981,
    emissive: 0x065f46,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['pseudomonas'],
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

  public static getAvailableEvolutions(currentSpeciesId: string): BacteriaSpecies[] {
    const list: BacteriaSpecies[] = [];
    for (const key in SPECIES_CATALOG) {
      const sp = SPECIES_CATALOG[key];
      if (sp.parentIds.includes(currentSpeciesId)) {
        list.push(sp);
      }
    }
    return list;
  }
}
