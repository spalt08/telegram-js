import { div, text } from 'core/html';
import { materialSpinner } from 'components/icons';
import { useObservable } from 'core/hooks';
import { main } from 'services';
import './status.scss';

export default function status() {
  let isDisplayed = true;
  const label = text('Connecting...');

  const element = div`.network-status`(
    div`.network-status__container`(
      materialSpinner({ className: 'network-status__loader' }),
      label,
    ),
  );

  useObservable(element, main.network, (state: string) => {
    if (state === 'connected' && isDisplayed === true) {
      element.classList.add('hidden');
      isDisplayed = false;
    }

    if (state === 'waiting') {
      label.textContent = 'Waiting for network...';
    }

    if (state === 'disconnected') {
      label.textContent = 'Connecting...';
    }

    if (isDisplayed === false && (state === 'waiting' || state === 'disconnected')) {
      element.classList.remove('hidden');
      isDisplayed = true;
    }
  });

  return element;
}
