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
  INTERCEPTOR = 'INTERCEPTOR',       // ⚡ Interceptor / Caza Veloz
  ARMORED_TANK = 'ARMORED_TANK',     // 🛡️ Acorazado / Fortaleza Tisular
  LYTIC_PREDATOR = 'LYTIC_PREDATOR', // ⚔️ Depredador Lítico / Asalto
  METABOLIC_HARVESTER = 'METABOLIC_HARVESTER', // 🔋 Asimilador / Bio-Cosechador
  APEX_TITAN = 'APEX_TITAN',         // 👑 Super Macro Célula / Titán
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
  // ==========================================
  // TIER 1: 2 CÉLULAS PRIMORDIALES
  // ==========================================
  micrococcus: {
    id: 'micrococcus',
    name: 'Micrococcus Radiatus',
    tier: 1,
    archetype: 'Interceptor Inicial',
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

  bacillus_primus: {
    id: 'bacillus_primus',
    name: 'Bacillus Primus',
    tier: 1,
    archetype: 'Acorazado Inicial',
    role: CellRole.ARMORED_TANK,
    icon: '🛡️',
    description: 'Cápsula alargada con pared de peptidoglicano denso. Mayor resistencia a impactos y empuje lineal.',
    morphology: CellMorphology.BACILLUS,
    mass: 1.25,
    hp: 135,
    shield: 65,
    hpRegen: 2.5,
    shieldRegen: 6.0,
    maxSpeed: 13.0,
    acceleration: 22.0,
    turnRate: 2.8,
    vacuoleCapacity: 80,
    color: 0x38bdf8,
    emissive: 0x0284c7,
    sockets: [SocketType.POSTERIOR],
    parentIds: [],
  },

  // ==========================================
  // TIER 2: 4 CÉLULAS ESPECIALIZADAS
  // ==========================================
  diplococcus_scout: {
    id: 'diplococcus_scout',
    name: 'Diplococo Explorador',
    tier: 2,
    archetype: 'Interceptor Gemelo',
    role: CellRole.INTERCEPTOR,
    icon: '⚡',
    description: 'Célula gemela con doble flagelo sincronizado. Excelente velocidad de escape y caza de nutrientes.',
    morphology: CellMorphology.DIPLOCOCCUS,
    mass: 1.6,
    hp: 170,
    shield: 75,
    hpRegen: 3.0,
    shieldRegen: 7.0,
    maxSpeed: 16.5,
    acceleration: 30.0,
    turnRate: 3.4,
    vacuoleCapacity: 160,
    color: 0x10b981,
    emissive: 0x047857,
    sockets: [SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['micrococcus'],
  },

  streptococcus_guard: {
    id: 'streptococcus_guard',
    name: 'Estreptococo Centinela',
    tier: 2,
    archetype: 'Fortaleza en Cadena',
    role: CellRole.ARMORED_TANK,
    icon: '🛡️',
    description: 'Cadena de cocos reforzada con alta integridad de membrana. Resiste embestidas de leucocitos.',
    morphology: CellMorphology.STREPTOCOCCUS,
    mass: 2.0,
    hp: 230,
    shield: 100,
    hpRegen: 3.5,
    shieldRegen: 8.0,
    maxSpeed: 11.5,
    acceleration: 18.0,
    turnRate: 2.4,
    vacuoleCapacity: 160,
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    sockets: [SocketType.POSTERIOR],
    parentIds: ['micrococcus'],
  },

  vibrio_hunter: {
    id: 'vibrio_hunter',
    name: 'Vibrio Cazador',
    tier: 2,
    archetype: 'Depredador Curvo',
    role: CellRole.LYTIC_PREDATOR,
    icon: '⚔️',
    description: 'Cuerpo arqueado con flagelo polar hiperacelerado. Diseñado para embestidas rápidas y mordiscos líticos.',
    morphology: CellMorphology.VIBRIO,
    mass: 1.7,
    hp: 190,
    shield: 85,
    hpRegen: 3.0,
    shieldRegen: 7.5,
    maxSpeed: 15.5,
    acceleration: 27.0,
    turnRate: 3.0,
    vacuoleCapacity: 160,
    color: 0xf43f5e,
    emissive: 0xbe123c,
    sockets: [SocketType.FRONTAL, SocketType.POSTERIOR],
    parentIds: ['bacillus_primus'],
  },

  spirillum_feeder: {
    id: 'spirillum_feeder',
    name: 'Espirilo Colector',
    tier: 2,
    archetype: 'Asimilador Espiral',
    role: CellRole.METABOLIC_HARVESTER,
    icon: '🔋',
    description: 'Hélice helicoidal que atraviesa fluidos densos con mínima fricción y gran vacuola de absorción.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 1.8,
    hp: 180,
    shield: 90,
    hpRegen: 3.5,
    shieldRegen: 8.5,
    maxSpeed: 14.0,
    acceleration: 24.0,
    turnRate: 3.2,
    vacuoleCapacity: 190,
    color: 0xf59e0b,
    emissive: 0xb45309,
    sockets: [SocketType.POSTERIOR],
    parentIds: ['bacillus_primus'],
  },

  // ==========================================
  // TIER 3: 8 CÉLULAS DIVERGENTES
  // ==========================================
  vibrio_dart: {
    id: 'vibrio_dart',
    name: 'Vibrio Relámpago',
    tier: 3,
    archetype: 'Hostigador Veloz',
    role: CellRole.INTERCEPTOR,
    icon: '⚡',
    description: 'Flagelo polar sobrecargado para cambios bruscos de trayectoria y aceleraciones de vértigo.',
    morphology: CellMorphology.VIBRIO,
    mass: 2.1,
    hp: 240,
    shield: 100,
    hpRegen: 4.0,
    shieldRegen: 9.0,
    maxSpeed: 18.0,
    acceleration: 34.0,
    turnRate: 3.6,
    vacuoleCapacity: 280,
    color: 0x06b6d4,
    emissive: 0x0891b2,
    sockets: [SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['diplococcus_scout'],
  },

  spirochete_runner: {
    id: 'spirochete_runner',
    name: 'Espiroqueta Fugaz',
    tier: 3,
    archetype: 'Perforador Tisular',
    role: CellRole.INTERCEPTOR,
    icon: '⚡',
    description: 'Filamentos axiales internos que giran sobre su propio eje, atravesando corrientes intersticiales.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 2.2,
    hp: 230,
    shield: 95,
    hpRegen: 3.8,
    shieldRegen: 8.5,
    maxSpeed: 19.0,
    acceleration: 36.0,
    turnRate: 3.8,
    vacuoleCapacity: 280,
    color: 0xa855f7,
    emissive: 0x7e22ce,
    sockets: [SocketType.POSTERIOR],
    parentIds: ['diplococcus_scout'],
  },

  streptococcus_phalanx: {
    id: 'streptococcus_phalanx',
    name: 'Estreptococo Falange',
    tier: 3,
    archetype: 'Bastión en Cadena',
    role: CellRole.ARMORED_TANK,
    icon: '🛡️',
    description: 'Cadena densa de peptidoglicano reforzado. Dispersa la energía cinética de los choques frontales.',
    morphology: CellMorphology.STREPTOCOCCUS,
    mass: 3.0,
    hp: 340,
    shield: 160,
    hpRegen: 5.5,
    shieldRegen: 11.0,
    maxSpeed: 10.5,
    acceleration: 16.0,
    turnRate: 2.0,
    vacuoleCapacity: 300,
    color: 0x2563eb,
    emissive: 0x1e40af,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['streptococcus_guard'],
  },

  enterococcus_barrier: {
    id: 'enterococcus_barrier',
    name: 'Enterococo Barrera',
    tier: 3,
    archetype: 'Escudo Osmótico',
    role: CellRole.ARMORED_TANK,
    icon: '🛡️',
    description: 'Bomba osmótica celular de alta presión que regenera su escudo rápidamente tras colisionar.',
    morphology: CellMorphology.COCCUS,
    mass: 2.8,
    hp: 320,
    shield: 150,
    hpRegen: 5.0,
    shieldRegen: 12.0,
    maxSpeed: 11.5,
    acceleration: 18.0,
    turnRate: 2.2,
    vacuoleCapacity: 290,
    color: 0x0284c7,
    emissive: 0x0369a1,
    sockets: [SocketType.FRONTAL, SocketType.POSTERIOR],
    parentIds: ['streptococcus_guard'],
  },

  pseudomonas_striker: {
    id: 'pseudomonas_striker',
    name: 'Pseudomonas Asalto',
    tier: 3,
    archetype: 'Embestidor Lítico',
    role: CellRole.LYTIC_PREDATOR,
    icon: '⚔️',
    description: 'Cápsula de choque con enzimas líticas frontales que erosionan membranas biológicas con violencia.',
    morphology: CellMorphology.BACILLUS,
    mass: 2.5,
    hp: 280,
    shield: 120,
    hpRegen: 4.5,
    shieldRegen: 9.5,
    maxSpeed: 16.0,
    acceleration: 30.0,
    turnRate: 2.8,
    vacuoleCapacity: 290,
    color: 0xef4444,
    emissive: 0xb91c1c,
    sockets: [SocketType.FRONTAL, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['vibrio_hunter'],
  },

  serratia_toxin: {
    id: 'serratia_toxin',
    name: 'Serratia Tóxica',
    tier: 3,
    archetype: 'Secretor Bioquímico',
    role: CellRole.LYTIC_PREDATOR,
    icon: '⚔️',
    description: 'Produce prodigiosina lítica de contacto que debilita leucocitos y lisas presas rápidamente.',
    morphology: CellMorphology.BACILLUS,
    mass: 2.4,
    hp: 260,
    shield: 115,
    hpRegen: 4.0,
    shieldRegen: 9.0,
    maxSpeed: 15.5,
    acceleration: 28.0,
    turnRate: 3.0,
    vacuoleCapacity: 280,
    color: 0xd946ef,
    emissive: 0xa21caf,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['vibrio_hunter'],
  },

  spirillum_absorber: {
    id: 'spirillum_absorber',
    name: 'Espirilo Vórtice',
    tier: 3,
    archetype: 'Cosechador Espiral',
    role: CellRole.METABOLIC_HARVESTER,
    icon: '🔋',
    description: 'Canales membranales optimizados para la captación masiva de nutrientes y orbes energéticos.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 2.6,
    hp: 270,
    shield: 130,
    hpRegen: 4.5,
    shieldRegen: 10.0,
    maxSpeed: 14.5,
    acceleration: 24.0,
    turnRate: 3.2,
    vacuoleCapacity: 340,
    color: 0xeab308,
    emissive: 0xa16207,
    sockets: [SocketType.POSTERIOR],
    parentIds: ['spirillum_feeder'],
  },

  rhodospirillum_bio: {
    id: 'rhodospirillum_bio',
    name: 'Rodospirilo Vital',
    tier: 3,
    archetype: 'Metabolismo Acelerado',
    role: CellRole.METABOLIC_HARVESTER,
    icon: '🔋',
    description: 'Pigmentos fotosintéticos y respiratorios que regeneran biomasa y ATP de forma pasiva continua.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 2.5,
    hp: 290,
    shield: 135,
    hpRegen: 5.5,
    shieldRegen: 11.5,
    maxSpeed: 14.0,
    acceleration: 23.0,
    turnRate: 3.0,
    vacuoleCapacity: 330,
    color: 0x84cc16,
    emissive: 0x4d7c0f,
    sockets: [SocketType.POSTERIOR],
    parentIds: ['spirillum_feeder'],
  },

  // ==========================================
  // TIER 4: 10 CÉLULAS AVANZADAS
  // ==========================================
  helicobacter_swift: {
    id: 'helicobacter_swift',
    name: 'Helicobacter Flecha',
    tier: 4,
    archetype: 'Interceptor Perforador',
    role: CellRole.INTERCEPTOR,
    icon: '⚡',
    description: 'Espirilo aerodinámico con penacho flagelar polar. Alcanza velocidades supersónicas en corrientes.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 3.0,
    hp: 360,
    shield: 150,
    hpRegen: 5.0,
    shieldRegen: 11.0,
    maxSpeed: 20.0,
    acceleration: 38.0,
    turnRate: 4.0,
    vacuoleCapacity: 460,
    color: 0x06b6d4,
    emissive: 0x0891b2,
    sockets: [SocketType.FRONTAL, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['vibrio_dart'],
  },

  treponema_drill: {
    id: 'treponema_drill',
    name: 'Treponema Taladro',
    tier: 4,
    archetype: 'Triturador Axial',
    role: CellRole.INTERCEPTOR,
    icon: '⚡',
    description: 'Rotación helicoidal continua a miles de RPM que atraviesa barreras de moco y tejidos densos.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 3.2,
    hp: 380,
    shield: 160,
    hpRegen: 5.5,
    shieldRegen: 12.0,
    maxSpeed: 19.5,
    acceleration: 36.0,
    turnRate: 3.8,
    vacuoleCapacity: 480,
    color: 0xec4899,
    emissive: 0xbe185d,
    sockets: [SocketType.FRONTAL, SocketType.POSTERIOR],
    parentIds: ['vibrio_dart', 'spirochete_runner'],
  },

  bacillus_lancer: {
    id: 'bacillus_lancer',
    name: 'Bacilo Lancero',
    tier: 4,
    archetype: 'Ariete de Choque',
    role: CellRole.LYTIC_PREDATOR,
    icon: '⚔️',
    description: 'Punta de membrana endurecida para colisiones elásticas a alta velocidad. Despedaza presas al chocar.',
    morphology: CellMorphology.BACILLUS,
    mass: 3.6,
    hp: 440,
    shield: 180,
    hpRegen: 6.0,
    shieldRegen: 12.0,
    maxSpeed: 17.5,
    acceleration: 32.0,
    turnRate: 2.6,
    vacuoleCapacity: 480,
    color: 0xe11d48,
    emissive: 0x9f1239,
    sockets: [SocketType.FRONTAL, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['spirochete_runner', 'pseudomonas_striker'],
  },

  staphylococcus_gold: {
    id: 'staphylococcus_gold',
    name: 'Estafilococo Dorado',
    tier: 4,
    archetype: 'Racimo Blindado',
    role: CellRole.ARMORED_TANK,
    icon: '🛡️',
    description: 'Conglomerado celular en racimo con coraza de peptidoglicano masivo. Resiste cualquier embestida.',
    morphology: CellMorphology.COCCUS,
    mass: 4.5,
    hp: 560,
    shield: 260,
    hpRegen: 7.5,
    shieldRegen: 15.0,
    maxSpeed: 10.0,
    acceleration: 15.0,
    turnRate: 1.8,
    vacuoleCapacity: 520,
    color: 0xf59e0b,
    emissive: 0xb45309,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['streptococcus_phalanx'],
  },

  lactobacillus_wall: {
    id: 'lactobacillus_wall',
    name: 'Lactobacilo Muralla',
    tier: 4,
    archetype: 'Barrera Ácida',
    role: CellRole.ARMORED_TANK,
    icon: '🛡️',
    description: 'Pared de bio-cápsula con gradiente ácido continuo que neutraliza enzimas y amortigua impactos.',
    morphology: CellMorphology.BACILLUS,
    mass: 4.2,
    hp: 520,
    shield: 240,
    hpRegen: 7.0,
    shieldRegen: 14.0,
    maxSpeed: 11.0,
    acceleration: 17.0,
    turnRate: 2.0,
    vacuoleCapacity: 500,
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    sockets: [SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['streptococcus_phalanx', 'enterococcus_barrier'],
  },

  bifido_sponge: {
    id: 'bifido_sponge',
    name: 'Bifidobacteria Reserva',
    tier: 4,
    archetype: 'Acumulador Metabólico',
    role: CellRole.METABOLIC_HARVESTER,
    icon: '🔋',
    description: 'Ramificación celular simbiótica con reservorios dobles de ATP y gran resistencia osmótica.',
    morphology: CellMorphology.BACILLUS,
    mass: 3.8,
    hp: 480,
    shield: 220,
    hpRegen: 7.0,
    shieldRegen: 15.0,
    maxSpeed: 13.0,
    acceleration: 20.0,
    turnRate: 2.4,
    vacuoleCapacity: 560,
    color: 0x10b981,
    emissive: 0x059669,
    sockets: [SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['enterococcus_barrier', 'rhodospirillum_bio'],
  },

  clostridium_ruptor: {
    id: 'clostridium_ruptor',
    name: 'Clostridium Lítico',
    tier: 4,
    archetype: 'Devastador Enzimático',
    role: CellRole.LYTIC_PREDATOR,
    icon: '⚔️',
    description: 'Bacilo anaerobio con secreción lítica de contacto masiva. Quiebra adipocitos y leucocitos con facilidad.',
    morphology: CellMorphology.BACILLUS,
    mass: 4.0,
    hp: 460,
    shield: 200,
    hpRegen: 6.5,
    shieldRegen: 13.0,
    maxSpeed: 16.0,
    acceleration: 28.0,
    turnRate: 2.5,
    vacuoleCapacity: 500,
    color: 0x7c3aed,
    emissive: 0x5b21b6,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['pseudomonas_striker', 'serratia_toxin'],
  },

  xanthomonas_acid: {
    id: 'xanthomonas_acid',
    name: 'Xanthomonas Corrosiva',
    tier: 4,
    archetype: 'Secretor de Biocidas',
    role: CellRole.LYTIC_PREDATOR,
    icon: '⚔️',
    description: 'Envoltura de xantano corrosiva que erosiona la membrana de cualquier célula que entre en contacto.',
    morphology: CellMorphology.BACILLUS,
    mass: 3.5,
    hp: 420,
    shield: 190,
    hpRegen: 6.0,
    shieldRegen: 12.0,
    maxSpeed: 16.5,
    acceleration: 30.0,
    turnRate: 2.8,
    vacuoleCapacity: 480,
    color: 0xf43f5e,
    emissive: 0xbe123c,
    sockets: [SocketType.FRONTAL, SocketType.POSTERIOR],
    parentIds: ['serratia_toxin'],
  },

  magneto_core: {
    id: 'magneto_core',
    name: 'Magnetospirilo Núcleo',
    tier: 4,
    archetype: 'Atracción Polar',
    role: CellRole.METABOLIC_HARVESTER,
    icon: '🔋',
    description: 'Cadenas internas de magnetita polarizada que atraen quimiotaxis y duplican la captación de energía.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 3.7,
    hp: 450,
    shield: 210,
    hpRegen: 6.5,
    shieldRegen: 14.0,
    maxSpeed: 15.0,
    acceleration: 26.0,
    turnRate: 3.2,
    vacuoleCapacity: 580,
    color: 0x6366f1,
    emissive: 0x4338ca,
    sockets: [SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['spirillum_absorber'],
  },

  nostoc_filament: {
    id: 'nostoc_filament',
    name: 'Nostoc Multicelular',
    tier: 4,
    archetype: 'Colonia Filamentosa',
    role: CellRole.METABOLIC_HARVESTER,
    icon: '🔋',
    description: 'Filamento multicelular fotosintético con células de reserva heterocísticas y enorme vacuola de ATP.',
    morphology: CellMorphology.STREPTOCOCCUS,
    mass: 4.0,
    hp: 500,
    shield: 230,
    hpRegen: 7.5,
    shieldRegen: 16.0,
    maxSpeed: 12.5,
    acceleration: 19.0,
    turnRate: 2.2,
    vacuoleCapacity: 600,
    color: 0x14b8a6,
    emissive: 0x0f766e,
    sockets: [SocketType.FRONTAL, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['spirillum_absorber', 'rhodospirillum_bio'],
  },

  // ==========================================
  // TIER 5: 5 SUPER MACRO CÉLULAS TITÁNICAS
  // ==========================================
  titan_apex_hunter: {
    id: 'titan_apex_hunter',
    name: '👑 Leviatán Quimiotáctico Apex',
    tier: 5,
    archetype: 'Super Macro Interceptor',
    role: CellRole.APEX_TITAN,
    icon: '👑',
    description: 'Titán hiper-sónico colosal con penachos flagelares múltiples. Atraviesa el tejido a velocidades de vértigo arrasando enjambres celulares al instante.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 5.2,
    hp: 920,
    shield: 420,
    hpRegen: 12.0,
    shieldRegen: 25.0,
    maxSpeed: 23.0,
    acceleration: 42.0,
    turnRate: 4.2,
    vacuoleCapacity: 1000,
    color: 0x06b6d4,
    emissive: 0x0891b2,
    sockets: [SocketType.FRONTAL, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['helicobacter_swift', 'treponema_drill'],
  },

  titan_deinococcus_invictus: {
    id: 'titan_deinococcus_invictus',
    name: '👑 Deinococcus Invictus Titán',
    tier: 5,
    archetype: 'Super Macro Fortaleza Inmortal',
    role: CellRole.APEX_TITAN,
    icon: '👑',
    description: 'Cuádruple membrana de peptidoglicano pesado y cápsula de turgencia colosal. Virtualmente inmune a colisiones mecánicas.',
    morphology: CellMorphology.COCCUS,
    mass: 7.8,
    hp: 1500,
    shield: 650,
    hpRegen: 18.0,
    shieldRegen: 35.0,
    maxSpeed: 11.5,
    acceleration: 16.0,
    turnRate: 1.8,
    vacuoleCapacity: 1000,
    color: 0xe11d48,
    emissive: 0x9f1239,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['staphylococcus_gold', 'lactobacillus_wall'],
  },

  titan_bacillus_colossus: {
    id: 'titan_bacillus_colossus',
    name: '👑 Coloso de Choque Anthracis',
    tier: 5,
    archetype: 'Super Macro Ariete Cinético',
    role: CellRole.APEX_TITAN,
    icon: '👑',
    description: 'Cápsula gigante de inercia extrema. Cada sprint de embestida pulveriza obstáculos, adipocitos y presas con fuerza devastadora.',
    morphology: CellMorphology.BACILLUS,
    mass: 6.8,
    hp: 1250,
    shield: 520,
    hpRegen: 15.0,
    shieldRegen: 30.0,
    maxSpeed: 18.0,
    acceleration: 30.0,
    turnRate: 2.2,
    vacuoleCapacity: 1000,
    color: 0x10b981,
    emissive: 0x065f46,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['bacillus_lancer', 'clostridium_ruptor'],
  },

  titan_clostridium_toxic: {
    id: 'titan_clostridium_toxic',
    name: '👑 Reina Lítica Neurotóxica',
    tier: 5,
    archetype: 'Super Macro Devastadora Bioquímica',
    role: CellRole.APEX_TITAN,
    icon: '👑',
    description: 'Exotoxinas corrosivas ultra-letales de dispersión instantánea. Destruye la membrana de leucocitos y macrófagos gigantes al contacto.',
    morphology: CellMorphology.BACILLUS,
    mass: 6.2,
    hp: 1150,
    shield: 480,
    hpRegen: 14.0,
    shieldRegen: 28.0,
    maxSpeed: 17.0,
    acceleration: 28.0,
    turnRate: 2.6,
    vacuoleCapacity: 1000,
    color: 0x8b5cf6,
    emissive: 0x6d28d9,
    sockets: [SocketType.FRONTAL_LEFT, SocketType.FRONTAL_RIGHT, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR],
    parentIds: ['clostridium_ruptor', 'xanthomonas_acid'],
  },

  titan_magneto_emperor: {
    id: 'titan_magneto_emperor',
    name: '👑 Emperador Bio-Electromagnético',
    tier: 5,
    archetype: 'Super Macro Vórtice Asimilador',
    role: CellRole.APEX_TITAN,
    icon: '👑',
    description: 'Vacuola monumental de 1500 ATP. Magnetiza el medio tisular, atrayendo energía y asimilando biomasa a ritmos colosales.',
    morphology: CellMorphology.SPIRILLUM,
    mass: 6.4,
    hp: 1200,
    shield: 540,
    hpRegen: 16.0,
    shieldRegen: 32.0,
    maxSpeed: 16.5,
    acceleration: 27.0,
    turnRate: 3.0,
    vacuoleCapacity: 1500,
    color: 0xf59e0b,
    emissive: 0xd97706,
    sockets: [SocketType.FRONTAL, SocketType.LATERAL_LEFT, SocketType.LATERAL_RIGHT, SocketType.POSTERIOR_LEFT, SocketType.POSTERIOR_RIGHT],
    parentIds: ['bifido_sponge', 'magneto_core', 'nostoc_filament'],
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

  public static getSpeciesByTier(tier: number): BacteriaSpecies[] {
    return Object.values(SPECIES_CATALOG).filter((sp) => sp.tier === tier);
  }

  public static getAllTiers(): Record<number, BacteriaSpecies[]> {
    const tree: Record<number, BacteriaSpecies[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    Object.values(SPECIES_CATALOG).forEach((sp) => {
      if (tree[sp.tier]) {
        tree[sp.tier].push(sp);
      }
    });
    return tree;
  }

  public static getAncestors(speciesId: string): Set<string> {
    const ancestors = new Set<string>();
    const queue = [speciesId];

    while (queue.length > 0) {
      const id = queue.shift()!;
      const sp = SPECIES_CATALOG[id];
      if (sp && sp.parentIds) {
        for (const pId of sp.parentIds) {
          if (!ancestors.has(pId)) {
            ancestors.add(pId);
            queue.push(pId);
          }
        }
      }
    }
    return ancestors;
  }

  public static getDescendants(speciesId: string): Set<string> {
    const descendants = new Set<string>();
    const queue = [speciesId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      for (const sp of Object.values(SPECIES_CATALOG)) {
        if (sp.parentIds.includes(currentId) && !descendants.has(sp.id)) {
          descendants.add(sp.id);
          queue.push(sp.id);
        }
      }
    }
    return descendants;
  }
}
