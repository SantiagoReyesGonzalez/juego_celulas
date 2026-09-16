/**
 * Topología del Mundo Toroidal Periódico 2D (Estilo Starblast.io)
 * Define las dimensiones universales y funciones matemáticas para el wrapping continuo de entidades,
 * cálculo de distancia euclidiana toroidal mínima (Minimum Image Convention) y navegación.
 */

export const WORLD_WIDTH = 260;
export const WORLD_HEIGHT = 220;

export const HALF_WIDTH = WORLD_WIDTH / 2;   // 130
export const HALF_HEIGHT = WORLD_HEIGHT / 2; // 110

export const WORLD_BOUNDS = {
  minX: -HALF_WIDTH,
  maxX: HALF_WIDTH,
  minY: -HALF_HEIGHT,
  maxY: HALF_HEIGHT,
};

/**
 * Ajusta una coordenada dentro de un rango [min, max] mediante aritmética modular.
 */
export function wrapCoordinate(val: number, min: number, max: number): number {
  const span = max - min;
  let normalized = (val - min) % span;
  if (normalized < 0) normalized += span;
  return min + normalized;
}

/**
 * Ajusta un par de coordenadas (x, y) para mantenerlas dentro de los límites del mundo toroidal.
 */
export function wrapPosition(x: number, y: number): { x: number; y: number } {
  let wrappedX = x;
  let wrappedY = y;

  if (wrappedX > HALF_WIDTH) {
    wrappedX -= WORLD_WIDTH;
  } else if (wrappedX < -HALF_WIDTH) {
    wrappedX += WORLD_WIDTH;
  }

  if (wrappedY > HALF_HEIGHT) {
    wrappedY -= WORLD_HEIGHT;
  } else if (wrappedY < -HALF_HEIGHT) {
    wrappedY += WORLD_HEIGHT;
  }

  return { x: wrappedX, y: wrappedY };
}

/**
 * Calcula el vector de desplazamiento (dx, dy) y la distancia euclidiana más corta
 * en la topología toroidal usando la convención de imagen mínima (Minimum Image Convention).
 * Esto permite que las entidades detecten, persigan y colisionen a través de los límites del mapa.
 */
export function getToroidalDelta(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): { dx: number; dy: number; dist: number } {
  let dx = toX - fromX;
  let dy = toY - fromY;

  if (dx > HALF_WIDTH) {
    dx -= WORLD_WIDTH;
  } else if (dx < -HALF_WIDTH) {
    dx += WORLD_WIDTH;
  }

  if (dy > HALF_HEIGHT) {
    dy -= WORLD_HEIGHT;
  } else if (dy < -HALF_HEIGHT) {
    dy += WORLD_HEIGHT;
  }

  const dist = Math.hypot(dx, dy);
  return { dx, dy, dist };
}

/**
 * Determina si una coordenada se encuentra fuera del margen del mundo.
 */
export function isOutsideBounds(x: number, y: number, margin = 0): boolean {
  return (
    x < -HALF_WIDTH - margin ||
    x > HALF_WIDTH + margin ||
    y < -HALF_HEIGHT - margin ||
    y > HALF_HEIGHT + margin
  );
}

/**
 * Devuelve el cuadrante biológico / sector en el que se encuentra la célula (e.g. Sector α-1, β-2)
 */
export function getSectorLabel(x: number, y: number): string {
  const col = x < 0 ? (x < -HALF_WIDTH / 2 ? '1' : '2') : (x < HALF_WIDTH / 2 ? '3' : '4');
  const row = y < 0 ? (y < -HALF_HEIGHT / 2 ? 'D' : 'C') : (y < HALF_HEIGHT / 2 ? 'B' : 'A');
  return `${row}-${col}`;
}
