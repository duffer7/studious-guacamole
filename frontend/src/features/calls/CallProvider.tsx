import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '@features/chats/queryKeys';
import { connectSocket, type IceCandidatePayload, type SessionDescription } from '@features/chats/socket';
import { assertUserMedia, callConstraints } from '@features/media/preferences';
import type { ChatSummary, PublicUser } from '@features/chats/types';

const ICE: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active';

interface CallContextValue {
  phase: CallPhase;
  peerName: string;
  error: string | null;
  muted: boolean;
  cameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (chat: ChatSummary, peer: PublicUser) => void;
  accept: () => void;
  reject: () => void;
  hangup: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}

function peerLabel(user: PublicUser | undefined, fallback: string) {
  return user?.displayName || user?.username || fallback;
}

function ackErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message: unknown }).message);
    if (message === 'busy') return 'Собеседник уже в звонке';
    if (message.includes('direct')) return 'Видеозвонок доступен только в личном чате';
    return message;
  }
  return 'Не удалось начать звонок';
}

export function CallProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [peerName, setPeerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const phaseRef = useRef(phase);
  const callIdRef = useRef<string | null>(null);
  const roleRef = useRef<'caller' | 'callee' | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const lookupName = useCallback(
    (chatId: number, userId: number) => {
      const chats = queryClient.getQueryData<ChatSummary[]>(chatKeys.list());
      const chat = chats?.find((item) => item.id === chatId);
      const user = chat?.members.find((member) => member.id === userId);
      return peerLabel(user, 'Собеседник');
    },
    [queryClient],
  );

  const stopMedia = useCallback(() => {
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingIce.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const reset = useCallback(
    (message?: string) => {
      callIdRef.current = null;
      roleRef.current = null;
      stopMedia();
      setPhase('idle');
      setPeerName('');
      setError(message ?? null);
    },
    [stopMedia],
  );

  const ensurePeer = useCallback((callId: string) => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;

    for (const track of localRef.current?.getTracks() ?? []) {
      pc.addTrack(track, localRef.current!);
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      void connectSocket().then((socket) => {
        socket.emit('call:ice', { callId, candidate: event.candidate!.toJSON() });
      });
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) setRemoteStream(stream);
      setPhase('active');
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') reset('Соединение прервалось');
    };

    return pc;
  }, [reset]);

  const flushIce = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingIce.current;
    pendingIce.current = [];
    for (const candidate of queued) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  const openMedia = useCallback(async () => {
    assertUserMedia();
    const stream = await navigator.mediaDevices.getUserMedia(callConstraints());
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const hangup = useCallback(() => {
    const callId = callIdRef.current;
    if (callId) {
      void connectSocket().then((socket) => socket.emit('call:hangup', { callId }));
    }
    reset();
  }, [reset]);

  const reject = useCallback(() => {
    const callId = callIdRef.current;
    if (callId) {
      void connectSocket().then((socket) => socket.emit('call:reject', { callId }));
    }
    reset();
  }, [reset]);

  const accept = useCallback(() => {
    const callId = callIdRef.current;
    if (!callId || phaseRef.current !== 'incoming') return;
    setPhase('connecting');
    void openMedia()
      .then(() => connectSocket())
      .then((socket) => socket.timeout(8000).emitWithAck('call:accept', { callId }))
      .catch((err: unknown) => {
        reset(err instanceof Error ? err.message : 'Не удалось принять звонок');
      });
  }, [openMedia, reset]);

  const startCall = useCallback(
    (chat: ChatSummary, peer: PublicUser) => {
      if (phaseRef.current !== 'idle') return;
      if (chat.type !== 'direct') return;

      roleRef.current = 'caller';
      setPeerName(peerLabel(peer, 'Собеседник'));
      setError(null);
      setPhase('outgoing');

      void openMedia()
        .then(() => connectSocket())
        .then(async (socket) => {
          const ack = (await socket.timeout(8000).emitWithAck('call:invite', {
            chatId: chat.id,
          })) as { callId: string };
          callIdRef.current = ack.callId;
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            reset('Нужен доступ к камере и микрофону');
            return;
          }
          reset(ackErrorMessage(err));
        });
    },
    [openMedia, reset],
  );

  const toggleMute = useCallback(() => {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const next = !cameraOff;
    localRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  }, [cameraOff]);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    void connectSocket().then((socket) => {
      if (cancelled) return;

      const onIncoming = (payload: { callId: string; chatId: number; fromUserId: number }) => {
        if (phaseRef.current !== 'idle') {
          socket.emit('call:reject', { callId: payload.callId });
          return;
        }
        callIdRef.current = payload.callId;
        roleRef.current = 'callee';
        setPeerName(lookupName(payload.chatId, payload.fromUserId));
        setError(null);
        setPhase('incoming');
      };

      const onAccepted = (payload: { callId: string }) => {
        if (payload.callId !== callIdRef.current || roleRef.current !== 'caller') return;
        setPhase('connecting');
        const pc = ensurePeer(payload.callId);
        void pc
          .createOffer()
          .then(async (offer) => {
            await pc.setLocalDescription(offer);
            socket.emit('call:offer', {
              callId: payload.callId,
              description: { type: 'offer', sdp: offer.sdp },
            });
          })
          .catch(() => reset('Не удалось создать предложение связи'));
      };

      const onOffer = (payload: { callId: string; description: SessionDescription }) => {
        if (payload.callId !== callIdRef.current) return;
        const pc = ensurePeer(payload.callId);
        void pc
          .setRemoteDescription(payload.description)
          .then(() => flushIce(pc))
          .then(() => pc.createAnswer())
          .then(async (answer) => {
            await pc.setLocalDescription(answer);
            socket.emit('call:answer', {
              callId: payload.callId,
              description: { type: 'answer', sdp: answer.sdp },
            });
            setPhase('active');
          })
          .catch(() => reset('Не удалось ответить на звонок'));
      };

      const onAnswer = (payload: { callId: string; description: SessionDescription }) => {
        if (payload.callId !== callIdRef.current) return;
        const pc = pcRef.current;
        if (!pc) return;
        void pc
          .setRemoteDescription(payload.description)
          .then(() => flushIce(pc))
          .then(() => setPhase('active'))
          .catch(() => reset('Не удалось установить соединение'));
      };

      const onIce = (payload: { callId: string; candidate: IceCandidatePayload }) => {
        if (payload.callId !== callIdRef.current || !payload.candidate) return;
        const pc = pcRef.current;
        if (!pc || !pc.remoteDescription) {
          pendingIce.current.push(payload.candidate);
          return;
        }
        void pc.addIceCandidate(payload.candidate);
      };

      const onEnded = (payload: { callId: string; reason: string }) => {
        if (payload.callId !== callIdRef.current) return;
        const message =
          payload.reason === 'rejected'
            ? 'Звонок отклонён'
            : payload.reason === 'timeout'
              ? 'Нет ответа'
              : payload.reason === 'busy'
                ? 'Собеседник занят'
                : null;
        reset(message ?? undefined);
      };

      socket.on('call:incoming', onIncoming);
      socket.on('call:accepted', onAccepted);
      socket.on('call:offer', onOffer);
      socket.on('call:answer', onAnswer);
      socket.on('call:ice', onIce);
      socket.on('call:ended', onEnded);

      cleanup = () => {
        socket.off('call:incoming', onIncoming);
        socket.off('call:accepted', onAccepted);
        socket.off('call:offer', onOffer);
        socket.off('call:answer', onAnswer);
        socket.off('call:ice', onIce);
        socket.off('call:ended', onEnded);
      };
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [ensurePeer, flushIce, lookupName, reset]);

  const value = useMemo<CallContextValue>(
    () => ({
      phase,
      peerName,
      error,
      muted,
      cameraOff,
      localStream,
      remoteStream,
      startCall,
      accept,
      reject,
      hangup,
      toggleMute,
      toggleCamera,
    }),
    [
      phase,
      peerName,
      error,
      muted,
      cameraOff,
      localStream,
      remoteStream,
      startCall,
      accept,
      reject,
      hangup,
      toggleMute,
      toggleCamera,
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
