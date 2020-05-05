import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { VirtualizedList, sectionSpinner } from 'components/ui';
import { dialog as service } from 'services';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { status } from 'components/sidebar';
import dialog from '../dialog/dialog';

interface Props extends Record<string, any> {}

export default function dialogs(props: Props = {}) {
  // fetch dialogs
  service.updateDialogs();

  const showSpinnerObservable = combineLatest([service.dialogs, service.loading]).pipe(
    map(([dialogsList, isLoading]) => dialogsList.length === 0 && isLoading),
  );

  const listEl = new VirtualizedList({
    className: 'dialogs',
    items: service.dialogs,
    threshold: 2,
    batch: 30,
    pivotBottom: false,
    renderer: dialog,
    onReachBottom: () => service.loadMoreDialogs(),
  });

  let spinner: Node | undefined;
  const element = div(props,
    status(),
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
