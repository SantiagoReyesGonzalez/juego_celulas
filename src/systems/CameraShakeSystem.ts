/**
 * CameraShakeSystem: Sistema de sacudida no lineal y Hit-Stop cinético
 * Basado en trauma cuadrático (trauma^2) para micro-vibraciones sutiles
 * e impactos colosales contundentes con retroceso direccional.
 */
export class CameraShakeSystem {
  private trauma = 0; // [0, 1]
  private traumaDecay = 1.6; // Decae a 0 en ~0.625s
  private maxOffset = 18.0; // Píxeles máximos de traslación
  private maxRoll = 0.05; // Radianes máximos de rotación Z

  private offsetX = 0;
  private offsetY = 0;
  private rollZ = 0;

  private directionalFactorX = 0;
  private directionalFactorY = 0;

  // Hit-Stop (Micro-pausa cinética para sensación de peso e impacto estilo Vlambeer)
  private hitStopTimer = 0;

  constructor() {}

  /**
   * Añade trauma acumulativo [0, 1] con dirección de impacto opcional
   */
  public addTrauma(amount: number, dirX = 0, dirY = 0): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
    if (dirX !== 0 || dirY !== 0) {
      const len = Math.hypot(dirX, dirY) || 1;
      this.directionalFactorX = dirX / len;
      this.directionalFactorY = dirY / len;
    }
  }

  /**
   * Inicia un micro-congelamiento de fotogramas (hit-stop) en milisegundos.
   * Recomendado: 30-50ms para golpes de sprint o rupturas de estructuras.
   */
  public triggerHitStop(milliseconds: number): void {
    this.hitStopTimer = Math.max(this.hitStopTimer, milliseconds / 1000);
  }

  /**
   * Indica si la simulación debe congelarse este frame por hit-stop
   */
  public isHitStopped(): boolean {
    return this.hitStopTimer > 0;
  }

  /**
   * Actualiza el trauma y calcula los offsets de cámara
   */
  public update(dt: number): { x: number; y: number; roll: number } {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      if (this.hitStopTimer < 0) this.hitStopTimer = 0;
    }

    if (this.trauma > 0) {
      // Decaimiento exponencial/lineal suave
      this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);

      // Shake no lineal cuadrático (Shake = Trauma^2)
      const shakePower = this.trauma * this.trauma;

      // Pseudo-ruido armónico con frecuencias discordantes
      const time = performance.now() * 0.045;
      const noiseX = Math.sin(time * 1.3) + Math.cos(time * 2.7) * 0.5;
      const noiseY = Math.cos(time * 1.7) + Math.sin(time * 3.1) * 0.5;
      const noiseRoll = Math.sin(time * 2.1);

      // Combinar componente omnidireccional con sesgo direccional del impacto
      this.offsetX = (noiseX * 0.7 + this.directionalFactorX * 0.5) * this.maxOffset * shakePower;
      this.offsetY = (noiseY * 0.7 + this.directionalFactorY * 0.5) * this.maxOffset * shakePower;
      this.rollZ = noiseRoll * this.maxRoll * shakePower;

      // Desvanecer el factor direccional gradualmente
      this.directionalFactorX *= Math.max(0, 1 - 5 * dt);
      this.directionalFactorY *= Math.max(0, 1 - 5 * dt);
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
      this.rollZ = 0;
      this.directionalFactorX = 0;
      this.directionalFactorY = 0;
    }

    return {
      x: this.offsetX,
      y: this.offsetY,
      roll: this.rollZ,
    };
  }

  public getOffset(): { x: number; y: number; roll: number } {
    return { x: this.offsetX, y: this.offsetY, roll: this.rollZ };
  }
}
