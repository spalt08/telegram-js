import { div } from 'core/html';
import { mount, unmount, listen } from 'core/dom';
import { useInterface } from 'core/hooks';
import wrapper from './wrapper/wrapper';
import dialogs from './dialogs/dialogs';
import settings from './settings/settings';
import newGroup from './new_group/new_group';
import contacts from './contacts_list/contacts_list';
import messageSearch from './message_search/message_search';
import info from './info/info';
import sharedMedia from './shared_media/shared_media';
import './sidebar.scss';

const elements = {
  dialogs,
  settings,
  newGroup,
  contacts,
  info,
  messageSearch,
  sharedMedia,
};

type SidebarRendererMap = typeof elements;
export type SidebarState = keyof SidebarRendererMap;

type Props = {
  initial?: SidebarState,
  className?: string,
  onTransitionStart?: (opening: boolean) => void,
};

export type SidebarComponentProps = {
  onNavigate?: (state: SidebarState) => void;
  onBack?: () => void;
};

/**
 * Class For Managing Sidebar State
 */
export default function sidebar({ initial, className, onTransitionStart }: Props) {
  const container = div`.sidebar${className}`();
  const stack: HTMLElement[] = [];

  const popState = () => {
    // just close sidebar
    if (stack.length <= 1) {
      if (onTransitionStart) onTransitionStart(false);
      container.classList.add('-hidden');
      return;
    }

    let element = stack.pop();

    if (element) {
      container.classList.add('-popping-state');

      element.ontransitionend = () => {
        container.classList.remove('-popping-state');
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

    if (container.classList.contains('-hidden') && onTransitionStart) onTransitionStart(true);
    container.classList.remove('-hidden');
  };

  // unmount after closing
  listen(container, 'transitionend', () => {
    if (container.classList.contains('-hidden')) {
      const element = stack.pop();
      if (element) unmount(element);
    }
  });

  if (initial) pushState(initial);

  return useInterface(container, { pushState, popState });
}
