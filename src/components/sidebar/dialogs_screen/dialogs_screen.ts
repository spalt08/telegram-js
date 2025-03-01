import * as icons from 'components/icons';
import { contextMenu, roundButton, searchInput } from 'components/ui';
import { animationFrameStart, mount, unmount } from 'core/dom';
import { getInterface, useToBehaviorSubject } from 'core/hooks';
import { div } from 'core/html';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { folder as folderService, globalSearch } from 'services';
import { UnreadCount } from 'services/folder/commonTypes';
import dialogsTabs from '../dialogs_tabs/dialogs_tabs';
import globalSearchResult from '../global_search_result/global_search_result';
import './dialogs_screen.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function dialogsScreen({ onNavigate }: SidebarComponentProps) {
  const container = div`.dialogsScreen`();

  // Subscribing to this observable directly is ok because they're created in this scope
  // therefore subscribing doesn't create an external reference to this component
  const isSearchActive = new BehaviorSubject(false);

  const searchInputEl = searchInput({
    placeholder: 'Telegram Search',
    className: 'dialogsScreen__head_search',
    isLoading: combineLatest([globalSearch.isSearching, isSearchActive]).pipe(map(([isSearching, isActive]) => isSearching && isActive)),
    onFocus(value) {
      globalSearch.search(value);
      isSearchActive.next(true);
    },
    onChange(value) {
      globalSearch.search(value);
    },
  });

  // The folder index observables do a hard job on subscribe, contextMenu is unmounted when closed and useObservable subscribes when mounted.
  // Therefore the index is subscribed once here to not do the hard job on every open.
  const [archiveUnread] = useToBehaviorSubject(container, folderService.archiveIndex.unreadCount, undefined);
  const archiveBadge = archiveUnread.pipe(map(({ count }: Readonly<UnreadCount>) => (
    count ? { text: count.toString() } : undefined
  )));

  const buttonMenu = contextMenu({
    className: 'dialogsScreen__button-menu',
    options: [
      { icon: icons.group, label: 'New Group', onClick: () => onNavigate?.('newGroup', undefined) },
      { icon: icons.user, label: 'Contacts', onClick: () => onNavigate?.('contacts', undefined) },
      { icon: icons.archive, label: 'Archived', badge: archiveBadge, onClick: () => onNavigate?.('archive', undefined) },
      { icon: icons.savedmessages, label: 'Saved', onClick: () => onNavigate?.('contacts', undefined) },
      { icon: icons.settings, label: 'Settings', onClick: () => onNavigate?.('settings', undefined) },
      { icon: icons.folder, label: 'Chat Folders', onClick: () => onNavigate?.('filters', undefined) },
      { icon: icons.help, label: 'Help', onClick: () => onNavigate?.('contacts', undefined) },
    ],
  });

  const newMessageMenu = contextMenu({
    className: 'dialogsScreen__new-message-menu',
    options: [
      { icon: icons.channel, label: 'New Channel', onClick: () => onNavigate?.('newGroup', undefined) },
      { icon: icons.group, label: 'New Group', onClick: () => onNavigate?.('newGroup', undefined) },
      { icon: icons.user, label: 'New Private Chat', onClick: () => onNavigate?.('newGroup', undefined) },
    ],
  });

  const writeButton = div`.dialogsScreen__write`({ onClick: (event: MouseEvent) => {
    if (buttonMenu.parentElement) getInterface(buttonMenu).close();
    if (newMessageMenu.parentElement) getInterface(newMessageMenu).close();
    else mount(container, newMessageMenu);

    event.stopPropagation();
  } }, icons.newchatFilled());

  // listen(writeButton, 'transitionstart', () => getInterface(newMessageMenu).close());

  const dialogsLayer = dialogsTabs({ className: 'dialogsScreen__layer' });

  let searchResultLayer: HTMLElement | undefined;

  const handleSearchResultTransitionEnd = async () => {
    await animationFrameStart();
    if (searchResultLayer && !isSearchActive.value) {
      unmount(searchResultLayer);
      searchResultLayer = undefined;
    }
  };

  isSearchActive.pipe(distinctUntilChanged()).subscribe(async (isActive) => {
    await animationFrameStart();
    if (isActive) {
      dialogsLayer.classList.add('-down');
      if (searchResultLayer) {
        searchResultLayer.classList.remove('-up');
      } else {
        // Create the element on open and destroy on close to reduce the initial render time and save memory
        searchResultLayer = globalSearchResult({
          className: 'dialogsScreen__layer -appearFromUp',
          onTransitionEnd: handleSearchResultTransitionEnd,
          onAnimationEnd: handleSearchResultTransitionEnd,
          exit() {
            isSearchActive.next(false);
          },
        });
        mount(dialogsLayer.parentNode!, searchResultLayer);
      }
    } else {
      getInterface(searchInputEl).blur();
      getInterface(searchInputEl).value = '';
      dialogsLayer.classList.remove('-down');
      if (searchResultLayer) {
        searchResultLayer.classList.add('-up');
      }
    }
  });

  const handleButtonClick = (event: MouseEvent) => {
    if (isSearchActive.value) isSearchActive.next(false);
    else {
      if (newMessageMenu.parentElement) getInterface(newMessageMenu).close();
      if (buttonMenu.parentElement) getInterface(buttonMenu).close();
      else mount(container, buttonMenu);

      event.stopPropagation();
    }
  };

  mount(container, (
    div`.dialogsScreen__head`(
      roundButton(
        {
          className: 'dialogsScreen__head_button',
          onClick: handleButtonClick,
        },
        icons.menuAndBack({ state: isSearchActive.pipe(map((isActive) => isActive ? 'back' : 'menu')) }),
      ),
      searchInputEl,
    )
  ));
  mount(container, div`.dialogsScreen__body`(dialogsLayer));
  mount(container, writeButton);

  return container;
}
