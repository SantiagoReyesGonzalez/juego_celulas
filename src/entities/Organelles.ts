import * as THREE from 'three';
import { SocketType, CellMorphology } from '../data/MutationTree';

export enum OrganelleType {
  FLAGELLUM = 'FLAGELLUM',
  TOXIN_INJECTOR = 'TOXIN_INJECTOR',
  CAPSULE_LAYER = 'CAPSULE_LAYER',
  ADHESION_PILI = 'ADHESION_PILI',
}

export interface OrganelleSocket {
  type: SocketType;
  offset: THREE.Vector2;
  angle: number; // Ángulo de orientación relativo a la célula
  equippedOrganelle: OrganelleType;
  mesh?: THREE.Object3D;
}

export interface FlagellumUserData {
  line: THREE.Line;
  ribbon: THREE.Mesh;
  segments: number;
  segmentLength: number;
  baseWidth: number;
  phaseOffset?: number;
}

export class OrganelleFactory {
  /**
   * Crea la malla 3D de un organelo según su tipo para anclarlo en un socket
   */
  public static createMesh(type: OrganelleType, color = 0x00ffcc): THREE.Object3D {
    const group = new THREE.Group();

    switch (type) {
      case OrganelleType.TOXIN_INJECTOR: {
        // Poro secretor biológico y micro-fimbria (reemplazo biológico del cono mecánico)
        const poreGeo = new THREE.SphereGeometry(0.12, 10, 10);
        const poreMat = new THREE.MeshBasicMaterial({
          color: 0xd946ef,
          transparent: true,
          opacity: 0.85,
        });
        const pore = new THREE.Mesh(poreGeo, poreMat);
        group.add(pore);

        const needleGeo = new THREE.CylinderGeometry(0.025, 0.05, 0.45, 8);
        needleGeo.rotateZ(-Math.PI / 2); // Orientado hacia adelante (+X)
        needleGeo.translate(0.225, 0, 0);
        const needleMat = new THREE.MeshBasicMaterial({
          color: 0xf472b6,
          transparent: true,
          opacity: 0.9,
        });
        const needle = new THREE.Mesh(needleGeo, needleMat);
        group.add(needle);
        break;
      }

      case OrganelleType.FLAGELLUM: {
        return OrganelleFactory.createFlagellumMesh(color);
      }

      case OrganelleType.CAPSULE_LAYER: {
        // Escudo de polisacáridos bioluminiscente perimetral
        const ringGeo = new THREE.RingGeometry(0.3, 0.5, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);
        break;
      }

      case OrganelleType.ADHESION_PILI: {
        // Penacho de fimbrias radiantes hacia adelante (+X)
        for (let i = -2; i <= 2; i++) {
          const pGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6);
          pGeo.rotateZ(-Math.PI / 2 + (i * Math.PI) / 10);
          pGeo.translate(0.22, i * 0.05, 0);
          const pMat = new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.85,
          });
          const pilus = new THREE.Mesh(pGeo, pMat);
          group.add(pilus);
        }
        break;
      }
    }

    return group;
  }

  /**
   * Genera los sockets correspondientes para una morfología dada sobre el perímetro de la membrana
   */
  public static generateSocketsForSpecies(
    socketTypes: SocketType[],
    bodyRadius: number,
    bodyLength = 2.4,
    morphology: CellMorphology = CellMorphology.COCCUS
  ): OrganelleSocket[] {
    const sockets: OrganelleSocket[] = [];

    // Calcular distancia al polo posterior y frontal exactamente sobre la membrana
    let rearDist = bodyRadius;
    let frontDist = bodyRadius;
    let lateralDist = bodyRadius;

    if (morphology === CellMorphology.DIPLOCOCCUS) {
      const r = bodyRadius * 0.95;
      rearDist = 0.6 + r;
      frontDist = 0.6 + r;
      lateralDist = r;
    } else if (
      morphology === CellMorphology.BACILLUS ||
      morphology === CellMorphology.STREPTOCOCCUS ||
      morphology === CellMorphology.VIBRIO ||
      morphology === CellMorphology.SPIRILLUM
    ) {
      const halfLen = (bodyLength * 0.85) * 0.5 + bodyRadius;
      rearDist = halfLen;
      frontDist = halfLen;
      lateralDist = bodyRadius;
    }

    socketTypes.forEach((st) => {
      switch (st) {
        case SocketType.FRONTAL:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(frontDist, 0),
            angle: 0,
            equippedOrganelle: OrganelleType.ADHESION_PILI,
          });
          break;

        case SocketType.FRONTAL_LEFT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(frontDist * 0.92, lateralDist * 0.38),
            angle: 0.25,
            equippedOrganelle: OrganelleType.ADHESION_PILI,
          });
          break;

        case SocketType.FRONTAL_RIGHT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(frontDist * 0.92, -lateralDist * 0.38),
            angle: -0.25,
            equippedOrganelle: OrganelleType.ADHESION_PILI,
          });
          break;

        case SocketType.LATERAL_LEFT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(0, lateralDist),
            angle: Math.PI / 2,
            equippedOrganelle: OrganelleType.ADHESION_PILI,
          });
          break;

        case SocketType.LATERAL_RIGHT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(0, -lateralDist),
            angle: -Math.PI / 2,
            equippedOrganelle: OrganelleType.ADHESION_PILI,
          });
          break;

        case SocketType.POSTERIOR:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(-rearDist, 0),
            angle: Math.PI,
            equippedOrganelle: OrganelleType.FLAGELLUM,
          });
          break;

        case SocketType.POSTERIOR_LEFT: {
          const ang = Math.PI - 0.16;
          const offX =
            morphology === CellMorphology.COCCUS || morphology === CellMorphology.DIPLOCOCCUS
              ? -rearDist * Math.cos(0.32)
              : -rearDist + 0.08;
          const offY =
            morphology === CellMorphology.COCCUS || morphology === CellMorphology.DIPLOCOCCUS
              ? rearDist * Math.sin(0.32)
              : 0.28;
          sockets.push({
            type: st,
            offset: new THREE.Vector2(offX, offY),
            angle: ang,
            equippedOrganelle: OrganelleType.FLAGELLUM,
          });
          break;
        }

        case SocketType.POSTERIOR_RIGHT: {
          const ang = Math.PI + 0.16;
          const offX =
            morphology === CellMorphology.COCCUS || morphology === CellMorphology.DIPLOCOCCUS
              ? -rearDist * Math.cos(0.32)
              : -rearDist + 0.08;
          const offY =
            morphology === CellMorphology.COCCUS || morphology === CellMorphology.DIPLOCOCCUS
              ? -rearDist * Math.sin(0.32)
              : -0.28;
          sockets.push({
            type: st,
            offset: new THREE.Vector2(offX, offY),
            angle: ang,
            equippedOrganelle: OrganelleType.FLAGELLUM,
          });
          break;
        }
      }
    });

    return sockets;
  }

  /**
   * Crea una malla de flagelo compuesta por un anillo motor, una cinta orgánica (ribbon)
   * y un filamento axial central sobre vértices existentes.
   */
  public static createFlagellumMesh(
    color: number,
    phaseOffset = 0,
    segments = 32,
    segmentLength = 0.22,
    baseWidth = 0.13
  ): THREE.Group {
    const group = new THREE.Group();

    // 1. Anillo motor basal en la membrana celular (origen 0,0,0)
    const motorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12);
    motorGeo.rotateZ(Math.PI / 2);
    const motorMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
    });
    const motor = new THREE.Mesh(motorGeo, motorMat);
    group.add(motor);

    // 2. Malla Ribbon orgánica de doble cara con grosor decreciente
    const ribbonVertices: number[] = [];
    const ribbonIndices: number[] = [];

    for (let i = 0; i < segments; i++) {
      const x = i * segmentLength;
      const norm = i / (segments - 1);
      const halfW = baseWidth * (1.0 - 0.82 * norm) * 0.5;

      ribbonVertices.push(x, halfW, 0.05);
      ribbonVertices.push(x, -halfW, 0.05);

      if (i < segments - 1) {
        const v0 = i * 2;
        const v1 = i * 2 + 1;
        const v2 = (i + 1) * 2;
        const v3 = (i + 1) * 2 + 1;
        ribbonIndices.push(v0, v1, v2);
        ribbonIndices.push(v2, v1, v3);
      }
    }

    const ribbonGeo = new THREE.BufferGeometry();
    ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVertices, 3));
    ribbonGeo.setIndex(ribbonIndices);

    const ribbonMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    group.add(ribbon);

    // 3. Filamento axial central de alta luminiscencia blanca
    const linePoints: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      linePoints.push(new THREE.Vector3(i * segmentLength, 0, 0.06));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      linewidth: 1.5,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);

    group.userData.flagellum = {
      line,
      ribbon,
      segments,
      segmentLength,
      baseWidth,
      phaseOffset,
    } as FlagellumUserData;

    return group;
  }

  /**
   * Actualiza la ondulación de los flagelos unidos a la célula usando exclusivamente Math.sin
   */
  public static animateFlagella(
    flagella: THREE.Object3D[],
    time: number,
    speed: number,
    isThrusting: boolean
  ): void {
    for (let i = 0; i < flagella.length; i++) {
      animateFlagellumSin(flagella[i], time, speed, isThrusting, i * 0.85);
    }
  }

  /**
   * Crea una corona perimetral de cilios/pelos bioluminiscentes adaptada fielmente
   * a la morfología real de la célula (Coccus, Diplococcus, Streptococcus, Bacillus, etc.)
   */
  public static createCiliaFringe(
    radius: number,
    length: number,
    morphology: CellMorphology,
    color = 0x34d399
  ): THREE.LineSegments {
    const vertices: number[] = [];
    const basePoints: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];
    const lengths: number[] = [];

    // Colección de puntos base y normales generados para el contorno específico de la célula
    const contour: Array<{ bx: number; by: number; nx: number; ny: number }> = [];

    if (morphology === CellMorphology.COCCUS) {
      // 1. Coco: circunferencia perfecta
      const count = 40;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        contour.push({
          bx: Math.cos(ang) * radius,
          by: Math.sin(ang) * radius,
          nx: Math.cos(ang),
          ny: Math.sin(ang),
        });
      }
    } else if (morphology === CellMorphology.DIPLOCOCCUS) {
      // 2. Diplococo: dos esferas unidas en x = +0.6 y x = -0.6
      const d = 0.6;
      const r1 = radius * 0.95;
      const cosCut = Math.min(0.99, d / r1);
      const theta0 = Math.PI - Math.acos(cosCut); // Ángulo de arco expuesto
      const countPerLobe = 24;

      // Lóbulo frontal (+d)
      for (let i = 0; i < countPerLobe; i++) {
        const a = -theta0 + (2 * theta0 * i) / (countPerLobe - 1);
        contour.push({
          bx: d + Math.cos(a) * r1,
          by: Math.sin(a) * r1,
          nx: Math.cos(a),
          ny: Math.sin(a),
        });
      }

      // Lóbulo posterior (-d)
      for (let i = 0; i < countPerLobe; i++) {
        const a = (Math.PI - theta0) + (2 * theta0 * i) / (countPerLobe - 1);
        contour.push({
          bx: -d + Math.cos(a) * r1,
          by: Math.sin(a) * r1,
          nx: Math.cos(a),
          ny: Math.sin(a),
        });
      }
    } else if (morphology === CellMorphology.STREPTOCOCCUS) {
      // 3. Estreptococo: tres esferas continuas en x = -0.95, 0, +0.95 (resuelve el error de cilios flotantes)
      const d = 0.95;
      const rS = radius * 0.85;
      const halfD = d * 0.5;
      const cosCut = Math.min(0.99, halfD / rS);
      const thetaC = Math.acos(cosCut); // Ángulo de intersección cintura
      const thetaEnd = Math.PI - thetaC;

      // Arco frontal (Esfera frontal en +0.95): desde -thetaEnd hasta +thetaEnd
      const frontCount = 22;
      for (let i = 0; i < frontCount; i++) {
        const a = -thetaEnd + (2 * thetaEnd * i) / (frontCount - 1);
        contour.push({
          bx: d + Math.cos(a) * rS,
          by: Math.sin(a) * rS,
          nx: Math.cos(a),
          ny: Math.sin(a),
        });
      }

      // Cintura superior (Esfera central en 0): desde thetaC hasta PI - thetaC
      const waistTopCount = 8;
      for (let i = 0; i < waistTopCount; i++) {
        const a = thetaC + ((Math.PI - 2 * thetaC) * (i + 0.5)) / waistTopCount;
        contour.push({
          bx: Math.cos(a) * rS,
          by: Math.sin(a) * rS,
          nx: Math.cos(a),
          ny: Math.sin(a),
        });
      }

      // Arco posterior (Esfera posterior en -0.95): desde PI - thetaEnd hasta PI + thetaEnd
      const rearCount = 22;
      for (let i = 0; i < rearCount; i++) {
        const a = (Math.PI - thetaEnd) + (2 * thetaEnd * i) / (rearCount - 1);
        contour.push({
          bx: -d + Math.cos(a) * rS,
          by: Math.sin(a) * rS,
          nx: Math.cos(a),
          ny: Math.sin(a),
        });
      }

      // Cintura inferior (Esfera central en 0): desde PI + thetaC hasta 2*PI - thetaC
      const waistBottomCount = 8;
      for (let i = 0; i < waistBottomCount; i++) {
        const a = (Math.PI + thetaC) + ((Math.PI - 2 * thetaC) * (i + 0.5)) / waistBottomCount;
        contour.push({
          bx: Math.cos(a) * rS,
          by: Math.sin(a) * rS,
          nx: Math.cos(a),
          ny: Math.sin(a),
        });
      }
    } else {
      // 4. Bacilo (Escherichia coli), Vibrio y Espirilo: cápsula regular con densa corona perítrica
      const halfL = (length * 0.85) * 0.5;
      const arcCap = Math.PI * radius;
      const flatSide = halfL * 2;
      const totalPerimeter = 2 * arcCap + 2 * flatSide;
      const totalCilia = morphology === CellMorphology.BACILLUS ? 84 : 52;

      const nCap = Math.max(16, Math.round(totalCilia * (arcCap / totalPerimeter)));
      const nSide = Math.max(22, Math.round(totalCilia * (flatSide / totalPerimeter)));

      // Casquete frontal (+X)
      for (let i = 0; i < nCap; i++) {
        const a = -Math.PI * 0.5 + (Math.PI * i) / (nCap - 1);
        contour.push({
          bx: halfL + Math.cos(a) * radius,
          by: Math.sin(a) * radius,
          nx: Math.cos(a),
          ny: Math.sin(a),
        });
      }

      // Lado superior (+Y, de +X hacia -X)
      for (let i = 1; i <= nSide; i++) {
        const t = i / (nSide + 1);
        contour.push({
          bx: halfL - t * (halfL * 2),
          by: radius,
          nx: 0,
          ny: 1,
        });
      }

      // Casquete posterior (-X)
      for (let i = 0; i < nCap; i++) {
        const a = Math.PI * 0.5 + (Math.PI * i) / (nCap - 1);
        contour.push({
          bx: -halfL + Math.cos(a) * radius,
          by: Math.sin(a) * radius,
          nx: Math.cos(a),
          ny: Math.sin(a),
        });
      }

      // Lado inferior (-Y, de -X hacia +X)
      for (let i = 1; i <= nSide; i++) {
        const t = i / (nSide + 1);
        contour.push({
          bx: -halfL + t * (halfL * 2),
          by: -radius,
          nx: 0,
          ny: -1,
        });
      }
    }

    const ciliaCount = contour.length;
    const isBacillus = morphology === CellMorphology.BACILLUS;

    for (let i = 0; i < ciliaCount; i++) {
      const pt = contour[i];
      // Variación orgánica de longitud y orientación (fiel al halo perítrico de E. coli)
      const lengthNoise = Math.sin(i * 3.7) * 0.5 + 0.5;
      const cLen = isBacillus
        ? 0.55 + lengthNoise * 0.75
        : 0.32 + lengthNoise * 0.18;

      const angleJitter = isBacillus ? Math.sin(i * 4.3) * 0.18 : Math.sin(i * 5.9) * 0.08;
      const jnx = pt.nx * Math.cos(angleJitter) - pt.ny * Math.sin(angleJitter);
      const jny = pt.nx * Math.sin(angleJitter) + pt.ny * Math.cos(angleJitter);

      lengths.push(cLen);
      basePoints.push(new THREE.Vector3(pt.bx, pt.by, 0));
      normals.push(new THREE.Vector3(jnx, jny, 0));

      // Vértice base (en la membrana)
      vertices.push(pt.bx, pt.by, 0);
      // Vértice punta inicial
      vertices.push(pt.bx + jnx * cLen, pt.by + jny * cLen, 0.04);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const mat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.90,
    });

    const ciliaMesh = new THREE.LineSegments(geo, mat);
    ciliaMesh.userData.ciliaData = {
      basePoints,
      normals,
      lengths,
      ciliaCount,
    };

    return ciliaMesh;
  }

  /**
   * Anima la ondulación y vibración hidrodinámica de los micro-cilios perimetrales
   */
  public static animateCilia(ciliaMesh: THREE.LineSegments, time: number): void {
    const data = ciliaMesh.userData.ciliaData;
    if (!data) return;

    const { basePoints, normals, lengths, ciliaCount } = data;
    const positions = ciliaMesh.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < ciliaCount; i++) {
      const base = basePoints[i];
      const norm = normals[i];
      const len = lengths[i];

      // Vector tangente perpendicular
      const tx = -norm.y;
      const ty = norm.x;

      // Ondulación sinusoidal dependiente del tiempo y del índice
      const sway = Math.sin(time * 7.5 + i * 0.8) * 0.12;

      // Actualizar solo el vértice de la punta (índice i * 2 + 1)
      const tipX = base.x + norm.x * len + tx * sway;
      const tipY = base.y + norm.y * len + ty * sway;

      positions.setXYZ(i * 2 + 1, tipX, tipY, 0);
    }

    positions.needsUpdate = true;
  }
}

