export type GameSound = 'turn' | 'correct' | 'incorrect' | 'countdown' | 'timeout';

const enabledKey = 'chuan-zi:audio-enabled';
const soundGains: Record<GameSound, number> = { turn: .5, correct: .38, incorrect: .32, countdown: .24, timeout: .4 };

function createContext(): AudioContext {
  const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('当前浏览器不支持 Web Audio API');
  return new AudioContextConstructor();
}

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private loading = new Map<GameSound, Promise<AudioBuffer>>();
  private current: { source: AudioBufferSourceNode; sound: GameSound } | null = null;
  private enabled = localStorage.getItem(enabledKey) !== 'false';

  constructor(private readonly drumUrl: string) {}

  isEnabled() { return this.enabled; }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem(enabledKey, String(enabled));
    if (this.master) this.master.gain.value = enabled ? 0.6 : 0;
    if (!enabled && this.current) { this.current.source.stop(); this.current = null; }
    if (enabled) void this.unlock();
  }

  async unlock() {
    if (!this.enabled) return;
    const context = this.ensureContext();
    await context.resume();
    if (!this.enabled || this.context !== context) return;
    await Promise.all((Object.keys(soundGains) as GameSound[]).map(sound => this.loadSound(context, sound)));
  }

  play(sound: GameSound) {
    if (!this.enabled) return;
    const context = this.ensureContext();
    context.resume().then(async () => {
      if (!this.enabled || this.context !== context) return;
      const buffer = await this.loadSound(context, sound);
      if (!this.enabled || this.context !== context) return;
      this.playRecording(context, buffer, sound);
    });
  }

  dispose() {
    if (this.context) void this.context.close();
    this.context = null;
    this.master = null;
    this.loading.clear();
    this.current = null;
  }

  private ensureContext() {
    if (this.context) return this.context;
    this.context = createContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.enabled ? 0.6 : 0;
    this.master.connect(this.context.destination);
    return this.context;
  }

  private loadSound(context: AudioContext, sound: GameSound) {
    const cached = this.loading.get(sound);
    if (cached) return cached;
    const url = sound === 'turn' ? this.drumUrl : this.drumUrl.replace('chuan-zi-drum.wav', `chuan-zi-${sound}.wav`);
    const loading = fetch(url).then(response => {
      if (!response.ok) throw new Error(`音效资源加载失败：${response.status}`);
      return response.arrayBuffer();
    }).then(data => context.decodeAudioData(data));
    this.loading.set(sound, loading);
    return loading;
  }

  private playRecording(context: AudioContext, buffer: AudioBuffer, sound: GameSound) {
    if (sound === 'countdown' && this.current && this.current.sound !== 'countdown') return;
    this.current?.source.stop();
    const master = this.master!;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = soundGains[sound];
    source.connect(gain).connect(master);
    this.current = { source, sound };
    source.onended = () => { if (this.current?.source === source) this.current = null; };
    source.start();
  }

}
