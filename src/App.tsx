import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Bot, Check, ChevronRight, Copy, Crown, Download, Drum, Eye, EyeOff, Heart, LockKeyhole, LogOut, MessageCircle, Pencil, Plus, RefreshCw, Send, Settings2, UserRound, Users, Volume2, VolumeX, Wifi, WifiOff, X } from 'lucide-react';
import { defaultSettings, type AcceptedAnswer, type ClientCommand, type DraftMatch, type LobbyRoom, type PlayerView, type Prompt, type RoomView, type Settings } from '../shared/types';
import { playerAngle } from '../shared/player-layout';
import { ConnectionError, useGameConnection } from './network';
import { conditionLabels, SettingsEditor } from './SettingsEditor';
import { PromptView } from './PromptView';
import { useTimedMessage } from './useTimedMessage';
import { GameAudio } from './audio';
import { DrumTransfer } from './DrumTransfer';
import { modeColors, modeLabels } from '../shared/presets';
import { correctionMessage } from '../shared/word-corrections';
import { useAnswerVisibility } from './useAnswerVisibility';
import {resolveBonusType} from '../shared/bonuses';
import {bonusLabels} from '../shared/bonus-candidates';

const phaseLabels: Record<RoomView['phase'], string> = { waiting: '准备中', playing: '正在游戏', between: '本局结束', finished: '比赛结束' };
const connectionLabels = { idle: '未连接', connecting: '正在连接', connected: '已连接', reconnecting: '正在重连' };
function defaultWebSocketUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}
const initialUrl = defaultWebSocketUrl();
const initialNickname = localStorage.getItem('chuan-zi:nickname') || '无名';
function confirmedAnswer(value: string, maxLength: number) {
  return [...value].filter(character => /\p{Script=Han}/u.test(character)).slice(0, maxLength).join('');
}

function IconButton({ label, children, onClick, disabled = false, className = '' }: {
  label: string; children: ReactNode; onClick: () => void; disabled?: boolean; className?: string;
}) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Modal({ title, children, onClose, error = '', showHeading = true, drawer = false, allowInteraction = false }: { title: string; children: ReactNode; onClose: () => void; error?: string; showHeading?: boolean; drawer?: boolean; allowInteraction?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (!allowInteraction) panel.current?.querySelector<HTMLElement>('input, button, select')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (allowInteraction || event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [allowInteraction, onClose]);
  return <div className={`modal-backdrop ${drawer ? 'modal-backdrop-drawer' : ''} ${allowInteraction ? 'modal-backdrop-passthrough' : ''}`} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`modal ${drawer ? 'modal-drawer' : ''}`} role="dialog" aria-modal={allowInteraction ? 'false' : 'true'} aria-label={title} ref={panel}>
      {showHeading && <div className="modal-heading"><h2>{title}</h2><IconButton label="关闭窗口" onClick={onClose}><X size={20} /></IconButton></div>}
      {error && <p className="modal-error" role="alert">{error}</p>}
      {children}
    </div>
  </div>;
}

function DrumMark({ size = 34 }: { size?: number }) {
  return <Drum size={size} strokeWidth={1.5} aria-hidden="true" className="drum-mark" />;
}

