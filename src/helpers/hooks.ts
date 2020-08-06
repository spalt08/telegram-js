import { listen } from 'core/dom';

export function useSwipe(base: Node, onMove: (dx: number, complete: boolean) => void) {
  let dragX: number | undefined;
  let dragY: number | undefined;
  let dx: number | undefined;

  listen(base, 'touchstart', (event: TouchEvent) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      dragX = touch.clientX;
      dragY = touch.clientY;
    }
  });

  listen(base, 'touchmove', (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch || !dragX || !dragY) return;

    dx = touch.clientX - dragX;
    const dy = touch.clientY - dragY;

    if (Math.abs(dx) < Math.abs(dy) * 2) {
      onMove(dx || 0, true);
      dragX = undefined;
      return;
    }

    onMove(dx, false);
  });

  listen(base, 'touchend', () => {
    onMove(dx || 0, true);
    dx = undefined;
  });

  listen(base, 'touchcancel', () => {
    onMove(dx || 0, true);
    dx = undefined;
  });
}
