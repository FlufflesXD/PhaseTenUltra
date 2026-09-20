/**
 * Audio System for PhaseTenUltra
 * Handles sound effects for normal cards, special cards, hover animation,
 * ultimate divine descent, and background soundtrack playlist.
 */

// SFX Audio element pool to prevent garbage collection drops, decoding lag, or playback interruptions
const sfxPool = new Map<string, HTMLAudioElement[]>();

function playAudioFile(urls: string[], volume = 0.85): void {
  if (typeof window === 'undefined') return;
  if (!urls || urls.length === 0) return;

  const url = urls[0];
  try {
    let pool = sfxPool.get(url);
    if (!pool) {
      pool = [];
      sfxPool.set(url, pool);
    }

    // Find an existing available audio element or create a new one
    let audio = pool.find(a => a.paused || a.ended);
    if (!audio) {
      audio = new Audio(url);
      audio.preload = 'auto';
      pool.push(audio);
    }

    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // If primary URL failed, try fallback if available
        if (urls.length > 1) {
          playAudioFile(urls.slice(1), volume);
        }
      });
    }
  } catch {
    // Silently catch any audio context errors
  }
}

// Automatically unlock audio and pre-warm key SFX on first user click/touch
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const warmUrls = [
        '/sounds/normal/card_discard.mp3',
        '/sounds/special/hover.mp3',
        '/sounds/special/jester.mp3'
      ];
      warmUrls.forEach(url => {
        let pool = sfxPool.get(url);
        if (!pool) {
          const a = new Audio(url);
          a.preload = 'auto';
          sfxPool.set(url, [a]);
        }
      });
    } catch {
      // ignore
    }
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

/**
 * Normal card action sound effects (e.g. card_discard).
 */
export function playNormalSound(name: string, volume = 0.85): void {
  playAudioFile([
    `/sounds/normal/${name}.mp3`,
    `/sounds/normal/${name}.ogg`
  ], volume);
}

/**
 * Special card 3-second Totem of Undying hover animation sound.
 */
export function playHoverSound(volume = 0.85): void {
  playAudioFile([
    '/sounds/special/hover.mp3',
    '/sounds/special/hover.ogg'
  ], volume);
}

/**
 * Unique ability sound effect for special cards (e.g. crack, nuke, time).
 */
export function playSpecialSound(name: string, volume = 0.85): void {
  playAudioFile([
    `/sounds/special/${name}.mp3`,
    `/sounds/special/${name}.ogg`,
    `/sounds/${name}.ogg`
  ], volume);
}

/**
 * Ultimate card 6-second Divine Descent heavenly ray sound.
 */
export function playUltimateDescendSound(volume = 0.9): void {
  playAudioFile([
    '/sounds/ultimate/descend.mp3',
    '/sounds/ultimate/descend.ogg'
  ], volume);
}

// -------------------------------------------------------------
// Background Soundtrack Playlist Manager
// -------------------------------------------------------------

const SOUNDTRACK_PLAYLIST = [
  '/sounds/normal/soundtrack/Forgotten%20Biomes.ogg',
  '/sounds/normal/soundtrack/Strange%20Worlds.ogg'
];

class SoundtrackManager {
  private currentTrackIndex = -1;
  private audio: HTMLAudioElement | null = null;
  private isMuted = false;
  private volume = 0.18;
  private isRunning = false;
  private autoplayListenerAttached = false;

  public start(volume = 0.18): void {
    if (typeof window === 'undefined') return;
    this.volume = volume;
    this.isRunning = true;

    if (this.audio && !this.audio.paused) {
      return;
    }

    this.playNextTrack();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.audio) {
      this.audio.volume = muted ? 0 : this.volume;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
      this.audio = null;
    }
    this.currentTrackIndex = -1;
  }

  private playNextTrack(): void {
    if (!this.isRunning || typeof window === 'undefined') return;

    // Pick next track strictly different from current track
    let nextIndex = 0;
    if (SOUNDTRACK_PLAYLIST.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * SOUNDTRACK_PLAYLIST.length);
      } while (nextIndex === this.currentTrackIndex);
    }

    this.currentTrackIndex = nextIndex;
    const trackUrl = SOUNDTRACK_PLAYLIST[nextIndex];

    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
    }

    const audio = new Audio(trackUrl);
    audio.volume = this.isMuted ? 0 : this.volume;
    audio.onended = () => {
      this.playNextTrack();
    };

    this.audio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy prevented playback. Listen for first user gesture to resume.
        if (!this.autoplayListenerAttached) {
          this.autoplayListenerAttached = true;
          const unlockAutoplay = () => {
            if (this.isRunning && this.audio) {
              this.audio.play().catch(() => {});
            }
            window.removeEventListener('pointerdown', unlockAutoplay);
            window.removeEventListener('keydown', unlockAutoplay);
            this.autoplayListenerAttached = false;
          };
          window.addEventListener('pointerdown', unlockAutoplay, { once: true });
          window.addEventListener('keydown', unlockAutoplay, { once: true });
        }
      });
    }
  }
}

export const soundtrackManager = new SoundtrackManager();