export default function App() {
  const url = initialUrl;
  const [nickname, setNickname] = useState(initialNickname);
  const connection = useGameConnection(url, nickname);
  const [modal, setModal] = useState<'connection' | 'join' | 'rename' | 'metadata' | 'licenses' | null>(null);
  const [error, setError] = useTimedMessage();
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState<{ code: string; name?: string } | null>(null);
  const [settings, setSettings] = useState<Settings>(() => structuredClone(defaultSettings));
  const [preview, setPreview] = useState<Prompt | null>(null);
  const [roomTab, setRoomTab] = useState<'game' | 'settings'>('game');
  const roomParamHandled = useRef('');
  const previousRoomId = useRef<string | null>(null);
  const room = connection.room;
  const self = room?.players.find(player => player.id === connection.playerId);
  const isHost = room?.hostId === connection.playerId;
  const connected = connection.status === 'connected';
  const settingsSignature = room ? JSON.stringify(room.settings) : '';

  useEffect(() => { setError(''); }, [connection.responseRevision, setError]);

  useEffect(() => {
    if (room) { setSettings(structuredClone(room.settings)); setPreview(null); }
  }, [settingsSignature, room?.id]);

  useEffect(() => {
    if (room) {
      const address = new URL(location.href);
      address.searchParams.set('room', room.roomPinyin);
      history.replaceState(null, '', address);
      setModal(null);
      roomParamHandled.current = room.roomPinyin;
      previousRoomId.current = room.id;
    } else if (previousRoomId.current) {
      const address = new URL(location.href);
      address.searchParams.delete('room');
      history.replaceState(null, '', address);
      previousRoomId.current = null;
      roomParamHandled.current = '';
      setRoomTab('game');
    }
  }, [room?.id]);

  const act = useCallback(async <T,>(command: ClientCommand, done?: (result: T) => void, failed?: (error: ConnectionError) => void) => {
    setError('');
    setBusy(true);
    try {
      const result = await connection.send<T>(command);
      done?.(result);
    } catch (failure) {
      if (!(failure instanceof ConnectionError)) throw failure;
      if (failed) failed(failure);
      else setError(failure.message);
    } finally { setBusy(false); }
  }, [connection.send]);

  useEffect(() => {
    if (!connected || !connection.lobbyReady || room) return;
    const code = new URLSearchParams(location.search).get('room');
    if (!code || roomParamHandled.current === code) return;
    roomParamHandled.current = code;
    setJoining({ code });
    act({ type: 'joinByCode', data: { code, password: '' } }, undefined, failure => {
      if (failure.message === '房间密码不正确') setModal('join');
      else setError(failure.message);
    });
  }, [connected, connection.lobbyReady, room, act]);

  const closeModal = useCallback(() => setModal(null), []);
  const join = (target: LobbyRoom) => {
    if (target.protected) { setError(''); setJoining({ code: target.roomPinyin, name: target.name }); setModal('join'); }
    else act({ type: 'joinByCode', data: { code: target.roomPinyin, password: '' } });
  };
  const previewSettings = () => act<Prompt>({ type: 'preview', data: { settings } }, result => setPreview(result));
  const leave = () => act({ type: 'leave', data: {} }, () => {
    history.replaceState(null, '', location.pathname);
    roomParamHandled.current = '';
    setRoomTab('game');
    setModal(null);
    setJoining(null);
  });

  return <div className={`app-shell ${room && roomTab === 'game' ? 'room-game-shell' : ''}`}>
    <header className="site-header"><a className="brand" href="#" onClick={event => { if (room) event.preventDefault(); }}><DrumMark /><span>击鼓传字</span></a>
      <div className="header-tools"><button type="button" className="connection-button" onClick={() => setModal('connection')}>
        {connected ? <Wifi size={16} /> : <WifiOff size={16} />}<span>{connectionLabels[connection.status]}</span>
      </button><span className="header-nickname"><UserRound size={15} />{nickname}</span><IconButton label="连接与昵称" onClick={() => setModal('connection')}><Settings2 size={19} /></IconButton></div>
    </header>
    {((error && modal !== 'join' && modal !== 'metadata') || connection.notice) && <div className="notice-banner notice-error" role="alert">
      <span>{error || connection.notice}</span><IconButton label="关闭消息" onClick={() => { setError(''); connection.dismissNotice(); }}><X size={16} /></IconButton>
    </div>}
    {room ? <main className="room-page">
      <div className="room-heading"><div><button type="button" className="back-button" onClick={leave} disabled={busy}><ArrowLeft size={15} />大厅</button>
        <h1>{room.name}{room.protected && <LockKeyhole size={18} />}{isHost && <IconButton label="修改房间名称" onClick={() => setModal('metadata')}><Pencil size={15} /></IconButton>}</h1>
      </div><div className="room-heading-tools"><IconButton label="复制邀请链接" onClick={() => {
        navigator.clipboard.writeText(location.href).catch(failure => setError(failure.message));
      }}><Copy size={19} /></IconButton><IconButton label="离开房间" onClick={leave} disabled={busy}><LogOut size={19} /></IconButton></div></div>
      <div className="room-tabs" role="tablist"><button type="button" role="tab" aria-selected={roomTab === 'game'} onClick={() => setRoomTab('game')}>游戏</button>
        <button type="button" role="tab" aria-selected={roomTab === 'settings'} onClick={() => setRoomTab('settings')}>规则设置</button></div>
      {roomTab === 'game' ? <RoomGame room={room} self={self} isHost={Boolean(isHost)} busy={busy} connected={connected} act={act} send={connection.send} setError={setError} />
        : <div className="room-settings-layout"><SettingsEditor value={settings} onChange={next => { setSettings(next); setPreview(null); }} disabled={!isHost || room.phase === 'playing'}
          fixedBestOf={room.phase === 'between'} preview={preview} busy={busy} onPreview={previewSettings}
          onSave={isHost ? (next, onSaved) => act({ type: 'settings', data: { settings: next } }, onSaved) : undefined} />
          <label className="visibility-setting"><input type="checkbox" aria-label="在大厅展示" checked={room.listed} disabled={!isHost || busy || !connected} onChange={event => act({ type: 'visibility', data: { listed: event.target.checked } })} />{room.listed ? <><Eye size={14} />在大厅展示</> : <><EyeOff size={14} />大厅隐藏</>}</label></div>}
    </main> : <main className="lobby-page"><div className="page-heading"><div><span className="eyebrow">击鼓传字</span><h1>游戏大厅</h1></div>
      <div className="page-heading-actions"><button type="button" className="primary-button" disabled={!connected || busy} onClick={() => act({ type: 'create', data: { name: '', password: '', listed: true, settings: structuredClone(defaultSettings) } })}><Plus size={18} />创建房间</button></div></div>
      <div className="lobby-toolbar"><span>{connection.rooms.length} 个房间</span><span className="muted">最新创建</span><IconButton label="重新连接" onClick={connection.reconnect}><RefreshCw size={16} /></IconButton></div>
      <div className="lobby-cards">
        {connection.rooms.length ? connection.rooms.map(target => <button type="button" className="lobby-room" key={target.id} style={{ '--mode-color': modeColors[target.mode] } as CSSProperties} disabled={!connected || busy || target.playerCount >= target.maxPlayers} onClick={() => join(target)}>
          <span className="lobby-room-name"><span>{target.name}{target.protected && <LockKeyhole size={14} />}</span></span>
          <span className="lobby-conditions"><span className="lobby-mode-tag">{modeLabels[target.mode]}</span><span>{target.dictionary === 'idioms' ? '成语' : target.dictionary === 'words' ? '普通词语' : '全部词语'}</span>{target.conditions.map(type => <span key={type}>{conditionLabels[type]}</span>)}</span>
          <span className="lobby-people"><Users size={15} />{target.playerCount}<span className="muted">/ {target.maxPlayers}</span></span>
          <span className="lobby-phase">{phaseLabels[target.phase]}</span><ChevronRight size={18} />
        </button>) : <div className="empty-lobby"><DrumMark size={66} /><p>{connected ? '暂时没有房间' : connection.status === 'idle' ? '联机服务尚未设置' : '正在连接大厅'}</p>
          {connected ? <button type="button" className="secondary-button" onClick={() => act({ type: 'create', data: { name: '', password: '', listed: true, settings: structuredClone(defaultSettings) } })}><Plus size={16} />创建房间</button>
            : <button type="button" className="secondary-button" onClick={connection.reconnect}><RefreshCw size={16} />重新连接</button>}</div>}
      </div>
    </main>}
    {!room && <footer className="site-footer"><button type="button" onClick={() => setModal('licenses')}>数据与许可</button></footer>}
    {modal === 'connection' && <Modal title="昵称设置" onClose={closeModal}><ConnectionForm nickname={nickname} onApply={nextNickname => {
      localStorage.setItem('chuan-zi:nickname', nextNickname);
      setNickname(nextNickname); setModal(null);
    }} /></Modal>}
    {modal === 'join' && joining && !room && <Modal title={joining.name || '加入房间'} onClose={closeModal} error={error}><JoinForm busy={busy} onJoin={password =>
      act({ type: 'joinByCode', data: { code: joining.code, password } })} /></Modal>}
    {modal === 'metadata' && room && <Modal title="房间设置" onClose={closeModal} error={error}><MetadataForm name={room.name} listed={room.listed} busy={busy} onSave={(name, listed, password) => act({ type: 'metadata', data: { name, listed, password } }, () => setModal(null))} /></Modal>}
    {modal === 'licenses' && <Modal title="数据与许可" onClose={closeModal}><div className="license-list"><p>成语候选与文档频次：THUOCL · MIT</p>
      <p>普通词语与读音：CC-CEDICT · CC BY-SA 4.0</p><p>电脑常见程度：jieba · MIT</p><p>部首：Unicode Unihan · Unicode License v3</p>
      <p>字形部件：Make Me a Hanzi · LGPL</p><p>界面图标：Lucide · ISC</p>
      <a href={`${import.meta.env.BASE_URL}licenses.html`} target="_blank" rel="noreferrer">完整来源与许可<ArrowRight size={15} /></a></div></Modal>}
  </div>;
}

