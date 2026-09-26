import { useEffect, useRef, useState } from 'react';
import { Button } from '@ui/button';
import { useLogout } from '@features/auth/hooks/useLogout';
import {
  assertUserMedia,
  callConstraints,
  loadMediaPrefs,
  saveMediaPrefs,
  type MediaPrefs,
} from '@features/media/preferences';
import { NotificationSettings } from '@features/notifications/NotificationSettings';

export function SettingsPage() {
  const { logout, logoutAll } = useLogout();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prefs, setPrefs] = useState<MediaPrefs>(() => loadMediaPrefs());
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = preview;
  }, [preview]);

  useEffect(() => {
    return () => preview?.getTracks().forEach((track) => track.stop());
  }, [preview]);

  function update(next: MediaPrefs) {
    setPrefs(next);
    saveMediaPrefs(next);
  }

  async function refreshDevices(stream?: MediaStream) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    setCameras(devices.filter((device) => device.kind === 'videoinput'));
    setMics(devices.filter((device) => device.kind === 'audioinput'));
    setSpeakers(devices.filter((device) => device.kind === 'audiooutput'));
    const sinkId = loadMediaPrefs().speakerId;
    const video = videoRef.current as (HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (sinkId && video?.setSinkId) await video.setSinkId(sinkId).catch(() => undefined);
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }

  async function startPreview(next = prefs) {
    preview?.getTracks().forEach((track) => track.stop());
    try {
      assertUserMedia();
      const stream = await navigator.mediaDevices.getUserMedia(callConstraints());
      setPreview(stream);
      setError(null);
      await refreshDevices(stream);
    } catch {
      setError('Нет доступа к камере или микрофону');
    }
    void next;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-20 pb-10">
      <div>
        <h1 className="text-lg font-semibold">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Камера и микрофон используются в видеозвонках.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Устройства</h2>
        <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full rounded-xl bg-muted object-cover" />
        <DeviceSelect
          label="Камера"
          value={prefs.cameraId}
          devices={cameras}
          onChange={(cameraId) => {
            const next = { ...prefs, cameraId };
            update(next);
            if (preview) void startPreview(next);
          }}
        />
        <DeviceSelect
          label="Микрофон"
          value={prefs.microphoneId}
          devices={mics}
          onChange={(microphoneId) => {
            const next = { ...prefs, microphoneId };
            update(next);
            if (preview) void startPreview(next);
          }}
        />
        <DeviceSelect
          label="Динамик"
          value={prefs.speakerId}
          devices={speakers}
          onChange={(speakerId) => update({ ...prefs, speakerId })}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" variant="outline" onClick={() => void startPreview()}>
          {preview ? 'Обновить предпросмотр' : 'Разрешить камеру и микрофон'}
        </Button>
      </section>

      <NotificationSettings />

      <section className="flex flex-wrap gap-2">
        <Button variant="destructive" onClick={() => void logout()}>
          Выйти
        </Button>
        <Button variant="destructive" onClick={() => void logoutAll()}>
          Выйти со всех устройств
        </Button>
      </section>
    </div>
  );
}

function DeviceSelect({
  label,
  value,
  devices,
  onChange,
}: {
  label: string;
  value: string;
  devices: MediaDeviceInfo[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <select
        className="h-9 rounded-lg border border-input bg-background px-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">По умолчанию</option>
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || 'Устройство'}
          </option>
        ))}
      </select>
    </label>
  );
}
