import { div } from 'core/html';
import { useObservable, getInterface } from 'core/hooks';
import { main, RightSidebarPanel } from 'services';
import messages from './messages';
import dialogs from './dialogs';
import menu from './menu/menu';
import rightSidebar from './right_sidebar/right_sidebar';
import './home.scss';

/**
 * Handler for route /
 */
export default function home() {
  const rightSidebarElement = rightSidebar();
  const rightSidebarWrapper = div`.home__right_sidebar`(rightSidebarElement);

  const container = div`.home`(
    div`.home__sidebar`(
      menu({ className: 'home__menu' }),
      dialogs({ className: 'home__dialogs' }),
    ),
    messages({ className: 'home__content' }),
    rightSidebarWrapper,
  );

  const width = 360;

  useObservable(rightSidebarElement, main.rightSidebarPanel, (panel) => {
    getInterface(rightSidebarElement).setWidth(width);
    rightSidebarWrapper.style.width = `${panel ? width : 0}px`;
    rightSidebarWrapper.classList.toggle('visible', panel !== RightSidebarPanel.None);
  });

  return container;
}
