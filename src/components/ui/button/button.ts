import { text } from 'core/html';
import { MaybeObservable } from 'core/types';
import { useMaybeObservable } from 'core/hooks';
import { mount, unmount } from 'core/dom';
import ripple from '../ripple/ripple';
import { materialSpinner } from '../../icons';
import './button.scss';

type Props = {
  label?: MaybeObservable<string>,
  disabled?: MaybeObservable<boolean>,
  loading?: MaybeObservable<boolean>,
};

/**
 * Basic button
 */
export default function button({ label = '', disabled, loading }: Props) {
  const element = (
    ripple({ tag: 'button', className: 'button', disabled }, [
      text(label),
    ])
  );

  let spinner: Node | undefined;

  useMaybeObservable(element, loading, true, (isLoading) => {
    if (isLoading && !spinner) {
      element.classList.add('loading');
      spinner = materialSpinner({ class: 'button__spinner' });
      mount(element, spinner);
    } else if (!isLoading && spinner) {
      element.classList.remove('loading');
      unmount(spinner);
      spinner = undefined;
    }
  });

  return element;
}