/**
 * Anima el flagelo usando exclusivamente Math.sin sobre los vértices existentes.
 * Modifica directamente los buffers de posición sin físicas Verlet ni librerías externas.
 */
export function animateFlagellumSin(
  flagellum: THREE.Object3D,
  time: number,
  speed = 0,
  isThrusting = false,
  phaseOffset = 0
): void {
  const data = flagellum.userData?.flagellum as FlagellumUserData | undefined;
  if (!data || !data.ribbon || !data.line) return;

  const { ribbon, line, segments, segmentLength, baseWidth } = data;
  const phase = phaseOffset || data.phaseOffset || 0;

  const ribbonPositions = ribbon.geometry.attributes.position as THREE.BufferAttribute;
  const linePositions = line.geometry.attributes.position as THREE.BufferAttribute;

  const waveFreq = 12.0 + Math.min(speed * 2.0, 18.0) * (isThrusting ? 1.3 : 1.0);
  const baseAmp = isThrusting ? 0.40 : 0.22;

  // Calculamos la oscilación ondulatoria exclusivamente con Math.sin
  for (let i = 0; i < segments; i++) {
    const normX = i / (segments - 1);
    const x = i * segmentLength;

    // Amplitud cero en la membrana (normX = 0) creciendo hacia la punta mediante Math.sin
    const amp = baseAmp * Math.sin(normX * Math.PI * 0.5);
    const wave = amp * Math.sin(time * waveFreq - normX * 4.8 + phase);

    // Derivada de la onda para calcular las normales del ribbon usando Math.sin
    const nextNormX = Math.min(1.0, (i + 1) / (segments - 1));
    const nextAmp = baseAmp * Math.sin(nextNormX * Math.PI * 0.5);
    const nextWave = nextAmp * Math.sin(time * waveFreq - nextNormX * 4.8 + phase);

    const tx = segmentLength;
    const ty = nextWave - wave;
    const len = Math.hypot(tx, ty) || 1.0;
    const nx = -ty / len;
    const ny = tx / len;

    const halfW = baseWidth * (1.0 - 0.82 * normX) * 0.5;

    // Modificar vértices existentes del ribbon (2 vértices por segmento)
    ribbonPositions.setXYZ(i * 2, x + nx * halfW, wave + ny * halfW, 0.05);
    ribbonPositions.setXYZ(i * 2 + 1, x - nx * halfW, wave - ny * halfW, 0.05);

    // Modificar vértices existentes del filamento axial central
    linePositions.setXYZ(i, x, wave, 0.06);
  }

  ribbonPositions.needsUpdate = true;
  linePositions.needsUpdate = true;
}

