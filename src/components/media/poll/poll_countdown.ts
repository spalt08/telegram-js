import { isMounted, svgEl } from 'core/dom';
import { useOnMount } from 'core/hooks';
import { div, text } from 'core/html';
import { polls } from 'services';
import './poll_countdown.scss';

const radius = 6;
const strokeWidth = 2;
const size = radius * 2 + strokeWidth;

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export default function pollCountdown(startDate: number, endDate: number) {
  const circleEl = svgEl('circle', { cx: radius + strokeWidth / 2, cy: radius + strokeWidth / 2, r: radius });
  const countdownEl = svgEl('svg', { width: size, height: size }, [circleEl]);
  const timerText = text('');
  const container = div`.pollCountdown`(timerText, countdownEl);

  let secondsLeft = 0;
  const renderFrame = () => {
    const now = (Date.now() - polls.timeDiff.value) / 1000;
    const progress = Math.max(0, Math.min(1, (now - startDate) / (endDate - startDate)));

    const strokeLength = 2 * Math.PI * radius * progress;
    circleEl.style.strokeDasharray = `0 ${strokeLength} 1000`;
    const newSecondsLeft = Math.ceil(endDate - now);
    if (secondsLeft !== newSecondsLeft) {
      secondsLeft = newSecondsLeft;
      timerText.textContent = formatTime(secondsLeft);
      if (secondsLeft <= 5) {
        container.classList.add('-hurry-up');
      }
    }
    if (progress < 1 && isMounted(container)) {
      requestAnimationFrame(renderFrame);
    }
  };

  const now = (Date.now() - polls.timeDiff.value) / 1000;
  const progress = Math.max(0, Math.min(1, (now - startDate) / (endDate - startDate)));
  if (progress < 1) {
    useOnMount(container, () => {
      requestAnimationFrame(renderFrame);
    });
  }

  return container;
}
