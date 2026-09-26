import {
  loadNotificationPrefs,
  type NotificationPrefs,
} from '@features/notifications/notificationPrefs';

export type SoundName = 'message' | 'ringtone' | 'outgoing';

const SOURCES: Record<SoundName, string> = {
  message: '/sounds/message.wav',
  ringtone: '/sounds/ringtone.wav',
  outgoing: '/sounds/outgoing.wav',
};

class SoundManager {
  private unlocked = false;
  private inCall = false;
  private prefs: NotificationPrefs = loadNotificationPrefs();
  private players = new Map<SoundName, HTMLAudioElement>();

  setEnabled(prefs: NotificationPrefs): void {
    this.prefs = prefs;
    for (const audio of this.players.values()) {
      audio.volume = prefs.volume;
    }
    if (!prefs.callSound) {
      this.stop('ringtone');
      this.stop('outgoing');
    }
  }

  setInCall(active: boolean): void {
    this.inCall = active;
    if (active) this.stop('message');
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const name of Object.keys(SOURCES) as SoundName[]) {
      const audio = this.ensure(name);
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => undefined);
    }
  }

  play(name: SoundName): void {
    if (!this.canPlay(name)) return;
    const audio = this.ensure(name);
    audio.loop = false;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  loop(name: SoundName): void {
    if (!this.canPlay(name)) return;
    const audio = this.ensure(name);
    audio.loop = true;
    if (!audio.paused) return;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  stop(name: SoundName): void {
    const audio = this.players.get(name);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
  }

  private canPlay(name: SoundName): boolean {
    if (name === 'message') {
      if (!this.prefs.messageSound || this.inCall) return false;
    }
    if ((name === 'ringtone' || name === 'outgoing') && !this.prefs.callSound) {
      return false;
    }
    return true;
  }

  private ensure(name: SoundName): HTMLAudioElement {
    const existing = this.players.get(name);
    if (existing) return existing;
    const audio = new Audio(SOURCES[name]);
    audio.preload = 'auto';
    audio.volume = this.prefs.volume;
    this.players.set(name, audio);
    return audio;
  }
}

export const sound = new SoundManager();
