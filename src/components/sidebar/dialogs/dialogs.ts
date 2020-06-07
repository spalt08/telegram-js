import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { useObservable } from 'core/hooks';
import { status } from 'components/sidebar';
import { VirtualizedList, sectionSpinner } from 'components/ui';
import { dialog as service } from 'services';
import { mount, unmount } from 'core/dom';
import { div } from 'core/html';
import dialog from '../dialog/dialog';
import './dialogs.scss';

interface Props {
  className?: string;
}

export default function dialogs({ className }: Props = {}) {
  // fetch dialogs
  service.updateDialogs();

  const showSpinnerObservable = combineLatest([service.dialogs, service.loading]).pipe(
    map(([dialogsList, isLoading]) => dialogsList.length === 0 && isLoading),
  );

  let spinner: Node | undefined;

  const listEl = new VirtualizedList({
    className: 'dialogs__list',
    items: service.dialogs,
    threshold: 2,
    batch: 20,
    pivotBottom: false,
    renderer: dialog,
    onReachBottom: () => service.loadMoreDialogs(),
  });

  const element = div(
    { className },
    status({ className: 'dialogs__status' }),
    listEl.container,
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
