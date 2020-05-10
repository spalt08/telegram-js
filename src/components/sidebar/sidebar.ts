/* eslint-disable import/no-cycle */
import { div } from 'core/html';
import { mount, unmount, listen } from 'core/dom';
import { useInterface } from 'core/hooks';
import wrapper from './wrapper/wrapper';
import dialogs from './dialogs/dialogs';
import settings from './settings/settings';
import newGroup from './new_group/new_group';
import contacts from './contacts_list/contacts_list';
import search from './search/search';
import info from './info/info';
import './sidebar.scss';

const elements = {
  dialogs,
  settings,
  newGroup,
  contacts,
  info,
  search,
};

type SidebarRendererMap = typeof elements;
export type SidebarState = keyof SidebarRendererMap;

type Props = {
  initial?: SidebarState,
  className?: string,
};

export type SidebarComponentProps = {
  onNavigate?: (state: SidebarState) => void;
  onBack?: () => void;
};

/**
 * Class For Managing Sidebar State
 */
export default function sidebar({ initial, className }: Props) {
  const container = div`.sidebar${className}`();
  const stack: HTMLElement[] = [];

  const popState = () => {
    // just close sidebar
    if (stack.length <= 1) {
      container.classList.add('-hided');
      return;
    }

    let element = stack.pop();

    if (element) {
      container.classList.add('-poping-state');

      element.ontransitionend = () => {
        container.classList.remove('-poping-state');
        if (element) {
          unmount(element);
          element = undefined;
        }
      };
    }
  };

  const pushState = (state: SidebarState) => {
    const element = wrapper(
      elements[state]({
        onNavigate: pushState,
        onBack: popState,
      }),
    );

    mount(container, element);
    stack.push(element);

    if (container.classList.contains('-hided')) container.classList.remove('-hided');
  };

  // unmount after closing
  listen(container, 'transitionend', () => {
    if (container.classList.contains('-hided')) {
      const element = stack.pop();
      if (element) unmount(element);
    }
  });

  if (initial) pushState(initial);

  return useInterface(container, { pushState, popState });
}
