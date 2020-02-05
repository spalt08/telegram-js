import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { list, sectionSpinner } from 'components/ui';
import { dialog as service } from 'services';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { status } from 'components/sidebar';
import dialog from './dialog/dialog';

interface Props {
  className?: string;
}

export default function dialogs({ className = '' }: Props = {}) {
  // fetch dialogs
  service.updateDialogs();

  const showSpinnerObservable = combineLatest([service.dialogs, service.loading]).pipe(
    map(([dialogsList, isLoading]) => dialogsList.length === 0 && isLoading),
  );

  const listEl = list({
    className: 'dialogs',
    items: service.dialogs,
    threshold: 600,
    batch: 20,
    renderer: (id: string) => dialog(id),
    onReachEnd: () => service.loadMoreDialogs(),
  });

  let spinner: Node | undefined;
  const element = div({ className },
    status(),
    listEl,
  );

  useObservable(element, showSpinnerObservable, (show) => {
    if (show && !spinner) {
      mount(element, spinner = sectionSpinner({ className: 'dialogs__spinner' }));
    } else if (!show && spinner) {
      unmount(spinner);
      spinner = undefined;
    }
  });

  return element;
}
