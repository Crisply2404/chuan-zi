import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Bot, Check, ChevronRight, Copy, Crown, Download, Drum, Eye, EyeOff, Heart, LockKeyhole, LogOut, MessageCircle, Pencil, Plus, RefreshCw, Send, Settings2, Trophy, UserRound, Users, Wifi, WifiOff, X } from 'lucide-react';
import { defaultSettings, type ClientCommand, type LobbyRoom, type PlayerView, type Prompt, type RoomView, type Settings } from '../shared/types';
import { ConnectionError, useGameConnection } from './network';
import { conditionLabels, SettingsEditor } from './SettingsEditor';
import { PromptView } from './PromptView';

const phaseLabels: Record<RoomView['phase'], string> = { waiting: '等待开始', playing: '正在游戏', between: '局间准备', finished: '比赛结束' };
const connectionLabels = { idle: '未连接', connecting: '正在连接', connected: '已连接', reconnecting: '正在重连' };
const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const initialUrl = localStorage.getItem('chuan-zi:url') ?? (import.meta.env.VITE_WS_URL || (localHost ? 'ws://localhost:8787' : ''));
const initialNickname = localStorage.getItem('chuan-zi:nickname') || '无名';

function IconButton({ label, children, onClick, disabled = false, className = '' }: {
  label: string; children: ReactNode; onClick: () => void; disabled?: boolean; className?: string;
}) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Modal({ title, children, onClose, error = '' }: { title: string; children: ReactNode; onClose: () => void; error?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('input, button, select')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
      <div className="modal-heading"><h2>{title}</h2><IconButton label="关闭窗口" onClick={onClose}><X size={20} /></IconButton></div>
      {error && <p className="modal-error" role="alert">{error}</p>}
      {children}
    </div>
  </div>;
}

function DrumMark({ size = 34 }: { size?: number }) {
  return <Drum size={size} strokeWidth={1.5} aria-hidden="true" className="drum-mark" />;
}

export default function App() {
  const [url, setUrl] = useState(initialUrl);
  const [nickname, setNickname] = useState(initialNickname);
  const connection = useGameConnection(url, nickname);
  const [modal, setModal] = useState<'connection' | 'create' | 'join' | 'join-code' | 'rename' | 'licenses' | null>(url ? null : 'connection');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState<{ id: string; name: string; protected: boolean } | null>(null);
  const [joinCode, setJoinCode] = useState('');
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

  useEffect(() => {
    if (room) { setSettings(structuredClone(room.settings)); setPreview(null); }
  }, [settingsSignature, room?.id]);

  useEffect(() => {
    if (room) {
      history.replaceState(null, '', `${location.pathname}?room=${encodeURIComponent(room.roomPinyin)}`);
      setModal(null);
      roomParamHandled.current = room.roomPinyin;
      previousRoomId.current = room.id;
    } else if (previousRoomId.current) {
      history.replaceState(null, '', location.pathname + location.search);
      previousRoomId.current = null;
      roomParamHandled.current = '';
      setRoomTab('game');
    }
  }, [room?.id]);

  const act = useCallback(async <T,>(command: ClientCommand, done?: (result: T) => void) => {
    setError('');
    setBusy(true);
    try {
      const result = await connection.send<T>(command);
      done?.(result);
    } catch (failure) {
      if (!(failure instanceof ConnectionError)) throw failure;
      setError(failure.message);
    } finally { setBusy(false); }
  }, [connection.send]);

  useEffect(() => {
    if (!connected || !connection.lobbyReady || room) return;
    const roomPinyin = new URLSearchParams(location.search).get('room');
    if (!roomPinyin || roomParamHandled.current === roomPinyin) return;
    roomParamHandled.current = roomPinyin;
    const target = connection.rooms.find(item => item.roomPinyin === roomPinyin || item.id === roomPinyin);
    if (target?.protected) { setJoining({ id: target.id, name: target.name, protected: true }); setModal('join'); }
    else if (!target) { setJoinCode(roomPinyin); setModal('join-code'); }
    else act({ type: 'join', data: { roomId: target.id, password: '' } });
  }, [connected, connection.lobbyReady, room, connection.rooms, act]);

  const closeModal = useCallback(() => setModal(null), []);
  const join = (target: LobbyRoom) => {
    if (target.protected) { setError(''); setJoining(target); setModal('join'); }
    else act({ type: 'join', data: { roomId: target.id, password: '' } });
  };
  const joinByCode = (code: string, password: string) => act({ type: 'joinByCode', data: { code, password } });
  const previewSettings = () => act<Prompt>({ type: 'preview', data: { settings } }, result => setPreview(result));
  const leave = () => act({ type: 'leave', data: {} }, () => {
    history.replaceState(null, '', location.pathname);
    roomParamHandled.current = '';
    setRoomTab('game');
    setModal(null);
    setJoining(null);
    setJoinCode('');
  });

  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#" onClick={event => { if (room) event.preventDefault(); }}><DrumMark /><span>击鼓传字</span></a>
      <div className="header-tools"><button type="button" className="connection-button" onClick={() => setModal('connection')}>
        {connected ? <Wifi size={16} /> : <WifiOff size={16} />}<span>{connectionLabels[connection.status]}</span>
      </button><span className="header-nickname"><UserRound size={15} />{nickname}</span><IconButton label="连接与昵称" onClick={() => setModal('connection')}><Settings2 size={19} /></IconButton></div>
    </header>
    {((error && modal !== 'join' && modal !== 'join-code' && modal !== 'rename' && modal !== 'create') || connection.notice || notice) && <div className={`notice-banner ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>
      <span>{error || connection.notice || notice}</span><IconButton label="关闭消息" onClick={() => { setError(''); setNotice(''); connection.dismissNotice(); }}><X size={16} /></IconButton>
    </div>}
    {room ? <main className="room-page">
      <div className="room-heading"><div><button type="button" className="back-button" onClick={leave} disabled={busy}><ArrowLeft size={15} />大厅</button>
        <h1>{room.name}{room.protected && <LockKeyhole size={18} />}{isHost && <IconButton label="修改房间名称" onClick={() => setModal('rename')}><Pencil size={15} /></IconButton>}</h1><p className="room-meta">{phaseLabels[room.phase]}<span>房间号 {room.roomKey} · {room.roomPinyin}</span></p>
      </div><div className="room-heading-tools"><IconButton label="复制邀请链接" onClick={() => {
        navigator.clipboard.writeText(location.href).then(() => setNotice('邀请链接已复制'), failure => setError(failure.message));
      }}><Copy size={19} /></IconButton><IconButton label="离开房间" onClick={leave} disabled={busy}><LogOut size={19} /></IconButton></div></div>
      <div className="room-tabs" role="tablist"><button type="button" role="tab" aria-selected={roomTab === 'game'} onClick={() => setRoomTab('game')}>游戏</button>
        <button type="button" role="tab" aria-selected={roomTab === 'settings'} onClick={() => setRoomTab('settings')}>规则设置</button></div>
      {roomTab === 'game' ? <RoomGame room={room} self={self} isHost={Boolean(isHost)} busy={busy} connected={connected} act={act} send={connection.send} setError={setError} />
        : <div className="room-settings-layout"><SettingsEditor value={settings} onChange={setSettings} disabled={!isHost || room.phase === 'playing'}
          fixedBestOf={room.phase === 'between'} preview={preview} busy={busy} onPreview={previewSettings}
          onSave={isHost ? () => act({ type: 'settings', data: { settings } }) : undefined} />
          <aside className="settings-room-info"><h3>房间</h3><p>{room.players.length} / {room.settings.maxPlayers} 人</p><p>{phaseLabels[room.phase]}</p>
            <p>第 {room.round || 1} 局 / {room.settings.bestOf} 局</p><p className="muted">房主：{room.players.find(player => player.id === room.hostId)?.nickname}</p>
            <label className="visibility-setting"><input type="checkbox" checked={room.listed} disabled={!isHost || busy} onChange={event => act({ type: 'visibility', data: { listed: event.target.checked } })} />{room.listed ? <><Eye size={14} />在大厅展示</> : <><EyeOff size={14} />大厅隐藏</>}</label></aside></div>}
    </main> : <main className="lobby-page"><div className="page-heading"><div><span className="eyebrow">击鼓传字</span><h1>游戏大厅</h1></div>
      <div className="page-heading-actions"><button type="button" className="secondary-button" disabled={!connected || busy} onClick={() => { setJoinCode(''); setModal('join-code'); }}>加入房间</button>
        <button type="button" className="primary-button" disabled={!connected || busy} onClick={() => { setError(''); setModal('create'); }}><Plus size={18} />创建房间</button></div></div>
      <div className="lobby-toolbar"><span>{connection.rooms.length} 个房间</span><span className="muted">最新创建</span><IconButton label="重新连接" onClick={connection.reconnect}><RefreshCw size={16} /></IconButton></div>
      <div className="lobby-table"><div className="lobby-table-heading"><span>房间</span><span>条件</span><span>人数</span><span>状态</span><span /></div>
        {connection.rooms.length ? connection.rooms.map(target => <button type="button" className="lobby-room" key={target.id} disabled={!connected || busy || target.playerCount >= target.maxPlayers} onClick={() => join(target)}>
          <span className="lobby-room-name"><span>{target.name}{target.protected && <LockKeyhole size={14} />}</span><small>{target.roomKey} · {target.roomPinyin}</small><small>{target.creator}</small></span>
          <span className="lobby-conditions">{target.conditions.map(type => <span key={type}>{conditionLabels[type]}</span>)}</span>
          <span className="lobby-people"><Users size={15} />{target.playerCount}<span className="muted">/ {target.maxPlayers}</span></span>
          <span className="lobby-phase">{phaseLabels[target.phase]}</span><ChevronRight size={18} />
        </button>) : <div className="empty-lobby"><DrumMark size={66} /><p>{connected ? '暂时没有房间' : connection.status === 'idle' ? '联机服务尚未设置' : '正在连接大厅'}</p>
          {connected ? <div className="empty-actions"><button type="button" className="secondary-button" onClick={() => { setJoinCode(''); setModal('join-code'); }}>加入房间</button>
            <button type="button" className="secondary-button" onClick={() => { setError(''); setModal('create'); }}><Plus size={16} />创建房间</button></div>
            : <button type="button" className="secondary-button" onClick={() => setModal('connection')}><Settings2 size={16} />连接设置</button>}</div>}
      </div>
    </main>}
    <footer className="site-footer"><span>击鼓传字</span><button type="button" onClick={() => setModal('licenses')}>数据与许可</button></footer>
    {modal === 'connection' && <Modal title="连接与昵称" onClose={closeModal}><ConnectionForm url={url} nickname={nickname} onApply={(nextUrl, nextNickname) => {
      localStorage.setItem('chuan-zi:url', nextUrl); localStorage.setItem('chuan-zi:nickname', nextNickname);
      setUrl(nextUrl); setNickname(nextNickname); setModal(null);
    }} /></Modal>}
    {modal === 'create' && !room && <Modal title="创建房间" onClose={closeModal} error={error}><CreateForm busy={busy} onCreate={(name, password, listed, maxPlayers, bestOf) => {
      act({ type: 'create', data: { name, password, listed, settings: { ...structuredClone(defaultSettings), maxPlayers, bestOf } } });
    }} /></Modal>}
    {modal === 'join' && joining && !room && <Modal title={joining.name || '加入房间'} onClose={closeModal} error={error}><JoinForm busy={busy} onJoin={password =>
      act({ type: 'join', data: { roomId: joining.id, password } })} /></Modal>}
    {modal === 'join-code' && !room && <Modal title="加入房间" onClose={closeModal} error={error}><JoinCodeForm code={joinCode} busy={busy} onJoin={joinByCode} /></Modal>}
    {modal === 'rename' && room && <Modal title="修改房间名称" onClose={closeModal} error={error}><RenameForm name={room.name} busy={busy} onRename={name => act({ type: 'rename', data: { name } }, () => setModal(null))} /></Modal>}
    {modal === 'licenses' && <Modal title="数据与许可" onClose={closeModal}><div className="license-list"><p>成语候选与文档频次：THUOCL · MIT</p>
      <p>普通词语与读音：CC-CEDICT · CC BY-SA 4.0</p><p>部首：Unicode Unihan · Unicode License v3</p>
      <p>字形部件：Make Me a Hanzi · LGPL</p><p>界面图标：Lucide · ISC</p>
      <a href={`${import.meta.env.BASE_URL}licenses.html`} target="_blank" rel="noreferrer">完整来源与许可<ArrowRight size={15} /></a></div></Modal>}
  </div>;
}

function ConnectionForm({ url, nickname, onApply }: { url: string; nickname: string; onApply: (url: string, nickname: string) => void }) {
  const [draftUrl, setDraftUrl] = useState(url);
  const [draftNickname, setDraftNickname] = useState(nickname);
  const [error, setError] = useState('');
  return <form className="dialog-form" onSubmit={event => {
    event.preventDefault();
    if (!draftNickname.trim()) { setError('请输入昵称'); return; }
    let target: URL;
    try { target = new URL(draftUrl.trim()); } catch { setError('请输入完整的联机地址'); return; }
    if (!['ws:', 'wss:'].includes(target.protocol)) { setError('联机地址必须使用 ws 或 wss'); return; }
    if (location.protocol === 'https:' && target.protocol !== 'wss:') { setError('当前网页需要使用 wss 联机地址'); return; }
    onApply(target.href, draftNickname.trim());
  }}><label>昵称<input value={draftNickname} onChange={event => setDraftNickname(event.target.value)} maxLength={20} autoComplete="nickname" required /></label>
    <label>联机服务地址<input value={draftUrl} onChange={event => setDraftUrl(event.target.value)} type="url" placeholder="wss://" spellCheck={false} autoCapitalize="none" required /></label>
    {error && <p className="field-error" role="alert">{error}</p>}<button className="primary-button" type="submit"><Wifi size={17} />连接大厅</button>
  </form>;
}

function CreateForm({ busy, onCreate }: { busy: boolean; onCreate: (name: string, password: string, listed: boolean, maxPlayers: number, bestOf: number) => void }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [listed, setListed] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(defaultSettings.maxPlayers);
  const [bestOf, setBestOf] = useState(defaultSettings.bestOf);
  return <form className="dialog-form" onSubmit={event => { event.preventDefault(); onCreate(name.trim(), password, listed, maxPlayers, bestOf); }}>
    <label>房间名称<input value={name} onChange={event => setName(event.target.value)} maxLength={40} placeholder="留空使用房间号" /></label>
    <label>房间密码<input value={password} onChange={event => setPassword(event.target.value)} type="password" maxLength={64} autoComplete="new-password" placeholder="可选" /></label>
    <label className="checkbox-field"><input type="checkbox" checked={listed} onChange={event => setListed(event.target.checked)} />在大厅展示</label>
    <div className="number-grid"><label>人数上限<input type="number" value={maxPlayers} min={2} max={16} onChange={event => setMaxPlayers(event.target.valueAsNumber)} required /></label>
      <label>比赛总局数<input type="number" value={bestOf} min={1} max={21} step={2} onChange={event => setBestOf(event.target.valueAsNumber)} required /></label></div>
    <button className="primary-button" type="submit" disabled={busy}><Plus size={17} />创建房间</button>
  </form>;
}

function JoinForm({ busy, onJoin }: { busy: boolean; onJoin: (password: string) => void }) {
  const [password, setPassword] = useState('');
  return <form className="dialog-form" onSubmit={event => { event.preventDefault(); onJoin(password); }}><label>房间密码<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></label>
    <button className="primary-button" type="submit" disabled={busy}><ArrowRight size={17} />加入房间</button></form>;
}

function JoinCodeForm({ code, busy, onJoin }: { code: string; busy: boolean; onJoin: (code: string, password: string) => void }) {
  const [draftCode, setDraftCode] = useState(code);
  const [password, setPassword] = useState('');
  return <form className="dialog-form" onSubmit={event => { event.preventDefault(); onJoin(draftCode.trim(), password); }}>
    <label>房间号或拼音<input value={draftCode} onChange={event => setDraftCode(event.target.value)} placeholder="例如：天翻地覆 或 tian-fan-di-fu" required /></label>
    <label>房间密码<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" placeholder="没有密码可以留空" /></label>
    <button className="primary-button" type="submit" disabled={busy || !draftCode.trim()}><ArrowRight size={17} />加入房间</button>
  </form>;
}

function RenameForm({ name, busy, onRename }: { name: string; busy: boolean; onRename: (name: string) => void }) {
  const [draftName, setDraftName] = useState(name);
  return <form className="dialog-form" onSubmit={event => { event.preventDefault(); if (draftName.trim()) onRename(draftName.trim()); }}>
    <label>房间名称<input value={draftName} onChange={event => setDraftName(event.target.value)} maxLength={40} required /></label>
    <button className="primary-button" type="submit" disabled={busy || !draftName.trim()}><Pencil size={17} />保存名称</button>
  </form>;
}

type Act = <T = unknown>(command: ClientCommand, done?: (result: T) => void) => Promise<void>;
function RoomGame({ room, self, isHost, busy, connected, act, send, setError }: {
  room: RoomView; self?: PlayerView; isHost: boolean; busy: boolean; connected: boolean; act: Act;
  send: <T = unknown>(command: ClientCommand) => Promise<T>; setError: (message: string) => void;
}) {
  const [word, setWord] = useState('');
  const [chat, setChat] = useState('');
  const [now, setNow] = useState(Date.now());
  const composing = useRef(false);
  const composedAt = useRef(0);
  const chatComposing = useRef(false);
  const chatComposedAt = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const chatList = useRef<HTMLDivElement>(null);
  const historyList = useRef<HTMLDivElement>(null);
  const [sideTab, setSideTab] = useState<'history' | 'chat'>('history');
  const currentPlayer = room.players.find(player => player.id === room.currentPlayerId);
  const isTurn = room.phase === 'playing' && self?.id === room.currentPlayerId && self.role === 'player';
  const deadlineOffset = room.serverTime - Date.now();
  const serverOffset = useRef(deadlineOffset);
  useEffect(() => { serverOffset.current = room.serverTime - Date.now(); }, [room.serverTime]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(timer); }, []);
  const seconds = room.deadline === null ? 0 : Math.max(0, (room.deadline - now - serverOffset.current) / 1000);
  const initial = room.settings.timerMode === 'fixed' ? room.settings.initialSeconds : room.settings.randomMaxSeconds;
  useEffect(() => { setWord(''); composing.current = false; if (isTurn) input.current?.focus(); }, [room.prompt?.id, isTurn]);
  useEffect(() => {
    if (!isTurn || !connected) return;
    const timer = setTimeout(() => { send({ type: 'draft', data: { word } }).catch(failure => setError(failure.message)); }, 180);
    return () => clearTimeout(timer);
  }, [word, isTurn, connected, send, setError]);
  useEffect(() => { chatList.current?.scrollTo({ top: chatList.current.scrollHeight }); }, [room.chat.length, sideTab]);
  useEffect(() => { historyList.current?.scrollTo({ top: historyList.current.scrollHeight }); }, [room.history.length]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (composing.current || Date.now() - composedAt.current < 120 || !room.prompt || !isTurn || !word.trim()) return;
    act({ type: 'submit', data: { word: word.trim(), promptId: room.prompt.id } }, () => setWord(''));
  };
  const lastWinner = room.players.find(player => player.id === room.lastWinnerId);
  const winners = room.players.filter(player => room.winnerIds.includes(player.id));
  return <div className="room-layout">
    <aside className="players-area"><div className="section-heading"><h2>玩家</h2><div className="section-heading-tools"><span>{room.players.length} / {room.settings.maxPlayers}</span>{isHost && room.phase !== 'playing' && <button type="button" className="cpu-button" disabled={busy || !connected} onClick={() => act({ type: room.players.some(player => player.cpu) ? 'removeCpu' : 'addCpu', data: {} })}><Bot size={14} />{room.players.some(player => player.cpu) ? '移除电脑' : '添加电脑'}</button>}</div></div>
      <div className="player-list">{room.players.map((player, index) => <div className={`player-row ${player.id === room.currentPlayerId ? 'player-current' : ''} ${!player.online ? 'player-disconnected' : ''}`} key={player.id}>
        <div className="player-avatar">{index + 1}</div><div className="player-details"><div className="player-name"><span>{player.nickname}</span>
          {player.id === room.hostId && <Crown size={13} aria-label="房主" />}{player.id === self?.id && <small>你</small>}</div>
          <div className="player-state">{!player.online ? '暂时离线' : player.role === 'spectator' ? '观战' : room.phase === 'playing' ? <span className="player-lives"><Heart size={12} fill="currentColor" />{player.lives}</span> : player.ready ? <><Check size={12} />已准备</> : '等待准备'}
            <span className="player-wins"><Trophy size={11} />{player.wins}</span></div>
          {room.phase === 'playing' && player.id === room.currentPlayerId && player.draft && <div className="player-draft">{player.draft}</div>}
        </div>{isHost && player.id !== self?.id && (player.cpu ? <div className="player-tools"><IconButton label="移除电脑" disabled={busy || room.phase === 'playing'} onClick={() => act({ type: 'removeCpu', data: {} })}><X size={14} /></IconButton></div> : <div className="player-tools"><IconButton label={`转移房主给 ${player.nickname}`} disabled={busy} onClick={() => act({ type: 'transfer', data: { playerId: player.id } })}><Crown size={14} /></IconButton>
          <IconButton label={`移除 ${player.nickname}`} disabled={busy} onClick={() => act({ type: 'kick', data: { playerId: player.id } })}><X size={14} /></IconButton></div>)}
      </div>)}</div>
      <div className="match-summary"><span>{room.suddenDeath ? '加赛' : `第 ${room.round || 1} 局`}</span><span>{room.settings.bestOf} 局比赛</span></div>
    </aside>
    <section className="game-area"><div className="game-topline"><span>{room.suddenDeath ? '加赛' : `第 ${room.round || 1} 局`}</span>
      <span>{room.phase === 'playing' ? `${currentPlayer?.nickname || ''} 的回合` : phaseLabels[room.phase]}</span></div>
      {room.phase === 'playing' && room.prompt ? <>
        <div className="timer-area"><div className={`timer ${seconds <= 5 ? 'timer-urgent' : ''}`} aria-label="剩余时间"><span>{seconds.toFixed(1)}</span><small>秒</small></div>
          <div className="timer-track"><span style={{ width: `${Math.min(100, seconds / initial * 100)}%` }} /></div></div>
        <div className="live-prompt"><PromptView prompt={room.prompt} /></div>
        <form className={`answer-form ${isTurn ? 'answer-active' : ''}`} onSubmit={submit}><input ref={input} aria-label="输入答案" value={word} maxLength={9} autoComplete="off" autoCorrect="off" spellCheck={false}
          disabled={!isTurn || !connected} placeholder={isTurn ? '输入词语或成语' : self?.role === 'spectator' ? '正在观战' : '等待你的回合'}
          onChange={event => setWord(event.target.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; composedAt.current = Date.now(); }}
          onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || composing.current || event.keyCode === 229 || Date.now() - composedAt.current < 120)) event.preventDefault(); }} />
          <button type="submit" className="submit-button" title="提交答案" aria-label="提交答案" disabled={!isTurn || !connected || busy || !word.trim()}><ArrowRight size={23} /></button></form>
        {self && <div className="bonus-progress"><div><span>奖励生命</span><Heart size={13} /></div><div className="bonus-letters">{room.settings.bonusInitials.map(initial =>
          <span className={self.collected.includes(initial) ? 'bonus-collected' : ''} key={initial}>{initial}</span>)}</div></div>}
      </> : <div className="waiting-stage"><DrumMark size={88} />
        {room.phase === 'finished' ? <><h2>{winners.map(player => player.nickname).join('、')} 获胜</h2><span className="muted">比赛结束</span></>
          : room.phase === 'between' ? <><h2>{lastWinner ? `${lastWinner.nickname} 获胜` : '本局中止'}</h2><span className="muted">{lastWinner ? room.suddenDeath ? '准备加赛' : '准备下一局' : '重新准备'}</span></>
          : <><h2>等待开始</h2><span className="muted">{room.players.filter(player => player.ready).length} 人已准备</span></>}
        <div className="ready-actions">{self && <button type="button" className={self.ready ? 'secondary-button' : 'primary-button'} disabled={busy || !connected} onClick={() => act({ type: 'ready', data: { ready: !self.ready } })}>
          <Check size={17} />{self.ready ? '取消准备' : '准备'}</button>}
          {isHost && <button type="button" className="primary-button" disabled={busy || !connected || room.players.filter(player => player.ready && player.online).length < 2}
            onClick={() => act({ type: 'start', data: {} })}><ArrowRight size={17} />{room.phase === 'between' ? '开始下一局' : room.phase === 'finished' ? '开始新比赛' : '开始比赛'}</button>}</div>
      </div>}
    </section>
    <aside className="activity-area"><div className="activity-tabs" role="tablist"><button role="tab" type="button" aria-selected={sideTab === 'history'} onClick={() => setSideTab('history')}>答案记录<span>{room.history.length}</span></button>
      <button role="tab" type="button" aria-selected={sideTab === 'chat'} onClick={() => setSideTab('chat')}><MessageCircle size={14} />聊天</button></div>
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
    </aside>
  </div>;
}
