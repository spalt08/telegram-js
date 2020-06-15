import { listen, mount, unmount } from 'core/dom';
import { useInterface } from 'core/hooks';
import { div } from 'core/html';
import { main } from 'services';
import archive from './archived_dialogs/archived_dialogs';
import contacts from './contacts_list/contacts_list';
import dialogs from './dialogs_screen/dialogs_screen';
import info from './info/info';
import messageSearch from './message_search/message_search';
import newGroup from './new_group/new_group';
import pollResults from './poll_results/poll_results';
import settings from './settings/settings';
import sharedMedia from './shared_media/shared_media';
import searchStickers from './search_stickers/search_stickers';
import searchGifs from './search_gifs/search_gifs';
import './sidebar.scss';
import wrapper from './wrapper/wrapper';

const elements = {
  dialogs,
  archive,
  settings,
  newGroup,
  contacts,
  info,
  messageSearch,
  sharedMedia,
  pollResults,
  searchStickers,
  searchGifs,
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
      main.rightSidebarDelegate.next(undefined);
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
      },
      main.rightSidebarCtx),
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
