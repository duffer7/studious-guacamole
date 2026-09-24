const STORAGE_KEY = 'media.devices';

export interface MediaPrefs {
  cameraId: string;
  microphoneId: string;
  speakerId: string;
}

const empty: MediaPrefs = { cameraId: '', microphoneId: '', speakerId: '' };

export function loadMediaPrefs(): MediaPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<MediaPrefs>;
    return {
      cameraId: parsed.cameraId ?? '',
      microphoneId: parsed.microphoneId ?? '',
      speakerId: parsed.speakerId ?? '',
    };
  } catch {
    return empty;
  }
}

export function saveMediaPrefs(prefs: MediaPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function assertUserMedia() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'Камера на телефоне доступна только по HTTPS. Откройте https:// и подтвердите сертификат.',
    );
  }
}

export function callConstraints(): MediaStreamConstraints {
  const prefs = loadMediaPrefs();
  return {
    audio: prefs.microphoneId ? { deviceId: { ideal: prefs.microphoneId } } : true,
    video: {
      deviceId: prefs.cameraId ? { ideal: prefs.cameraId } : undefined,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };
}
