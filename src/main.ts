import { Stage0 } from './scene/Stage0';

function init(): void {
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
  };

  function animate(): void {
    requestAnimationFrame(animate);
    stage.update();
  }

  animate();
  console.log('🚀 Proyecto Bacteria: Etapa 0 en ejecución.');
}

window.addEventListener('DOMContentLoaded', init);
