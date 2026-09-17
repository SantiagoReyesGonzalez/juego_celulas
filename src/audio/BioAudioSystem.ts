/**
 * BioAudioSystem: Motor de Audio Procedural Biológico (Web Audio API)
 * Genera sonido reactivo orgánico de alta fidelidad en tiempo real sin cargar
 * archivos de audio externos (0 ms de latencia, 0 KB de descarga).
 */
export class BioAudioSystem {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private masterGain: GainNode | null = null;
  private lastHeartbeatTime = 0;

  constructor() {
    // Inicialización perezosa (lazy) para cumplir con las políticas de autoplay de navegadores
    const initAudio = () => {
      this.ensureContext();
      window.removeEventListener('pointerdown', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('pointerdown', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Pop elástico y acuático al ingerir nutrientes o pellets
   */
  public playEatPop(pitchMultiplier = 1.0): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = (450 + Math.random() * 120) * pitchMultiplier;
    const endFreq = (160 + Math.random() * 40) * pitchMultiplier;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + 0.08);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Armónico brillante y cristalino al absorber perlas de péptidos o esporas curativas
   */
  public playHealChime(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // Acorde C Mayor biológico

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f * (1 + Math.random() * 0.02), now + idx * 0.03);

      gain.gain.setValueAtTime(0.001, now + idx * 0.03);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.03 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.36);
    });
  }

  /**
   * Woosh hidrodinámico con resonancia de fluido al activar el Sprint de Caza
   */
  public playSprintWoosh(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;

    // 1. Sub-grave de empuje
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, now);
    subOsc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    subGain.gain.setValueAtTime(0.35, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain!);

    subOsc.start(now);
    subOsc.stop(now + 0.36);

    // 2. Ruido filtrado de turbulencia tisular
    this.playFilteredNoise(0.28, 220, 850, 0.32);
  }

  /**
   * Crujido duro y seco de fractura mineral al impactar cristales de calcio (Apatita)
   */
  public playCrystalCrunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;

    // Componente metálico / resonante
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.15);

    // Estallido de esquirlas con ruido de alta frecuencia
    this.playFilteredNoise(0.4, 1800, 4200, 0.16);
  }

  /**
   * Impacto sordo, pesado y carnoso al golpear membranas, adipocitos o leucocitos
   */
  public playImpactThud(intensity = 1.0): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120 * intensity, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.18);

    gain.gain.setValueAtTime(Math.min(0.65, 0.45 * intensity), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.23);

    // Chasquido de contacto tisular
    this.playFilteredNoise(0.25 * intensity, 120, 450, 0.12);
  }

  /**
   * Detonación sorda y desgarro tisular al estallar un microorganismo o bio-estructura
   */
  public playLysisExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;

    // Sub-bass thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 0.45);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.5);

    // Estallido de fluido
    this.playFilteredNoise(0.5, 300, 1600, 0.38);
  }

  /**
   * Silbido ácido y chasquido al disparar toxinas ácidas con Recoil Boost
   */
  public playToxinSpit(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.10);

    gain.gain.setValueAtTime(0.20, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Latido cardíaco sordo y tenso cuando la salud cae por debajo del 30%
   */
  public updateHeartbeat(healthRatio: number, timeNow: number): void {
    if (healthRatio > 0.35 || healthRatio <= 0) return;

    // Intervalo de latidos más rápido cuanto menor sea la vida (de 0.8s a 0.4s)
    const interval = 0.4 + healthRatio * 1.2;
    if (timeNow - this.lastHeartbeatTime >= interval) {
      this.lastHeartbeatTime = timeNow;
      this.playDoubleHeartbeatPulse();
    }
  }

  private playDoubleHeartbeatPulse(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;

    // Golpe 1 (Lub)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, now);
    osc1.frequency.exponentialRampToValueAtTime(25, now + 0.12);
    gain1.gain.setValueAtTime(0.38, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(this.masterGain!);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Golpe 2 (Dub) a los 140ms
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(68, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(30, now + 0.28);
    gain2.gain.setValueAtTime(0.48, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    osc2.connect(gain2);
    gain2.connect(this.masterGain!);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.31);
  }

  /**
   * Fanfarria biológica ascendente con coro resonante al evolucionar de Tier
   */
  public playMutateSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.62);
    });
  }

  /**
   * Ruido blanco con filtro pasabanda para texturas de salpicadura y fluido
   */
  private playFilteredNoise(
    volume: number,
    filterStartFreq: number,
    filterEndFreq: number,
    duration: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.0;
    filter.frequency.setValueAtTime(filterStartFreq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterEndFreq), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + duration);
  }
}
