import { div, text } from 'core/html';
import { materialSpinner } from 'components/icons';
import { useObservable } from 'core/hooks';
import { main } from 'services';
import './status.scss';

interface Props {
  className?: string;
}

export default function status({ className = '' }: Props = {}) {
  let isDisplayed = true;
  let timer: ReturnType<typeof setTimeout>;
  const label = text('Connecting...');
  const spinner = materialSpinner({ className: 'network-status__loader' });

  const element = div`.network-status ${className}`(
    div`.network-status__container`(
      spinner,
      label,
    ),
  );

  useObservable(element, main.network, (state: string) => {
    if (state === 'connected' && isDisplayed === true) {
      element.classList.add('hidden');
      isDisplayed = false;
      timer = setTimeout(() => {
        spinner.style.display = 'none';
      }, 1000);
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
      clearTimeout(timer);
      spinner.style.display = '';
    }
  });

  return element;
}
