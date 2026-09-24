import { useEffect, useRef } from 'react';
import { MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon, VideoIcon, VideoOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCall } from '@features/calls/CallProvider';

function bindStream(node: HTMLVideoElement | null, stream: MediaStream | null) {
  if (node && node.srcObject !== stream) node.srcObject = stream;
}

export function CallOverlay() {
  const call = useCall();
  const remoteRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    bindStream(remoteRef.current, call.remoteStream);
  }, [call.remoteStream, call.phase]);

  useEffect(() => {
    bindStream(localRef.current, call.localStream);
  }, [call.localStream, call.phase]);

  if (call.phase === 'idle') {
    if (!call.error) return null;
    return (
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
        {call.error}
      </div>
    );
  }

  const status =
    call.phase === 'incoming'
      ? 'Входящий видеозвонок'
      : call.phase === 'outgoing'
        ? 'Вызов…'
        : call.phase === 'connecting'
          ? 'Соединение…'
          : 'В эфире';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white">
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div>
          <p className="text-lg font-semibold">{call.peerName}</p>
          <p className="text-sm text-white/70">{status}</p>
        </div>
        {call.localStream && (
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="h-28 w-20 rounded-2xl object-cover ring-1 ring-white/30 sm:h-36 sm:w-28"
          />
        )}
      </div>

      <div className="relative z-10 mt-auto flex items-center justify-center gap-4 pb-10">
        {call.phase === 'incoming' ? (
          <>
            <Button
              size="lg"
              variant="destructive"
              className="size-14 rounded-full"
              onClick={call.reject}
              aria-label="Отклонить"
            >
              <PhoneOffIcon />
            </Button>
            <Button
              size="lg"
              className="size-14 rounded-full bg-emerald-500 text-white hover:bg-emerald-400"
              onClick={call.accept}
              aria-label="Принять"
            >
              <PhoneIcon />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="lg"
              variant="secondary"
              className="size-12 rounded-full"
              onClick={call.toggleMute}
              aria-label={call.muted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {call.muted ? <MicOffIcon /> : <MicIcon />}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="size-14 rounded-full"
              onClick={call.hangup}
              aria-label="Завершить"
            >
              <PhoneOffIcon />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="size-12 rounded-full"
              onClick={call.toggleCamera}
              aria-label={call.cameraOff ? 'Включить камеру' : 'Выключить камеру'}
            >
              {call.cameraOff ? <VideoOffIcon /> : <VideoIcon />}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
