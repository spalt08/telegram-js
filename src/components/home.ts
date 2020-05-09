import { div } from 'core/html';
import { useObservable, getInterface } from 'core/hooks';
import { main, RightSidebarPanel } from 'services';
import sidebar from 'components/sidebar/sidebar';
import { withContextMenu } from 'components/global_context_menu';
import rightSidebar from 'components/sidebar/right_sidebar/right_sidebar';
import history from './main/history';
import './home.scss';

const RIGHT_SIDEBAR_WIDTH = 360;

/**
 * Handler for route /
 */
export default function home() {
  const rightSidebarElement = rightSidebar();
  const rightSidebarWrapper = div`.home__right_sidebar`(rightSidebarElement);

  const container = div`.home`(
    sidebar({ kind: 'left', initial: 'dialogs', className: '-left' }),
    history(),
    rightSidebarWrapper,
  );

  useObservable(rightSidebarElement, main.rightSidebarPanel, (panel) => {
    getInterface(rightSidebarElement).setWidth(RIGHT_SIDEBAR_WIDTH);
    rightSidebarWrapper.style.width = `${panel ? RIGHT_SIDEBAR_WIDTH : 0}px`;
    rightSidebarWrapper.classList.toggle('visible', panel !== RightSidebarPanel.None);
  });

  return withContextMenu(container);
}
