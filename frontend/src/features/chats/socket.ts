import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/api/client';
import type { ChatSummary, Message } from '@features/chats/types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';
const WS_URL = import.meta.env.VITE_WS_URL as string | undefined;

/**
 * База для socket.io и путь к endpoint handshake.
 *
 * - Если задан VITE_WS_URL (абсолютный) — используем его напрямую.
 * - Если VITE_API_URL абсолютный (http://host:port) — используем как базу.
 * - Если VITE_API_URL относительный (/api) — берём текущий origin
 *   (чтобы запрос шёл на тот же хост, что и страница, и проходил через Vite-прокси),
 *   а префикс кладём в path.
 */
function resolveSocketUrl(): { url: string | null; path: string } {
  if (WS_URL) return { url: WS_URL, path: '/socket.io' };

  if (/^https?:\/\//.test(API_URL)) return { url: API_URL, path: '/socket.io' };

  // относительный путь, например '/api' — путь handshake становится '/api/socket.io'
  const path = API_URL.replace(/\/$/, '');
  return { url: null, path: `${path}/socket.io` };
}

export interface SessionDescription {
  type: 'offer' | 'answer';
  sdp?: string;
}

export interface IceCandidatePayload {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

/** Имена серверных событий. */
export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:ack': (message: Message) => void;
  'chat:new': (chat: ChatSummary) => void;
  'chat:member:added': (payload: { chatId: number }) => void;
  'chat:members:changed': (payload: { chatId: number }) => void;
  presence: (payload: { userId: number; online: boolean }) => void;
  typing: (payload: { chatId: number; userId: number; isTyping: boolean }) => void;
  'call:incoming': (payload: { callId: string; chatId: number; fromUserId: number }) => void;
  'call:accepted': (payload: { callId: string }) => void;
  'call:offer': (payload: { callId: string; description: SessionDescription }) => void;
  'call:answer': (payload: { callId: string; description: SessionDescription }) => void;
  'call:ice': (payload: { callId: string; candidate: IceCandidatePayload }) => void;
  'call:ended': (payload: { callId: string; reason: string }) => void;
}

/** Имена клиентских событий. */
export interface ClientToServerEvents {
  'message:send': (payload: {
    chatId: number;
    body?: string;
    clientMessageId: string;
    replyToId?: number;
    attachment?: { key: string; name: string; mime: string; size: number };
  }) => void;
  'message:read': (payload: { chatId: number; upToId: number }) => void;
  typing: (payload: { chatId: number; isTyping: boolean }) => void;
  'call:invite': (
    payload: { chatId: number },
    ack: (res: { callId: string; calleeId: number }) => void,
  ) => void;
  'call:accept': (payload: { callId: string }, ack: (res: { ok: true }) => void) => void;
  'call:reject': (payload: { callId: string }) => void;
  'call:offer': (payload: { callId: string; description: SessionDescription }) => void;
  'call:answer': (payload: { callId: string; description: SessionDescription }) => void;
  'call:ice': (payload: { callId: string; candidate: IceCandidatePayload }) => void;
  'call:hangup': (payload: { callId: string }) => void;
}

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ChatSocket | null = null;

/** Возвращает singleton-socket, создавая его при первом обращении. */
export function getSocket(): ChatSocket {
  if (!socket) {
    const { url, path } = resolveSocketUrl();
    socket = io(`${url ?? ''}/chat`, {
      path,
      autoConnect: false,
      auth: { token: getAccessToken() },
      // Чистый websocket-only ломается на мобильных сетях/прокси без fallback.
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      withCredentials: true,
    });
  }
  return socket;
}

/** Подключается (если нужно) и возвращает сокет, дожидаясь установления соединения. */
export function connectSocket(): Promise<ChatSocket> {
  const s = getSocket();

  // при переподключении обновляем токен
  s.auth = { token: getAccessToken() };

  if (s.connected) return Promise.resolve(s);

  // если сокет уже пытается подключиться — дождёмся того же результата,
  // не запуская второй connect()
  if (s.active) {
    return new Promise((resolve, reject) => {
      s.once('connect', () => resolve(s));
      s.once('connect_error', (err) => reject(err));
    });
  }

  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      resolve(s);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      s.off('connect', onConnect);
      s.off('connect_error', onError);
    };

    s.once('connect', onConnect);
    s.once('connect_error', onError);
    s.connect();
  });
}

/** Отключает сокет (например, при выходе из аккаунта). */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
