import { Stage0 } from './scene/Stage0';

function init(): void {
  console.log('Iniciando Proyecto Bacteria...');
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas #game-canvas no encontrado.');
    return;
  }

  // Elementos HUD de Telemetría
  const fpsEl = document.getElementById('fps-val');
  const wasmEl = document.getElementById('wasm-status');
  const coordsEl = document.getElementById('coords-val');
  const speedEl = document.getElementById('speed-val');
  const massEl = document.getElementById('mass-val');
  const scaleEl = document.getElementById('scale-val');

  try {
    const stage = new Stage0(canvas);

    stage.onTelemetryUpdate = (data) => {
      if (fpsEl) fpsEl.textContent = `${data.fps} FPS`;
      if (wasmEl) {
        wasmEl.textContent = data.wasmReady ? 'Activo (60 Hz)' : 'Inicializando...';
        wasmEl.style.color = data.wasmReady ? '#10b981' : '#f59e0b';
      }
      if (coordsEl) {
        coordsEl.textContent = `(${data.mouseWorld.x.toFixed(1)}, ${data.mouseWorld.y.toFixed(1)})`;
      }
      if (speedEl) {
        speedEl.textContent = `${data.cellSpeed.toFixed(1)} u/s`;
      }
      if (massEl && data.cellMass !== undefined) {
        massEl.textContent = `${data.cellMass.toFixed(2)} μg`;
      }
      if (scaleEl && data.cellScale !== undefined) {
        scaleEl.textContent = `${data.cellScale.toFixed(2)}x`;
      }
    };

    function animate(): void {
      requestAnimationFrame(animate);
      stage.update();
    }

    animate();
    console.log('🚀 Proyecto Bacteria: Etapa 0 en ejecución.');
  } catch (err: unknown) {
    console.error('Error durante la inicialización de Stage0:', err);
    if (wasmEl) {
      const msg = err instanceof Error ? err.message : String(err);
      wasmEl.textContent = `Error: ${msg}`;
      wasmEl.style.color = '#ef4444';
    }
  }
}

// Ejecución segura sin importar si DOMContentLoaded ya ocurrió
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
