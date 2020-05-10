import { div } from 'core/html';
import { useObservable, getInterface } from 'core/hooks';
import { main } from 'services';
import sidebar from 'components/sidebar/sidebar';
import { withContextMenu } from 'components/global_context_menu';
import history from './main/history';
import './home.scss';

/**
 * Handler for route /
 */
export default function home() {
  const rightSidebar = sidebar({ className: '-right -hided' });
  const container = div`.home`(
    sidebar({ initial: 'dialogs', className: '-left' }),
    history(),
    rightSidebar,
  );

  useObservable(container, main.rightSidebarDelegate, (state) => {
    if (state) getInterface(rightSidebar).pushState(state);
  });

  return withContextMenu(container);
}