function ConnectionForm({ nickname, onApply }: { nickname: string; onApply: (nickname: string) => void }) {
  const [draftNickname, setDraftNickname] = useState(nickname);
  const [error, setError] = useState('');
  return <form className="dialog-form" onSubmit={event => {
    event.preventDefault();
    if (!draftNickname.trim()) { setError('请输入昵称'); return; }
    onApply(draftNickname.trim());
  }}><label>昵称<input value={draftNickname} onChange={event => setDraftNickname(event.target.value)} maxLength={20} autoComplete="nickname" required /></label>
    {error && <p className="field-error" role="alert">{error}</p>}<button className="primary-button" type="submit"><Check size={17} />保存昵称</button>
  </form>;
}

function JoinForm({ busy, onJoin }: { busy: boolean; onJoin: (password: string) => void }) {
  const [password, setPassword] = useState('');
  return <form className="dialog-form" onSubmit={event => { event.preventDefault(); onJoin(password); }}><label>房间密码<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></label>
    <button className="primary-button" type="submit" disabled={busy}><ArrowRight size={17} />加入房间</button></form>;
}

function MetadataForm({ name, listed, busy, onSave }: { name: string; listed: boolean; busy: boolean; onSave: (name: string, listed: boolean, password: string) => void }) {
  const [draftName, setDraftName] = useState(name);
  const [draftListed, setDraftListed] = useState(listed);
  const [password, setPassword] = useState('');
  return <form className="dialog-form" onSubmit={event => { event.preventDefault(); if (draftName.trim()) onSave(draftName.trim(), draftListed, password); }}>
    <label>房间名称<input value={draftName} onChange={event => setDraftName(event.target.value)} maxLength={40} required /></label>
    <label>房间密码<input type="password" value={password} onChange={event => setPassword(event.target.value)} maxLength={100} autoComplete="new-password" placeholder="留空表示不修改" /></label>
    <label className="checkbox-field"><input type="checkbox" checked={draftListed} onChange={event => setDraftListed(event.target.checked)} />在大厅展示</label>
    <button className="primary-button" type="submit" disabled={busy || !draftName.trim()}><SaveIcon />保存房间设置</button>
  </form>;
}

