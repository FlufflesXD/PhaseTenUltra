/**
 * Utility to play custom card sound effects from /sounds/<name>.ogg.
 * Gracefully ignores errors if the audio file has not been uploaded yet
 * or if browser autoplay restrictions prevent playback.
 */
export function playSpecialSound(name: string, volume = 0.8): void {
  try {
    if (typeof window === 'undefined') return;
    const audio = new Audio(`/sounds/${name}.ogg`);
    audio.volume = Math.max(0, Math.min(1, volume));
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Audio file does not exist yet or autoplay was blocked; silently catch.
      });
    }
  } catch {
    // Gracefully ignore any audio context errors
  }
}
