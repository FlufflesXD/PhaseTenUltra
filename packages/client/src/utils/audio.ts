/**
 * Audio System for PhaseTenUltra
 * Handles sound effects for normal cards, special cards, hover animation,
 * ultimate divine descent, and background soundtrack playlist.
 */

function playAudioFile(urls: string[], volume = 0.8): void {
  try {
    if (typeof window === 'undefined') return;

    const tryPlay = (index: number) => {
      if (index >= urls.length) return;
      const audio = new Audio(urls[index]);
      audio.volume = Math.max(0, Math.min(1, volume));
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If playback failed or file was missing, try fallback URL
          tryPlay(index + 1);
        });
      }
    };

    tryPlay(0);
  } catch {
    // Silently catch any audio context errors
  }
}

/**
 * Normal card action sound effects (e.g. card_discard).
 */
export function playNormalSound(name: string, volume = 0.7): void {
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
export function playSpecialSound(name: string, volume = 0.8): void {
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