function SaveIcon() { return <Check size={17} />; }

type Act = <T = unknown>(command: ClientCommand, done?: (result: T) => void, failed?: (error: ConnectionError) => void) => Promise<void>;
function PlayerTopology({ room, self, isHost, busy, connected, act, seconds }: {
  room: RoomView; self?: PlayerView; isHost: boolean; busy: boolean; connected: boolean; act: Act; seconds: number;
}) {
  const topology = useRef<HTMLDivElement>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [layout, setLayout] = useState({ width: 500, height: 160, avatarSize: 48 });
  const canAddCpu = isHost && room.phase !== 'playing' && !room.players.some(player => player.cpu);
  const count = Math.max(2, room.players.length + (canAddCpu ? 1 : 0));
  const dense = count > 8;
  useLayoutEffect(() => {
    const root = topology.current!;
    const measure = () => {
      const size = root.querySelector('.topology-avatar')!.getBoundingClientRect().width;
      const next = { width: root.clientWidth, height: root.clientHeight, avatarSize: size };
      setLayout(value => JSON.stringify(value) === JSON.stringify(next) ? value : next);
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(root);
    return () => observer.disconnect();
  }, [count]);
  const radius = count === 2 ? Math.max(35, layout.width * .36) : count >= 8
    ? Math.min(layout.width / 2 - 18, Math.max(92, layout.height / 2 - 65))
    : Math.max(45, Math.min(layout.width / 2 - 32, layout.height / 2 - 55));
  const [accepted, setAccepted] = useState<AcceptedAnswer | null>(null);
  const lastAccepted = useRef(room.acceptedAnswer?.id);
  useEffect(() => {
    if (!room.acceptedAnswer || room.acceptedAnswer.id === lastAccepted.current) return;
    lastAccepted.current = room.acceptedAnswer.id;
    setAccepted(room.acceptedAnswer);
    const timer = setTimeout(() => setAccepted(null), 1400);
    return () => clearTimeout(timer);
  }, [room.acceptedAnswer?.id]);
  useEffect(() => { setMenuId(null); }, [room.phase]);
  return <section className={`topology-area ${count > 2 ? 'topology-area-many' : ''} ${dense ? 'topology-area-dense' : ''}`} aria-label="玩家拓扑图">
    <div ref={topology} className={`player-topology ${count > 2 ? 'player-topology-many' : ''} ${dense ? 'player-topology-dense' : ''}`}>
        <DrumTransfer topology={topology} room={room} />
        {room.players.map((player, index) => {
          const angle = playerAngle(index, count);
          const left = layout.width / 2 + Math.cos(angle) * radius;
          const top = layout.height / 2 + Math.sin(angle) * radius - layout.avatarSize / 2;
          const manageable = isHost && player.id !== self?.id;
          const lives = room.phase === 'waiting' ? room.settings.startingLives : player.lives;
          return <div data-player-id={player.id} className={`topology-player ${menuId === player.id ? 'topology-player-menu' : ''} ${player.id === room.currentPlayerId ? 'topology-player-current' : ''} ${!player.online ? 'topology-player-disconnected' : ''}`} style={{left: `${left}px`, top: `${top}px`, '--player-color': player.color} as CSSProperties} key={player.id}>
            {accepted?.playerId === player.id && <div className="topology-answer" aria-label={`${player.nickname}的正确答案`}><PromptView prompt={accepted.prompt} draft={accepted.word} draftMatch={accepted.match} supplementColor={accepted.color} settled /></div>}
            <button type="button" className={`topology-avatar ${player.ready ? 'topology-avatar-ready' : ''}`} aria-label={`${player.nickname}${manageable ? '，玩家管理' : ''}`} title={manageable ? '玩家管理' : player.nickname} aria-expanded={manageable ? menuId === player.id : undefined} disabled={!manageable} onClick={() => setMenuId(menuId === player.id ? null : player.id)}>
              {player.cpu ? <Bot size={25} /> : <UserRound size={25} />}
            </button><span>{player.nickname}</span>
            {player.role === 'spectator' ? <small>观战</small> : <div className={`topology-lives ${lives <= 5 ? 'topology-lives-single' : ''}`} aria-label={`生命 ${lives}`}>
              {dense ? <><Heart size={11} fill="currentColor" /><span>{lives}</span></> : Array.from({ length: lives }, (_, heart) => <Heart size={12} fill="currentColor" key={heart} />)}
            </div>}
            {manageable && menuId === player.id && <div className="topology-controls">
              {player.cpu ? <IconButton label="移除电脑" disabled={busy || room.phase === 'playing'} onClick={() => act({ type: 'removeCpu', data: {} })}><X size={13} /></IconButton> : <>
                <IconButton label={`转移房主给 ${player.nickname}`} disabled={busy} onClick={() => act({ type: 'transfer', data: { playerId: player.id } })}><Crown size={13} /></IconButton>
                <IconButton label={`移除 ${player.nickname}`} disabled={busy} onClick={() => act({ type: 'kick', data: { playerId: player.id } })}><X size={13} /></IconButton>
              </>}
            </div>}
          </div>;
        })}
        {canAddCpu && <button type="button" className="topology-add" style={{left: `${layout.width / 2 + Math.cos(playerAngle(room.players.length, count)) * radius}px`, top: `${layout.height / 2 + Math.sin(playerAngle(room.players.length, count)) * radius - layout.avatarSize / 2}px`}} aria-label="添加电脑" disabled={busy || !connected} onClick={() => act({ type: 'addCpu', data: {} })}>
          <span className="topology-avatar"><Plus size={24} /></span><span>添加电脑</span>
        </button>}
        <div className="topology-center"><span className={room.phase === 'playing' ? 'drum-beat' : ''} style={{ '--beat-duration': `${seconds <= 3 ? .3 : seconds <= 5 ? .5 : seconds <= 10 ? .85 : 1.4}s` } as CSSProperties}><DrumMark size={46} /></span></div>
    </div>
  </section>;
}

function RoomGame({ room, self, isHost, busy, connected, act, send, setError }: {
  room: RoomView; self?: PlayerView; isHost: boolean; busy: boolean; connected: boolean; act: Act;
  send: <T = unknown>(command: ClientCommand) => Promise<T>; setError: (message: string) => void;
}) {
  const [word, setWord] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [draftMatch, setDraftMatch] = useState<DraftMatch>({ word: '', promptId: null, offset: null });
  const [feedback, setFeedback] = useState(false);
  const [answerMessage, setAnswerMessage] = useState('');
  const answerMessageTimer = useRef<number | null>(null);
  const clearAnswerMessage = useCallback(() => {
    if (answerMessageTimer.current !== null) window.clearTimeout(answerMessageTimer.current);
    answerMessageTimer.current = null;
    setAnswerMessage('');
  }, []);
  useEffect(() => () => { if (answerMessageTimer.current !== null) window.clearTimeout(answerMessageTimer.current); }, []);
  const [chat, setChat] = useState('');
  const [now, setNow] = useState(Date.now());
  const composing = useRef(false);
  const confirmingEnter = useRef(false);
  const chatComposing = useRef(false);
  const chatComposedAt = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const answerRegion = useRef<HTMLDivElement>(null);
  const pendingSelection = useRef<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [completion, setCompletion] = useState<{ answer: AcceptedAnswer; returning: boolean } | null>(null);
  const lastCompletion = useRef(room.acceptedAnswer?.id);
  useLayoutEffect(() => {
    const answer = room.acceptedAnswer;
    if (!answer || answer.id === lastCompletion.current) return;
    lastCompletion.current = answer.id;
    if (room.currentPlayerId === self?.id) setCompletion(null);
    else setCompletion({ answer, returning: false });
  }, [room.acceptedAnswer?.id]);
  useEffect(() => {
    if (!completion?.returning) return;
    const timer = setTimeout(() => setCompletion(null), 700);
    return () => clearTimeout(timer);
  }, [completion?.answer.id, completion?.returning]);
  const finishCombined = useCallback(() => setCompletion(value => value ? { ...value, returning: true } : value), []);
  const audio = useMemo(() => new GameAudio(`${import.meta.env.BASE_URL}audio/chuan-zi-drum.wav`), []);
  const [audioEnabled, setAudioEnabled] = useState(() => audio.isEnabled());
  const previousRoom = useRef<{ currentPlayerId: string | null; historyLength: number; lives: Record<string, number>; phase: RoomView['phase'] }>({ currentPlayerId: room.currentPlayerId, historyLength: room.history.length, lives: Object.fromEntries(room.players.map(player => [player.id, player.lives])), phase: room.phase });
  const countdownSecond = useRef<number | null>(null);
  useEffect(() => () => audio.dispose(), [audio]);
  useEffect(() => {
    const unlock = () => { void audio.unlock(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [audio]);
  useLayoutEffect(() => {
    if (pendingSelection.current === null || !input.current) return;
    input.current.setSelectionRange(pendingSelection.current, pendingSelection.current);
    pendingSelection.current = null;
  });
  const updateAnswer = (target: HTMLInputElement) => {
    clearAnswerMessage();
    const confirmed = confirmedAnswer(target.value, room.settings.maxLength);
    const position = confirmedAnswer(target.value.slice(0, target.selectionStart ?? target.value.length), room.settings.maxLength).length;
    pendingSelection.current = position;
    setCursor([...confirmed.slice(0, position)].length);
    setInputValue(confirmed); setWord(confirmed);
  };
  const selectCharacter = (index: number) => {
    if (!isTurn || composing.current) return;
    const position = [...word].slice(0, index).join('').length;
    input.current?.focus({ preventScroll: true });
    input.current?.setSelectionRange(position, position);
    setCursor(index);
    revealAnswer();
  };
  const chatList = useRef<HTMLDivElement>(null);
  const historyList = useRef<HTMLDivElement>(null);
  const [sideTab, setSideTab] = useState<'history' | 'chat'>('history');
  const [narrowViewport, setNarrowViewport] = useState(() => matchMedia('(max-width: 1000px)').matches);
  const [activityOpen, setActivityOpen] = useState(false);
  const closeActivity = useCallback(() => setActivityOpen(false), []);
  useEffect(() => {
    const query = matchMedia('(max-width: 1000px)');
    const update = () => setNarrowViewport(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const isTurn = room.phase === 'playing' && self?.id === room.currentPlayerId && self.role === 'player';
  const canEdit = isTurn && connected;
  const revealAnswer = useAnswerVisibility(answerRegion, input, canEdit);
  const deadlineOffset = room.serverTime - Date.now();
  const serverOffset = useRef(deadlineOffset);
  useEffect(() => { serverOffset.current = room.serverTime - Date.now(); }, [room.serverTime]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(timer); }, []);
  const seconds = room.deadline === null ? 0 : Math.max(0, (room.deadline - now - serverOffset.current) / 1000);
  const initial = room.settings.timerMode === 'fixed' ? room.settings.initialSeconds : room.settings.randomMaxSeconds;
  useEffect(() => {
    const previous = previousRoom.current;
    const lives = Object.fromEntries(room.players.map(player => [player.id, player.lives]));
    const timeout = previous.phase === 'playing' && room.players.some(player => player.lives < (previous.lives[player.id] ?? player.lives));
    if (timeout) audio.play('timeout');
    else if (room.phase === 'playing') {
      if (room.currentPlayerId && room.currentPlayerId !== previous.currentPlayerId) audio.play('turn');
      else if (room.history.length > previous.historyLength) audio.play('correct');
    }
    previousRoom.current = { currentPlayerId: room.currentPlayerId, historyLength: room.history.length, lives, phase: room.phase };
  }, [audio, room.currentPlayerId, room.history.length, room.phase, room.players]);
  useEffect(() => {
    const second = Math.ceil(seconds);
    if (room.phase !== 'playing') { countdownSecond.current = null; return; }
    if (second <= 5 && second > 0 && countdownSecond.current !== second) {
      countdownSecond.current = second;
      audio.play('countdown');
    }
  }, [audio, room.phase, seconds]);
  useEffect(() => { setWord(''); setInputValue(''); setCursor(0); setDraftMatch({ word: '', promptId: room.prompt?.id ?? null, offset: null }); setFeedback(false); composing.current = false; }, [room.prompt?.id, isTurn]);
  useLayoutEffect(() => {
    if (canEdit) input.current?.focus({ preventScroll: true });
  }, [canEdit, room.prompt?.id]);
  useEffect(clearAnswerMessage, [clearAnswerMessage, room.prompt?.id, isTurn]);
  const duplicateWord = isTurn && room.history.some(item => item.word === word);
  const wordCorrection = isTurn ? correctionMessage(word) : undefined;
  useEffect(() => {
    if (!duplicateWord) return;
    clearAnswerMessage();
    setAnswerMessage('这个词之前输入过了');
  }, [duplicateWord, clearAnswerMessage]);
  useEffect(() => {
    if (!isTurn || !connected) return;
    let current = true;
    const timer = setTimeout(() => { send<DraftMatch>({ type: 'draft', data: { word, promptId: room.prompt?.id } }).then(result => { if (current) setDraftMatch(result); }, failure => { if (current && !/当前回合|提示已经更新|时间已经结束/.test(failure.message)) setError(failure.message); }); }, 0);
    return () => { current = false; clearTimeout(timer); };
  }, [word, isTurn, connected, send, setError]);
  useEffect(() => { chatList.current?.scrollTo({ top: chatList.current.scrollHeight }); }, [room.chat.length, sideTab]);
  useEffect(() => { historyList.current?.scrollTo({ top: historyList.current.scrollHeight }); }, [room.history.length]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed = confirmedAnswer(input.current?.value ?? word, room.settings.maxLength);
    if (composing.current || !room.prompt || !isTurn || !confirmed.trim()) return;
    act({ type: 'submit', data: { word: confirmed.trim(), promptId: room.prompt.id } }, () => { setWord(''); setInputValue(''); }, failure => {
      if (/答案|词库|提示|重复|长度|当前回合|时间|写作/.test(failure.message)) {
        if (failure.message === '本局已经使用这个答案') {
          clearAnswerMessage();
          setAnswerMessage('这个词之前输入过了');
          answerMessageTimer.current = window.setTimeout(clearAnswerMessage, 2600);
        } else if (failure.message.includes('应写作')) {
          clearAnswerMessage();
          setAnswerMessage(failure.message);
          answerMessageTimer.current = window.setTimeout(clearAnswerMessage, 2600);
        }
        audio.play('incorrect');
        setFeedback(true);
        window.setTimeout(() => setFeedback(false), 360);
      } else setError(failure.message);
    });
  };
  const lastWinner = room.players.find(player => player.id === room.lastWinnerId);
  const winners = room.players.filter(player => room.winnerIds.includes(player.id));
  const currentPlayer = room.players.find(player => player.id === room.currentPlayerId);
  const pendingAccepted = room.acceptedAnswer && room.acceptedAnswer.id !== lastCompletion.current && !isTurn ? { answer: room.acceptedAnswer, returning: false } : null;
  const activeCompletion = isTurn ? null : pendingAccepted ?? completion;
  const combiningAnswer = activeCompletion && !activeCompletion.returning ? activeCompletion.answer : null;
  const shownPrompt = combiningAnswer?.prompt ?? room.prompt;
  const shownWord = combiningAnswer ? combiningAnswer.word : isTurn ? word : currentPlayer?.draft ?? '';
  const shownMatch = combiningAnswer ? combiningAnswer.match : isTurn ? draftMatch : room.draftMatch ?? undefined;
  const inputColor = combiningAnswer?.color ?? currentPlayer?.color ?? self?.color ?? '#47738A';
  const activity = <aside className="activity-area"><div className="activity-tabs" role="tablist"><button role="tab" type="button" aria-selected={sideTab === 'history'} onClick={() => setSideTab('history')}>答案记录<span>{room.history.length}</span></button>
    <button role="tab" type="button" aria-selected={sideTab === 'chat'} onClick={() => setSideTab('chat')}><MessageCircle size={16} />聊天</button>
    {narrowViewport && <IconButton label="关闭记录与聊天" onClick={closeActivity}><X size={18} /></IconButton>}</div>
    {sideTab === 'history' ? <div className="history-list" ref={historyList}>{room.history.length ? room.history.map((item, index) => <div className="history-row" key={`${item.at}:${index}`}>
      <span>{item.word}</span><small>{item.nickname}</small></div>) : <p className="activity-empty">暂无答案</p>}</div>
      : <><div className="chat-list" ref={chatList}>{room.chat.length ? room.chat.map(message => <div className="chat-message" key={message.id}>
        <div><span>{message.nickname}</span><time>{new Date(message.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></div><p>{message.text}</p>
      </div>) : <p className="activity-empty">暂无消息</p>}</div><form className="chat-form" onSubmit={event => {
        event.preventDefault();
        if (chatComposing.current || Date.now() - chatComposedAt.current < 120) return;
        if (chat.trim()) act({ type: 'chat', data: { text: chat.trim() } }, () => setChat(''));
      }}>
        <input aria-label="聊天消息" value={chat} maxLength={300} onChange={event => setChat(event.target.value)} placeholder="发送消息" disabled={!connected}
          onCompositionStart={() => { chatComposing.current = true; }} onCompositionEnd={() => { chatComposing.current = false; chatComposedAt.current = Date.now(); }}
          onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || chatComposing.current || event.keyCode === 229 || Date.now() - chatComposedAt.current < 120)) event.preventDefault(); }} />
        <button type="submit" aria-label="发送消息" title="发送消息" disabled={!chat.trim() || busy || !connected}><Send size={16} /></button></form></>}
  </aside>;
  return <div className={`room-layout room-layout-centered ${room.players.length > 2 ? 'room-layout-many' : ''} ${room.players.length > 8 ? 'room-layout-dense' : ''}`}>
    <section className="game-area"><div className="game-summary"><span aria-label="比赛局数">第 {room.round || 1} 局 / {room.settings.bestOf} 局</span>
      <div className="game-summary-tools">
        <IconButton label={audioEnabled ? '静音' : '打开音效'} onClick={() => { const enabled = !audioEnabled; setAudioEnabled(enabled); audio.setEnabled(enabled); if (enabled) audio.play('turn'); }}>{audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</IconButton>
        {narrowViewport && <IconButton label="查看答案记录与聊天" onClick={() => setActivityOpen(true)}><MessageCircle size={19} /></IconButton>}
      </div></div>
      <PlayerTopology room={room} self={self} isHost={isHost} busy={busy} connected={connected} act={act} seconds={seconds} />
      {(room.phase === 'playing' || activeCompletion) && shownPrompt ? <>
        <div className="answer-region" ref={answerRegion}><div className="timer-area"><div className={`timer ${seconds <= 5 ? 'timer-urgent' : ''}`} aria-label="剩余时间"><span>{seconds.toFixed(1)}</span><small>秒</small></div>
          <div className="timer-track"><span style={{ width: `${Math.min(100, seconds / initial * 100)}%` }} /></div></div>
        <form className={`answer-form ${isTurn ? 'answer-active' : 'answer-watching'}`} style={{ '--player-color': inputColor } as CSSProperties} onSubmit={submit}>
          <PromptView prompt={shownPrompt} draft={shownWord} draftMatch={shownMatch} supplementColor={inputColor} returnFrom={isTurn ? room.acceptedAnswer ?? undefined : undefined} submitting={Boolean(activeCompletion && !activeCompletion.returning)} onCombined={finishCombined} feedback={feedback} maxLength={room.settings.maxLength} cursor={cursor} focused={isTurn && inputFocused} onSelectCharacter={selectCharacter} answerInput={<input ref={input} aria-label="输入答案" value={isTurn ? inputValue : shownWord} autoComplete="off" autoCorrect="off" spellCheck={false}
          disabled={!canEdit}
          onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
          onSelect={event => { if (!composing.current) setCursor([...event.currentTarget.value.slice(0, event.currentTarget.selectionStart ?? 0)].length); }}
          onChange={event => {
            if (composing.current) { setInputValue(event.target.value); return; }
            updateAnswer(event.target);
          }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={event => {
            composing.current = false;
            updateAnswer(event.currentTarget);
          }}
          onKeyDown={event => {
            if (event.key !== 'Enter') return;
            if (event.nativeEvent.isComposing || composing.current || event.keyCode === 229 || confirmingEnter.current) {confirmingEnter.current = true; event.preventDefault();}
          }} onKeyUp={event => {if (event.key === 'Enter' || event.keyCode === 229) confirmingEnter.current = false;}} />} />
          <button type="submit" className="submit-button" title="提交答案" aria-label="提交答案" disabled={!isTurn || !connected || busy || !word.trim()}><ArrowRight size={23} /></button>
          <div className="answer-message" role="status" aria-live="polite">{duplicateWord ? '这个词之前输入过了' : wordCorrection ?? answerMessage}</div>
          {room.settings.minLength !== shownPrompt.cells.length && <div className="answer-length-hint">答案最短为 {room.settings.minLength} 个字</div>}
        </form>
        {self && resolveBonusType(room.settings) && <div className="bonus-progress"><div><span>奖励{bonusLabels[resolveBonusType(room.settings)!]}</span><Heart size={13} /></div><div className="bonus-letters">{self.bonusTargets.map(initial =>
          <span className={self.collected.includes(initial) ? 'bonus-collected' : ''} key={initial}>{initial}</span>)}</div></div>}</div>
      </> : <div className="waiting-stage">
        {room.phase === 'finished' ? <h2>{winners.length ? `${winners.map(player => player.nickname).join('、')} 获胜` : '比赛平局'}</h2>
          : room.phase === 'between' ? <h2>{lastWinner ? `${lastWinner.nickname} 获胜` : room.players.filter(player => player.role === 'player').every(player => player.lives === 0) ? '本局平局' : '本局中止'}</h2> : null}
        <div className="ready-actions">{self && <button type="button" className={self.ready ? 'secondary-button' : 'primary-button'} disabled={busy || !connected} onClick={() => act({ type: 'ready', data: { ready: !self.ready } })}>
          <Check size={17} />{self.ready ? '取消准备' : '准备'}</button>}
          {isHost && <button type="button" className="primary-button" disabled={busy || !connected || room.players.filter(player => player.ready && player.online).length < 2}
            onClick={() => act({ type: 'start', data: {} })}><ArrowRight size={17} />{room.phase === 'between' ? '开始下一局' : room.phase === 'finished' ? '开始新比赛' : '开始比赛'}</button>}</div>
      </div>}
    </section>
    {!narrowViewport && activity}
    {narrowViewport && activityOpen && <Modal title="答案记录与聊天" onClose={closeActivity} showHeading={false} drawer allowInteraction>{activity}</Modal>}
  </div>;
}
