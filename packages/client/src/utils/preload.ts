/**
 * Preloads all card assets into the browser's image cache
 * so cards render instantaneously when drawn or revealed.
 */
export function preloadCardImages(): void {
  if (typeof window === 'undefined') return;

  const colors = ['red', 'blue', 'green', 'yellow'];
  const urls: string[] = [];

  // All 48 standard number cards
  for (const color of colors) {
    for (let num = 1; num <= 12; num++) {
      urls.push(`/cards/${color}_${num}.png`);
    }
  }

  // Action and special cards
  urls.push('/cards/wild.png', '/cards/skip.png', '/cards/back.png');

  // Trigger browser background load
  for (const url of urls) {
    const img = new Image();
    img.src = url;
  }
}
