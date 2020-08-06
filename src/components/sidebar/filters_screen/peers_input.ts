import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Peer } from 'mtproto-js';
import { simpleList } from 'components/ui';
import { div, input, text } from 'core/html';
import { peerToId } from 'helpers/api';
import { MaybeObservable } from 'core/types';
import { useMaybeObservable, useObservable, useOnMount } from 'core/hooks';
import { animationFrameStart, listen, mount, unmount, unmountChildren } from 'core/dom';
import * as icons from 'components/icons';
import { peerToTitle, useWaitForPeerLoaded } from 'cache/accessors';
import { profileAvatar } from 'components/profile';
import { auth as authService } from 'services';
import { getFirstWord } from 'helpers/data';
import { KeyboardKeys } from 'const';
import { PeersType, typesInfos } from './constants';
import './peers_input.scss';

export interface PeersInputType {
  _: 'type';
  type: PeersType;
}

export interface PeersInputPeer {
  _: 'peer';
  peer: Peer;
}

export type PeersInputItem = PeersInputType | PeersInputPeer;

interface Props {
  className?: string;
  items: Observable<readonly PeersInputItem[]>;
  searchValue: BehaviorSubject<string>;
  onItemRemove(item: PeersInputItem): void;
}

function inputItem(
  icon: MaybeObservable<Node | undefined>,
  title: MaybeObservable<string>,
  isSelected: MaybeObservable<boolean>,
  onSelect: (select: boolean) => void,
  onRemove: () => void,
) {
  const iconContainer = div`.filterPeersInput__item_icon`();
  let removeIcon: HTMLElement | undefined;

  const element = (
    div`.filterPeersInput__item`(
      iconContainer,
      div`.filterPeersInput__item_title`(text(title)),
    )
  );

  listen(element, 'mouseenter', () => onSelect(true));
  listen(element, 'mouseleave', () => onSelect(false));

  listen(element, 'click', (event) => {
    event.preventDefault(); // to not close the keyboard on mobile phones
  });

  useMaybeObservable(element, icon, true, (iconNode) => {
    unmountChildren(iconContainer);
    if (iconNode) {
      mount(iconContainer, iconNode);
    }
  });

  useMaybeObservable(element, isSelected, true, (selected) => {
    element.classList.toggle('-selected', selected);
    if (selected) {
      removeIcon = div`.filterPeersInput__item_icon`({ onClick: onRemove }, icons.close());
      unmount(iconContainer);
      mount(element, removeIcon, element.firstChild);
    } else if (removeIcon) {
      unmount(removeIcon);
      mount(element, iconContainer, element.firstChild);
      removeIcon = undefined;
    }
  });

  return element;
}

function typeInputItem(
  { type }: PeersInputType,
  isSelected: MaybeObservable<boolean>,
  onSelect: (select: boolean) => void,
  onRemove: () => void,
) {
  const typeInfo = typesInfos[type as keyof typeof typesInfos] as (typeof typesInfos)[keyof typeof typesInfos] | undefined;

  return inputItem(
    typeInfo?.[0](),
    typeInfo?.[1] ?? 'Unknown',
    isSelected,
    onSelect,
    onRemove,
  );
}

function peerInputItem(
  { peer }: PeersInputPeer,
  isSelected: MaybeObservable<boolean>,
  onSelect: (select: boolean) => void,
  onRemove: () => void,
) {
  const [, title] = peerToTitle(peer, authService.userID);
  const icon = new BehaviorSubject<Node | undefined>(undefined);

  const item = inputItem(icon, title.pipe(map(getFirstWord)), isSelected, onSelect, onRemove);

  useWaitForPeerLoaded(item, peer, () => icon.next(profileAvatar(peer, undefined, true)));

  return item;
}

function inputSearch(value: BehaviorSubject<string>, onEmptyDelete: () => void) {
  const element = input`.filterPeersInput__input`({ value, placeholder: 'Search' });

  listen(element, 'input', () => value.next(element.value));
  listen(element, 'keydown', (event) => {
    switch (event.keyCode) {
      case KeyboardKeys.BACKSPACE:
        if (element.selectionStart === 0 && element.selectionEnd === 0) {
          onEmptyDelete();
          element.focus();
        }
        break;
      case KeyboardKeys.DELETE: {
        const valueLength = element.value.length;
        if (element.selectionStart === valueLength && element.selectionEnd === valueLength) {
          onEmptyDelete();
          element.focus();
        }
        break;
      }
      default:
    }
  });

  return element;
}

function getItemKey(item: PeersInputItem | { _: 'search' }) {
  switch (item._) {
    case 'type': return `type_${item.type}`;
    case 'peer': return `peer_${peerToId(item.peer)}`;
    case 'search': return 'search';
    default: return '';
  }
}

export default function peersInput({ className = '', items: itemsObservable, searchValue, onItemRemove }: Props) {
  const selectedItem = new BehaviorSubject<string | undefined>(undefined);
  let latestItems: readonly PeersInputItem[] = [];

  function handleSearchEmptyBackspace() {
    const itemIndex = latestItems.findIndex((item) => getItemKey(item) === selectedItem.value);
    const item = latestItems[itemIndex];
    let nextItem: PeersInputItem | undefined;
    if (item) {
      onItemRemove(item);
      nextItem = latestItems[Math.max(0, itemIndex - 1)];
    } else {
      nextItem = latestItems[latestItems.length - 1];
    }
    selectedItem.next(nextItem && getItemKey(nextItem));
  }

  const element = simpleList({
    props: { className: `filterPeersInput ${className}` },
    items: itemsObservable.pipe(map((items) => [...items, { _: 'search' as const }])),
    getItemKey,
    render(item) {
      const key = getItemKey(item);
      switch (item._) {
        case 'type':
          return typeInputItem(
            item,
            selectedItem.pipe(map((selected) => selected === key)),
            (selected) => selectedItem.next(selected ? key : undefined),
            () => onItemRemove(item),
          );
        case 'peer':
          return peerInputItem(
            item,
            selectedItem.pipe(map((selected) => selected === key)),
            (selected) => selectedItem.next(selected ? key : undefined),
            () => onItemRemove(item),
          );
        case 'search':
          return inputSearch(searchValue, handleSearchEmptyBackspace);
        default:
          return div();
      }
    },
  });

  useObservable(element, itemsObservable, true, (items) => latestItems = items);

  // Scroll to the bottom on mount
  useOnMount(element, () => {
    animationFrameStart().then(() => element.scrollTop = element.scrollHeight);
  });

  useObservable(element, searchValue, true, () => selectedItem.next(undefined));

  return element;
}
