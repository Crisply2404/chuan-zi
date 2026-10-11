export type GameSound = 'turn' | 'correct' | 'incorrect' | 'countdown' | 'timeout';

const enabledKey = 'chuan-zi:audio-enabled';
const volumeKey = 'chuan-zi:audio-volume';

function clampVolume(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.22;
}

function createContext(): AudioContext {
  const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('当前浏览器不支持 Web Audio API');
  return new AudioContextConstructor();
}

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private drumLoading: Promise<AudioBuffer> | null = null;
  private enabled = localStorage.getItem(enabledKey) === 'true';
  private volume = clampVolume(Number(localStorage.getItem(volumeKey) ?? '0.22'));

  constructor(private readonly drumUrl: string) {}

  isEnabled() { return this.enabled; }
  getVolume() { return this.volume; }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem(enabledKey, String(enabled));
    if (enabled) this.ensureContext();
  }

  setVolume(volume: number) {
    this.volume = clampVolume(volume);
    localStorage.setItem(volumeKey, String(this.volume));
    if (this.master) this.master.gain.value = this.volume;
  }

  play(sound: GameSound) {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (sound === 'turn' || sound === 'timeout') {
      context.resume().then(async () => {
        this.playDrum(context, await this.loadDrum(), sound === 'timeout' ? 0.16 : 0.1);
        if (sound === 'timeout') this.playTone(context, 120, 0.1, 'triangle');
      });
      return;
    }
    context.resume().then(() => {
      if (sound === 'correct') this.playTone(context, 660, 0.09, 'sine');
      if (sound === 'incorrect') this.playTone(context, 180, 0.1, 'triangle');
      if (sound === 'countdown') this.playTone(context, 440, 0.06, 'sine');
    });
  }

  dispose() {
    if (this.context) void this.context.close();
    this.context = null;
    this.master = null;
  }

  private ensureContext() {
    if (this.context) return this.context;
    this.context = createContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);
    return this.context;
  }

  private loadDrum() {
    if (this.drumLoading) return this.drumLoading;
    const context = this.context!;
    this.drumLoading = fetch(this.drumUrl).then(response => {
      if (!response.ok) throw new Error(`鼓声资源加载失败：${response.status}`);
      return response.arrayBuffer();
    }).then(data => context.decodeAudioData(data));
    return this.drumLoading;
  }

  private playDrum(context: AudioContext, buffer: AudioBuffer, gainAmount: number) {
    const master = this.master!;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = gainAmount;
    source.connect(gain).connect(master);
    source.start();
  }

  private playTone(context: AudioContext, frequency: number, gainAmount: number, type: OscillatorType) {
    const master = this.master!;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.72), now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainAmount, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }
}
