import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { roundButton, searchInput, contextMenu } from 'components/ui';
import { div } from 'core/html';
import { getInterface } from 'core/hooks';
import { animationFrameStart, mount, unmount } from 'core/dom';
import * as icons from 'components/icons';
import { globalSearch } from 'services';
import dialogs from '../dialogs/dialogs';
import globalSearchResult from '../global_search_result/global_search_result';
import './dialogs_screen.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function dialogsScreen({ onNavigate }: SidebarComponentProps) {
  let container: HTMLElement;

  // Subscribing to this observable directly is ok because they're created in this scope
  // therefore subscribing doesn't create an external reference to this component
  const isSearchActive = new BehaviorSubject(false);

  const searchInputEl = searchInput({
    placeholder: 'Search',
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

  const buttonMenu = contextMenu({
    className: 'dialogsScreen__button-menu',
    options: [
      { icon: icons.group, label: 'New Group', onClick: () => onNavigate && onNavigate('newGroup') },
      { icon: icons.user, label: 'Contacts', onClick: () => onNavigate && onNavigate('contacts') },
      { icon: icons.archive, label: 'Archived', onClick: () => onNavigate && onNavigate('contacts') },
      { icon: icons.savedmessages, label: 'Saved', onClick: () => onNavigate && onNavigate('contacts') },
      { icon: icons.settings, label: 'Settings', onClick: () => onNavigate && onNavigate('settings') },
      { icon: icons.help, label: 'Help', onClick: () => onNavigate && onNavigate('contacts') },
    ],
  });

  const newMessageMenu = contextMenu({
    className: 'dialogsScreen__new-message-menu',
    options: [
      { icon: icons.channel, label: 'New Channel', onClick: () => onNavigate && onNavigate('newGroup') },
      { icon: icons.group, label: 'New Group', onClick: () => onNavigate && onNavigate('newGroup') },
      { icon: icons.user, label: 'New Private Chat', onClick: () => onNavigate && onNavigate('newGroup') },
    ],
  });

  const writeButton = div`.dialogsScreen__write`({ onClick: (event: MouseEvent) => {
    if (buttonMenu.parentElement) getInterface(buttonMenu).close();
    if (newMessageMenu.parentElement) getInterface(newMessageMenu).close();
    else mount(container, newMessageMenu);

    event.stopPropagation();
  } }, icons.newchatFilled());

  // listen(writeButton, 'transitionstart', () => getInterface(newMessageMenu).close());

  const dialogsLayer = dialogs({ className: 'dialogsScreen__layer' });

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

  return (
    container = div`.dialogsScreen`(
      div`.dialogsScreen__head`(
        roundButton(
          {
            className: 'dialogsScreen__head_button',
            onClick: handleButtonClick,
          },
          icons.menuAndBack({ state: isSearchActive.pipe(map((isActive) => isActive ? 'back' : 'menu')) }),
        ),
        searchInputEl,
      ),
      div`.dialogsScreen__body`(dialogsLayer),
      writeButton,
    )
  );
}
