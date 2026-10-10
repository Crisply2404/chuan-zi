import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientCommand, LobbyRoom, Request, RoomView, ServerMessage } from '../shared/types';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';
export class ConnectionError extends Error {}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export function useGameConnection(url: string, nickname: string) {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [lobbyReady, setLobbyReady] = useState(false);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [notice, setNotice] = useState('');
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(new Map<string, PendingRequest>());
  const generationRef = useRef(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSequence = useRef(0);
  const [revision, setRevision] = useState(0);

  const send = useCallback(<T = unknown>(command: ClientCommand): Promise<T> => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return Promise.reject(new ConnectionError('联机连接尚未建立'));
    requestSequence.current += 1;
    const id = `${Date.now().toString(36)}-${requestSequence.current.toString(36)}`;
    const request = { ...command, id } as Request;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRef.current.delete(id);
        reject(new ConnectionError('服务器响应超时'));
      }, 15000);
      pendingRef.current.set(id, { resolve: value => resolve(value as T), reject, timeout });
      socket.send(JSON.stringify(request));
    });
  }, []);

  useEffect(() => {
    const generation = ++generationRef.current;
    if (!url) {
      setStatus('idle');
      setRoom(null);
      setRooms([]);
      setLobbyReady(false);
      return;
    }
    setLobbyReady(false);
    const target = new URL(url);
    if (!['ws:', 'wss:'].includes(target.protocol)) throw new Error('联机地址必须使用 ws 或 wss');
    let stopped = false;
    let attempts = 0;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    const storageKey = `chuan-zi:token:${url}`;
    const open = () => {
      if (stopped) return;
      setStatus(attempts ? 'reconnecting' : 'connecting');
      const socket = new WebSocket(url);
      socketRef.current = socket;
      socket.onopen = () => {
        if (stopped || generation !== generationRef.current) { socket.close(); return; }
        const token = sessionStorage.getItem(storageKey) || undefined;
        const hello = send({ type: 'hello', data: { nickname, token } }).catch(error => {
          if (error.message !== '登录信息已过期，请重新连接') throw error;
          sessionStorage.removeItem(storageKey);
          setRoom(null);
          return send({ type: 'hello', data: { nickname } });
        });
        hello.then(() => {
          if (stopped) return;
          attempts = 0;
          setStatus('connected');
          setNotice('');
        }, error => setNotice(error.message));
        heartbeat = setInterval(() => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const startedAt = Date.now();
          send<{ serverTime: number }>({ type: 'ping', data: {} }).then(result => {
            setServerTimeOffset(result.serverTime - (startedAt + Date.now()) / 2);
          }, error => setNotice(error.message));
        }, 20000);
      };
      socket.onmessage = event => {
        if (stopped || generation !== generationRef.current || socketRef.current !== socket) return;
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === 'reply') {
          const pending = pendingRef.current.get(message.id);
          if (!pending) return;
          clearTimeout(pending.timeout);
          pendingRef.current.delete(message.id);
          if (message.ok) pending.resolve(message.result);
          else pending.reject(new ConnectionError(message.error));
        } else if (message.type === 'session') {
          sessionStorage.setItem(storageKey, message.token);
          setPlayerId(message.playerId);
        } else if (message.type === 'lobby') {
          setRooms([...message.rooms].sort((first, second) => second.createdAt - first.createdAt));
          setLobbyReady(true);
        } else if (message.type === 'state') {
          setRoom(message.room);
        } else if (message.type === 'notice') {
          setNotice(message.text);
        }
      };
      socket.onclose = event => {
        if (heartbeat) clearInterval(heartbeat);
        if (stopped || generation !== generationRef.current || socketRef.current !== socket) return;
        for (const pending of pendingRef.current.values()) {
          clearTimeout(pending.timeout);
          pending.reject(new ConnectionError('联机连接中断'));
        }
        pendingRef.current.clear();
        if (event.code === 1000 && event.reason === '身份已在其他连接使用') {
          setStatus('idle');
          setRoom(null);
          setRooms([]);
          setNotice('身份已在其他连接使用，请重新连接');
          return;
        }
        attempts += 1;
        setStatus('reconnecting');
        retryRef.current = setTimeout(open, Math.min(1000 * 2 ** Math.min(attempts - 1, 4), 10000));
      };
      socket.onerror = () => setNotice('联机服务暂时无法连接');
    };
    open();
    return () => {
      stopped = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (heartbeat) clearInterval(heartbeat);
      for (const pending of pendingRef.current.values()) {
        clearTimeout(pending.timeout);
        pending.reject(new ConnectionError('联机连接已更改'));
      }
      pendingRef.current.clear();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [url, nickname, revision, send]);

  return { status, rooms, lobbyReady, room, playerId, notice, send, serverTimeOffset, dismissNotice: () => setNotice(''), reconnect: () => setRevision(value => value + 1) };
}
