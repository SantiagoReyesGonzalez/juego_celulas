import * as THREE from 'three';
import { SocketType } from '../data/MutationTree';

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

export class OrganelleFactory {
  /**
   * Crea la malla 3D de un organelo según su tipo para anclarlo en un socket
   */
  public static createMesh(type: OrganelleType, color = 0x00ffcc): THREE.Object3D {
    const group = new THREE.Group();

    switch (type) {
      case OrganelleType.TOXIN_INJECTOR: {
        // Boquilla del sistema de secreción tipo III (cono bio-mecánico cónico)
        const coneGeo = new THREE.ConeGeometry(0.22, 0.6, 12);
        coneGeo.rotateZ(-Math.PI / 2); // Orientar la punta hacia adelante (+X)
        const coneMat = new THREE.MeshStandardMaterial({
          color: 0xa855f7,
          emissive: 0x9333ea,
          emissiveIntensity: 1.5,
          roughness: 0.2,
          metalness: 0.1,
        });
        const nozzle = new THREE.Mesh(coneGeo, coneMat);
        group.add(nozzle);
        break;
      }

      case OrganelleType.FLAGELLUM: {
        // Filamento flagelar ondulante
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < 20; i++) {
          points.push(new THREE.Vector3(-i * 0.15, 0, 0));
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: color,
          linewidth: 2,
          transparent: true,
          opacity: 0.9,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        group.add(line);
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
        // Fimbrias cortas radiantes
        for (let i = -2; i <= 2; i++) {
          const pGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
          pGeo.rotateZ(Math.PI / 2 + (i * Math.PI) / 8);
          const pMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
          const pilus = new THREE.Mesh(pGeo, pMat);
          pilus.position.set(0, i * 0.08, 0);
          group.add(pilus);
        }
        break;
      }
    }

    return group;
  }

  /**
   * Genera los sockets correspondientes para una morfología dada
   */
  public static generateSocketsForSpecies(
    socketTypes: SocketType[],
    bodyRadius: number,
    bodyLength = 2.4
  ): OrganelleSocket[] {
    const sockets: OrganelleSocket[] = [];

    socketTypes.forEach((st) => {
      switch (st) {
        case SocketType.FRONTAL:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(bodyLength * 0.5 + 0.1, 0),
            angle: 0,
            equippedOrganelle: OrganelleType.TOXIN_INJECTOR,
          });
          break;

        case SocketType.FRONTAL_LEFT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(bodyLength * 0.45, bodyRadius * 0.55),
            angle: 0.1,
            equippedOrganelle: OrganelleType.TOXIN_INJECTOR,
          });
          break;

        case SocketType.FRONTAL_RIGHT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(bodyLength * 0.45, -bodyRadius * 0.55),
            angle: -0.1,
            equippedOrganelle: OrganelleType.TOXIN_INJECTOR,
          });
          break;

        case SocketType.LATERAL_LEFT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(0, bodyRadius + 0.2),
            angle: Math.PI / 2,
            equippedOrganelle: OrganelleType.TOXIN_INJECTOR,
          });
          break;

        case SocketType.LATERAL_RIGHT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(0, -(bodyRadius + 0.2)),
            angle: -Math.PI / 2,
            equippedOrganelle: OrganelleType.TOXIN_INJECTOR,
          });
          break;

        case SocketType.POSTERIOR:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(-(bodyLength * 0.5 + 0.1), 0),
            angle: Math.PI,
            equippedOrganelle: OrganelleType.FLAGELLUM,
          });
          break;

        case SocketType.POSTERIOR_LEFT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(-bodyLength * 0.45, bodyRadius * 0.4),
            angle: Math.PI - 0.2,
            equippedOrganelle: OrganelleType.FLAGELLUM,
          });
          break;

        case SocketType.POSTERIOR_RIGHT:
          sockets.push({
            type: st,
            offset: new THREE.Vector2(-bodyLength * 0.45, -bodyRadius * 0.4),
            angle: Math.PI + 0.2,
            equippedOrganelle: OrganelleType.FLAGELLUM,
          });
          break;
      }
    });

    return sockets;
  }
}
