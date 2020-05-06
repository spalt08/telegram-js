
import { status } from 'components/sidebar';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { VirtualizedList, sectionSpinner, roundButton, searchInput, contextMenu } from 'components/ui';
import { div } from 'core/html';
import { getInterface, useObservable } from 'core/hooks';
import { animationFrameStart, mount, unmount, listen } from 'core/dom';
import { menuAndBack, settings, archive, group, user, savedmessages, help, newchatFilled, channel } from 'components/icons';
import { globalSearch, dialog as service } from 'services';
import dialog from '../dialog/dialog';
import globalSearchResult from '../global_search_result/global_search_result';
import type { SidebarComponentProps } from '../sidebar';
import './dialogs.scss';

export default function dialogs({ onNavigate }: SidebarComponentProps) {
  // fetch dialogs
  service.updateDialogs();

  // Subscribing to this observable directly is ok because they're created in this scope
  // therefore subscribing doesn't create an external reference to this component
  const isSearchActive = new BehaviorSubject(false);
  const showSpinnerObservable = combineLatest([service.dialogs, service.loading]).pipe(
    map(([dialogsList, isLoading]) => dialogsList.length === 0 && isLoading),
  );

  let spinner: Node | undefined;

  const searchInputEl = searchInput({
    placeholder: 'Search',
    className: 'dialogs__head_search',
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
    className: 'dialogs__button-menu',
    options: [
      { icon: group, label: 'New Group', onClick: () => onNavigate && onNavigate('newGroup') },
      { icon: user, label: 'Contacts', onClick: () => onNavigate && onNavigate('contacts') },
      { icon: archive, label: 'Archived', onClick: () => onNavigate && onNavigate('contacts') },
      { icon: savedmessages, label: 'Saved', onClick: () => onNavigate && onNavigate('contacts') },
      { icon: settings, label: 'Settings', onClick: () => onNavigate && onNavigate('settings') },
      { icon: help, label: 'Help', onClick: () => onNavigate && onNavigate('contacts') },
    ],
  });

  const newMessageMenu = contextMenu({
    className: 'dialogs__new-message-menu',
    options: [
      { icon: channel, label: 'New Channel', onClick: () => onNavigate && onNavigate('newGroup') },
      { icon: group, label: 'New Group', onClick: () => onNavigate && onNavigate('newGroup') },
      { icon: user, label: 'New Private Chat', onClick: () => onNavigate && onNavigate('newGroup') },
    ],
  });

  const writeButton = div`.dialogs__write`({ onClick: (event: MouseEvent) => {
    getInterface(newMessageMenu).toggle();
    getInterface(buttonMenu).close();
    event.stopPropagation();
  } }, newchatFilled());

  listen(writeButton, 'transitionstart', () => getInterface(newMessageMenu).close());

  const listEl = new VirtualizedList({
    className: 'dialogs',
    items: service.dialogs,
    threshold: 2,
    batch: 30,
    pivotBottom: false,
    renderer: dialog,
    onReachBottom: () => service.loadMoreDialogs(),
  });


  const dialogsLayer = div`dialogs__layer`(
    status(),
    listEl.container,
  );

  let searchResultLayer: HTMLElement | undefined;

  const handleSearchResultTransitionEnd = async () => {
    await animationFrameStart();
    if (searchResultLayer && !isSearchActive.value) {
      unmount(searchResultLayer);
      searchResultLayer = undefined;
    }
  };

  listen(searchInputEl, 'mouseenter', () => globalSearch.prepare());

  isSearchActive.pipe(distinctUntilChanged()).subscribe(async (isActive) => {
    await animationFrameStart();
    if (isActive) {
      dialogsLayer.classList.add('-down');
      if (searchResultLayer) {
        searchResultLayer.classList.remove('-up');
      } else {
        // Create the element on open and destroy on close to reduce the initial render time and save memory
        searchResultLayer = globalSearchResult({
          className: 'dialogs__layer -appearFromUp',
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

  useObservable(dialogsLayer, showSpinnerObservable, (show) => {
    if (show && !spinner) {
      mount(dialogsLayer, spinner = sectionSpinner({ className: 'dialogs__spinner' }));
    } else if (!show && spinner) {
      unmount(spinner);
      spinner = undefined;
    }
  });

  const handleButtonClick = (event: MouseEvent) => {
    if (isSearchActive.value) isSearchActive.next(false);
    else {
      getInterface(buttonMenu).toggle();
      getInterface(newMessageMenu).close();
    }

    event.stopPropagation();
  };

  return (
    div`.dialogs`(
      div`.dialogs__head`(
        buttonMenu,
        roundButton(
          {
            className: 'dialogs__head_button',
            onClick: handleButtonClick,
          },
          menuAndBack({ state: isSearchActive.pipe(map((isActive) => isActive ? 'back' : 'menu')) }),
        ),
        searchInputEl,
      ),
      div`.dialogs__body`(dialogsLayer),
      writeButton,
      newMessageMenu,
    )
  );
}