export interface InternalOrganelleItem {
  mesh: THREE.Mesh;
  baseOffset: THREE.Vector2;
  currentLag: THREE.Vector2;
  frequency: number;
  phase: number;
  amplitude: number;
  baseScale: number;
  isCore: boolean;
}

/**
 * Clúster de 2 a 5 orgánulos internos bioluminiscentes (Macronúcleo y Vacuolas)
 * con blend aditivo, pulsación respiratoria y oscilación inercial citoplasmática.
 */
export class InternalOrganelleCluster {
  public group: THREE.Group;
  private organelles: InternalOrganelleItem[] = [];
  private bodyRadius: number;

  constructor(
    parent: THREE.Group,
    bodyRadius: number,
    primaryColor: number,
    secondaryColor: number = 0xf59e0b,
    count: number = 4
  ) {
    this.group = new THREE.Group();
    parent.add(this.group);
    this.bodyRadius = bodyRadius;

    this.buildCluster(primaryColor, secondaryColor, Math.max(2, Math.min(count, 5)));
  }

  private buildCluster(primaryColor: number, secondaryColor: number, count: number): void {
    // 1. Macronúcleo central bioluminiscente de alta densidad
    const coreRadius = this.bodyRadius * 0.44;
    const coreGeo = new THREE.SphereGeometry(coreRadius, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 0, 0.05);
    this.group.add(coreMesh);

    // Centro hiperbrillante del núcleo
    const innerCoreGeo = new THREE.SphereGeometry(coreRadius * 0.48, 12, 12);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    innerCoreMesh.position.set(0, 0, 0.06);
    this.group.add(innerCoreMesh);

    this.organelles.push({
      mesh: coreMesh,
      baseOffset: new THREE.Vector2(0, 0),
      currentLag: new THREE.Vector2(0, 0),
      frequency: 1.8,
      phase: 0,
      amplitude: 0.06,
      baseScale: 1.0,
      isCore: true,
    });

    // 2. Vacuolas y Mitocondrias orbitales (de 1 a 4 orgánulos adicionales)
    const vacCount = count - 1;
    const isGreenBacterium = ((primaryColor >> 8) & 0xff) > 0x80 && ((primaryColor >> 16) & 0xff) < 0x80;
    const vacPalette = isGreenBacterium
      ? [0x6ee7b7, 0x34d399, 0xa7f3d0, 0x059669]
      : [secondaryColor, 0x38bdf8, 0xf43f5e, 0xfacc15];

    for (let i = 0; i < vacCount; i++) {
      const angle = (i * Math.PI * 2) / vacCount + 0.55;
      const dist = this.bodyRadius * (0.38 + (i % 2) * 0.14);
      const vRadius = this.bodyRadius * (0.16 + (i % 3) * 0.05);

      const vGeo = new THREE.SphereGeometry(vRadius, 12, 12);
      const vMat = new THREE.MeshBasicMaterial({
        color: vacPalette[i % vacPalette.length],
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const vMesh = new THREE.Mesh(vGeo, vMat);
      const bx = Math.cos(angle) * dist;
      const by = Math.sin(angle) * dist;
      vMesh.position.set(bx, by, 0.08);
      this.group.add(vMesh);

      this.organelles.push({
        mesh: vMesh,
        baseOffset: new THREE.Vector2(bx, by),
        currentLag: new THREE.Vector2(0, 0),
        frequency: 2.2 + i * 0.45,
        phase: i * 1.25,
        amplitude: 0.09 + i * 0.03,
        baseScale: 1.0,
        isCore: false,
      });
    }
  }

  /**
   * Actualiza la oscilación inercial citoplasmática y pulsación respiratoria
   */
  public update(
    dt: number,
    time: number,
    localVel?: { x: number; y: number }
  ): void {
    const vx = localVel ? localVel.x : 0;
    const vy = localVel ? localVel.y : 0;

    for (let i = 0; i < this.organelles.length; i++) {
      const org = this.organelles[i];

      // 1. Inercia de fluidos: los orgánulos quedan rezagados respecto a la aceleración
      const targetLagX = -vx * 0.035;
      const targetLagY = -vy * 0.035;
      org.currentLag.x += (targetLagX - org.currentLag.x) * Math.min(dt * 7.0, 1.0);
      org.currentLag.y += (targetLagY - org.currentLag.y) * Math.min(dt * 7.0, 1.0);

      // 2. Micro-oscilación streaming de citoplasma (Brownian oscillation)
      const brownX = Math.sin(time * org.frequency + org.phase) * org.amplitude;
      const brownY = Math.cos(time * org.frequency * 0.88 + org.phase) * org.amplitude;

      let ox = org.baseOffset.x + org.currentLag.x + brownX;
      let oy = org.baseOffset.y + org.currentLag.y + brownY;

      // Delimitar dentro de la membrana celular
      const dist = Math.hypot(ox, oy);
      const maxDist = this.bodyRadius * 0.72;
      if (dist > maxDist) {
        ox = (ox / dist) * maxDist;
        oy = (oy / dist) * maxDist;
      }

      org.mesh.position.x = ox;
      org.mesh.position.y = oy;

      // 3. Respiración bioluminiscente sinusoidal
      const pulse = 1.0 + Math.sin(time * 2.0 + org.phase) * (org.isCore ? 0.06 : 0.12);
      org.mesh.scale.set(pulse, pulse, pulse);
    }
  }

  public dispose(): void {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    this.organelles.forEach((org) => {
      org.mesh.geometry.dispose();
      (org.mesh.material as THREE.Material).dispose();
    });
  }
}
