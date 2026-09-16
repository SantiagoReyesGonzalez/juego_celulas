import RAPIER from '@dimforge/rapier2d';

export enum Morphology {
  COCCUS = 'COCCUS',
  BACILLUS = 'BACILLUS',
  SPIRILLUM = 'SPIRILLUM',
}

export interface HydrodynamicProperties {
  morphology: Morphology;
  projectedArea: number;   // Área de sección transversal A
  customCd?: number;       // Coeficiente de arrastre opcional
  terminalVelocity: number;// Velocidad máxima
}

export class HydrodynamicsSystem {
  // Coeficientes de arrastre Cd según morfología (del GDD)
  private readonly cdTable: Record<Morphology, number> = {
    [Morphology.COCCUS]: 0.47,
    [Morphology.BACILLUS]: 0.80,
    [Morphology.SPIRILLUM]: 1.05,
  };

  // Densidad del fluido tisular rho (1.05 para Capilar Dérmico)
  public fluidDensity = 1.05;

  // Coeficiente de fricción laminar para frenado asintótico suave a baja velocidad
  public laminarViscosity = 1.8;

  /**
   * Aplica la fuerza de resistencia hidrodinámica (Drag) al cuerpo rígido
   * F_drag = 0.5 * rho * Cd * A * v * |v| + F_laminar
   */
  public applyDrag(body: RAPIER.RigidBody, props: HydrodynamicProperties): void {
    const linvel = body.linvel();
    const vx = linvel.x;
    const vy = linvel.y;
    const speedSq = vx * vx + vy * vy;

    if (speedSq < 0.00001) {
      return;
    }

    const speed = Math.sqrt(speedSq);
    const cd = props.customCd ?? this.cdTable[props.morphology];
    const area = props.projectedArea;

    // Componente turbulento (cuadrático) + componente laminar (lineal)
    const turbulentDrag = 0.5 * this.fluidDensity * cd * area * speedSq;
    const laminarDrag = this.laminarViscosity * speed;
    const totalDrag = turbulentDrag + laminarDrag;

    // Vector de fuerza opuesto a la velocidad actual
    const dragX = -(vx / speed) * totalDrag;
    const dragY = -(vy / speed) * totalDrag;

    body.applyImpulse({ x: dragX * (1 / 60), y: dragY * (1 / 60) }, true);

    // Limitador de velocidad terminal (Terminal Velocity clamp)
    if (speed > props.terminalVelocity) {
      const scale = props.terminalVelocity / speed;
      body.setLinvel({ x: vx * scale, y: vy * scale }, true);
    }
  }

  /**
   * Aplica amortiguamiento angular hidrodinámico para alinear giros
   */
  public applyRotationalDrag(body: RAPIER.RigidBody, dampingFactor = 3.0): void {
    const angvel = body.angvel();
    if (Math.abs(angvel) > 0.001) {
      const opposingTorque = -angvel * dampingFactor * (1 / 60);
      body.applyTorqueImpulse(opposingTorque, true);
    }
  }
}
