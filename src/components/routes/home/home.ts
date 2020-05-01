import { div } from 'core/html';
import { useObservable, getInterface } from 'core/hooks';
import { main, RightSidebarPanel } from 'services';
import messages from './messages';
import leftSidebar from './left_sidebar/left_sidebar';
import rightSidebar from './right_sidebar/right_sidebar';
import './home.scss';

const RIGHT_SIDEBAR_WIDTH = 360;

/**
 * Handler for route /
 */
export default function home() {
  const rightSidebarElement = rightSidebar();
  const rightSidebarWrapper = div`.home__right_sidebar`(rightSidebarElement);

  const container = div`.home`(
    leftSidebar({ className: 'home__left_sidebar' }),
    messages({ className: 'home__content' }),
    rightSidebarWrapper,
  );

  useObservable(rightSidebarElement, main.rightSidebarPanel, (panel) => {
    getInterface(rightSidebarElement).setWidth(RIGHT_SIDEBAR_WIDTH);
    rightSidebarWrapper.style.width = `${panel ? RIGHT_SIDEBAR_WIDTH : 0}px`;
    rightSidebarWrapper.classList.toggle('visible', panel !== RightSidebarPanel.None);
  });

  return container;
}
