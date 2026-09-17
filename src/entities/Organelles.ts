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
        // Flagelos largos, ondulantes y sedosos de 6.4 unidades (estilo Imagen de Referencia 01)
        const segments = 32;
        const segmentLength = 0.20;
        const baseWidth = 0.14;

        // 1. Anillo motor basal en la membrana celular (origen 0,0,0)
        const motorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12);
        motorGeo.rotateZ(Math.PI / 2);
        const motorMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.95,
        });
        const motor = new THREE.Mesh(motorGeo, motorMat);
        group.add(motor);

        // 2. Malla Ribbon orgánica de doble cara con grosor decreciente y resplandor neón
        const ribbonVertices: number[] = [];
        const ribbonIndices: number[] = [];

        for (let i = 0; i < segments; i++) {
          const x = i * segmentLength;
          const norm = i / (segments - 1);
          const halfW = baseWidth * (1.0 - 0.85 * norm) * 0.5;

          // Vértice superior e inferior
          ribbonVertices.push(x, halfW, 0);
          ribbonVertices.push(x, -halfW, 0);

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
          color: color,
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
          linePoints.push(new THREE.Vector3(i * segmentLength, 0, 0));
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

        // Guardar referencias para animación eficiente
        group.userData.flagellum = {
          line,
          ribbon,
          segments,
          segmentLength,
          baseWidth,
        } as FlagellumUserData;
        break;
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
      const halfLen = (bodyLength * 0.8) * 0.5 + bodyRadius;
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
          const ang = Math.PI - 0.32;
          const offX =
            morphology === CellMorphology.COCCUS || morphology === CellMorphology.DIPLOCOCCUS
              ? -rearDist * Math.cos(0.32)
              : -rearDist + 0.15;
          const offY =
            morphology === CellMorphology.COCCUS || morphology === CellMorphology.DIPLOCOCCUS
              ? rearDist * Math.sin(0.32)
              : lateralDist * 0.42;
          sockets.push({
            type: st,
            offset: new THREE.Vector2(offX, offY),
            angle: ang,
            equippedOrganelle: OrganelleType.FLAGELLUM,
          });
          break;
        }

        case SocketType.POSTERIOR_RIGHT: {
          const ang = Math.PI + 0.32;
          const offX =
            morphology === CellMorphology.COCCUS || morphology === CellMorphology.DIPLOCOCCUS
              ? -rearDist * Math.cos(0.32)
              : -rearDist + 0.15;
          const offY =
            morphology === CellMorphology.COCCUS || morphology === CellMorphology.DIPLOCOCCUS
              ? -rearDist * Math.sin(0.32)
              : -lateralDist * 0.42;
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
   * Actualiza la ondulación hidrodinámica de los flagelos unidos a la célula
   */
  public static animateFlagella(
    flagella: THREE.Object3D[],
    time: number,
    speed: number,
    isThrusting: boolean
  ): void {
    const waveFreq = 11.0 + Math.min(speed * 2.2, 18.0);
    const baseAmp = isThrusting ? 0.36 : 0.22;

    flagella.forEach((group, idx) => {
      const data = group.userData.flagellum as FlagellumUserData | undefined;
      if (!data) return;

      const { line, ribbon, segments, segmentLength, baseWidth } = data;
      const linePositions = line.geometry.attributes.position as THREE.BufferAttribute;
      const ribbonPositions = ribbon.geometry.attributes.position as THREE.BufferAttribute;

      const totalLen = (segments - 1) * segmentLength;

      for (let j = 0; j < segments; j++) {
        const x = j * segmentLength;
        const normalizedX = x / totalLen;
        // La amplitud es 0 estrictamente en j=0 para que la raíz permanezca fija en la membrana
        const amp = baseAmp * Math.pow(normalizedX, 1.15) * 1.3;
        const phase = time * waveFreq - x * 2.8 + idx * 0.7;
        const wave = Math.sin(phase) * amp + Math.sin(phase * 2.1 + 0.6) * (amp * 0.22);

        // Actualizar filamento central
        linePositions.setXYZ(j, x, wave, 0);

        // Ancho decreciente hacia la punta
        const halfW = baseWidth * (1.0 - 0.82 * normalizedX) * 0.5;

        // Actualizar cinta orgánica (vértice superior e inferior)
        ribbonPositions.setXYZ(j * 2, x, wave + halfW, 0);
        ribbonPositions.setXYZ(j * 2 + 1, x, wave - halfW, 0);
      }

      linePositions.needsUpdate = true;
      ribbonPositions.needsUpdate = true;
    });
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
      // 4. Bacilo, Vibrio y Espirilo: cápsula regular distribuida estrictamente por longitud de arco
      const halfL = (length * 0.8) * 0.5;
      const arcCap = Math.PI * radius;
      const flatSide = halfL * 2;
      const totalPerimeter = 2 * arcCap + 2 * flatSide;
      const totalCilia = 52;

      const nCap = Math.max(12, Math.round(totalCilia * (arcCap / totalPerimeter)));
      const nSide = Math.max(10, Math.round(totalCilia * (flatSide / totalPerimeter)));

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

    for (let i = 0; i < ciliaCount; i++) {
      const pt = contour[i];
      // Pequeña variación orgánica de longitud y orientación biológica
      const lengthNoise = Math.sin(i * 3.7) * 0.5 + 0.5;
      const cLen = 0.32 + lengthNoise * 0.18;

      const angleJitter = Math.sin(i * 5.9) * 0.08;
      const jnx = pt.nx * Math.cos(angleJitter) - pt.ny * Math.sin(angleJitter);
      const jny = pt.nx * Math.sin(angleJitter) + pt.ny * Math.cos(angleJitter);

      lengths.push(cLen);
      basePoints.push(new THREE.Vector3(pt.bx, pt.by, 0));
      normals.push(new THREE.Vector3(jnx, jny, 0));

      // Vértice base (en la membrana)
      vertices.push(pt.bx, pt.by, 0);
      // Vértice punta inicial
      vertices.push(pt.bx + jnx * cLen, pt.by + jny * cLen, 0);
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
