import { BehaviorSubject } from 'rxjs';
import { animationFrameStart, listen, mount, unmount } from 'core/dom';
import { useInterface } from 'core/hooks';
import { div } from 'core/html';
import { main } from 'services';
import { MaybeObservableValue } from 'core/types';
import addBotToGroup from './add_bot_to_group/add_bot_to_group';
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
import filters from './filters_screen/filters_screen';
import filterForm from './filters_screen/filter_screen';
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
  addBotToGroup,
  filters,
  filterForm,
};

type SidebarRendererMap = typeof elements;
export type SidebarState = keyof SidebarRendererMap;
export type SidebarContext<TState extends SidebarState> = MaybeObservableValue<Parameters<SidebarRendererMap[TState]>[1]>;
export type SidebarStateAndCtx = { [K in SidebarState]: { state: K, ctx: SidebarContext<K> } }[SidebarState];

type Props = {
  initial?: SidebarStateAndCtx,
  className?: string,
  onTransitionStart?: (opening: boolean) => void,
};

export type SidebarComponentProps = {
  onNavigate?: <K extends SidebarState>(state: K, ctx: SidebarContext<K>) => void;
  onBack?: () => void;
};

/**
 * Class For Managing Sidebar State
 */
export default function sidebar({ initial, className, onTransitionStart }: Props) {
  const container = div`.sidebar${className}`();
  const wrappersMap = new Map<SidebarState, HTMLElement>();
  const contextSubjects = new Map<SidebarState, BehaviorSubject<any>>();

  const getContext = <K extends SidebarState>(state: K) => contextSubjects.get(state) as BehaviorSubject<SidebarContext<K>> | undefined;

  const setContext = <K extends SidebarState>(state: K, ctx: SidebarContext<K>) => {
    let contextSubject = contextSubjects.get(state);
    if (!contextSubject) {
      contextSubject = new BehaviorSubject(ctx);
      contextSubjects.set(state, contextSubject);
    } else {
      contextSubject.next(ctx);
    }
  };

  const popState = () => {
    // just close sidebar
    if (container.children.length <= 1) {
      main.rightSidebarDelegate.next(undefined);
      if (onTransitionStart) onTransitionStart(false);
      container.classList.add('-hidden');
      return;
    }

    const element = container.children[container.children.length - 1] as HTMLElement;

    if (element) {
      container.classList.add('-popping-state');

      element.ontransitionend = (event) => {
        if (event.target === event.currentTarget) {
          animationFrameStart().then(() => {
            container.classList.remove('-popping-state');
            if (element) {
              unmount(element);
            }
          });
        }
      };
    }
  };

  const pushState = <K extends SidebarState>(state: K, ctx: SidebarContext<K>) => {
    setContext(state, ctx);

    let element = wrappersMap.get(state);
    if (!element) {
      element = wrapper(
        (elements[state])(
          {
            onNavigate: pushState,
            onBack: popState,
          },
          getContext(state)! as any), // TypeScript will give a combinatorial explosion if you remove `as any`
      );
      wrappersMap.set(state, element);
    }

    if (container.children[container.children.length - 1] !== element) {
      mount(container, element);
    }

    if (container.classList.contains('-hidden') && onTransitionStart) onTransitionStart(true);
    container.classList.remove('-hidden');
  };

  const close = () => {
    if (onTransitionStart) onTransitionStart(false);
    container.classList.add('-hidden');
  };

  // unmount after closing
  listen(container, 'transitionend', (event) => {
    if (event.target === event.currentTarget) {
      animationFrameStart().then(() => {
        if (container.classList.contains('-hidden')) {
          const element = container.children[container.childElementCount - 1];
          if (element) unmount(element);
        }
      });
    }
  });

  if (initial) pushState(initial.state, initial.ctx);

  return useInterface(container, { pushState, popState, close });
}
