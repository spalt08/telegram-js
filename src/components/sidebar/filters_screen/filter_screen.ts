import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { DialogFilter, InputPeer } from 'mtproto-js';
import { div, text } from 'core/html';
import { contextMenu, heading, HeadingIcon, VirtualizedList } from 'components/ui';
import * as icons from 'components/icons';
import { getInterface, useObservable } from 'core/hooks';
import { mount, unmount } from 'core/dom';
import { folder as folderService, peer as peerService, main as mainService } from 'services';
import { MaybeObservable } from 'core/types';
import { inputPeerToPeer } from 'helpers/api';
import { humanizeError } from 'helpers/humanizeError';
import filterInfo from './filter_info';
import filterListItem, { expandButtonFilterListItem, peerFilterListItem } from './filter_list_item';
import './filter_screen.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

interface FilterListData {
  readonly filter: Readonly<DialogFilter>;
  readonly expandIncluded: boolean;
  readonly expandExcluded: boolean;
}

const maxShrinkPeersCount = 5;

const emptyFilter: Readonly<DialogFilter> = {
  _: 'dialogFilter',
  contacts: false,
  non_contacts: false,
  groups: false,
  broadcasts: false,
  bots: false,
  exclude_muted: false,
  exclude_read: false,
  exclude_archived: false,
  id: 0,
  title: '',
  pinned_peers: [],
  include_peers: [],
  exclude_peers: [],
};

const setsInfos = {
  contacts: [icons.user, 'Contacts'] as const,
  'non-contacts': [icons.noncontacts, 'Non-Contacts'] as const,
  groups: [icons.group, 'Groups'] as const,
  channels: [icons.channel, 'Channels'] as const,
  bots: [icons.bots, 'Bots'] as const,
  muted: [icons.mute, 'Muted'] as const,
  archived: [icons.archive, 'Archived'] as const,
  read: [icons.readchats, 'Read'] as const,
};

function stringifyInputPeer(peer: Readonly<InputPeer>) {
  return JSON.stringify(peer);
}

function parseInputPeer(str: string) {
  return JSON.parse(str) as Readonly<InputPeer>;
}

function getCollapsedPeersCount(totalCount: number) {
  const shownCount = totalCount <= maxShrinkPeersCount ? totalCount : Math.min(maxShrinkPeersCount - 1, totalCount);
  return totalCount - shownCount;
}

function makePeerListItems(peers: readonly Readonly<InputPeer>[], isExpanded: boolean, expandItemId: string) {
  const items: string[] = [];
  const collapsePeersCount = getCollapsedPeersCount(peers.length);

  (isExpanded ? peers : peers.slice(0, peers.length - collapsePeersCount)).forEach((peer) => {
    items.push(`peer_${stringifyInputPeer(peer)}`);
  });

  if (collapsePeersCount > 0) {
    items.push(expandItemId);
  }

  return items;
}

function renderHeader(isCreating: boolean, onBack?: () => void, onSave?: () => void, onDelete?: () => void) {
  const commonButtons: HeadingIcon[] = [
    { icon: icons.back, position: 'left', onClick: () => onBack?.() },
    { icon: icons.check, position: 'right', color: 'accent', onClick: () => onSave?.() },
  ];

  if (isCreating) {
    return heading({
      title: isCreating ? 'New Folder' : 'Edit Folder',
      buttons: commonButtons,
      className: 'filterScreen__head',
    });
  }

  let header: HTMLElement;

  const moreContextMenu = contextMenu({
    className: 'filterScreen__head_context-menu',
    options: [
      { icon: icons.del, color: 'danger', label: 'Delete Folder', onClick: () => onDelete?.() },
    ],
  });

  const toggleContextMenu = (event: MouseEvent) => {
    if (moreContextMenu.parentElement) getInterface(moreContextMenu).close();
    else mount(header, moreContextMenu);

    event.stopPropagation();
  };

  header = heading({
    title: isCreating ? 'New Folder' : 'Edit Folder',
    buttons: [
      ...commonButtons,
      { icon: icons.more, position: 'right', onClick: toggleContextMenu },
    ],
    className: 'filterScreen__head',
  });

  return header;
}

function renderListItem(
  item: string,
  filterListData: BehaviorSubject<FilterListData>,
  isCreating: MaybeObservable<boolean>,
  titleSubject: BehaviorSubject<string>,
  onNavigate: SidebarComponentProps['onNavigate'],
) {
  if (item === 'info') {
    return filterInfo(isCreating, titleSubject);
  }

  if (item === 'includedHeader' || item === 'excludedHeader') {
    return div(
      div`.filterScreen__header`(
        text(item === 'includedHeader' ? 'Included chats' : 'Excluded chats'),
      ),
      filterListItem(icons.add(), 'Add Chats', true, () => console.log('Todo edit peers list')),
    );
  }

  if (item === 'expandIncluded') {
    return expandButtonFilterListItem(
      filterListData.pipe(map(({ filter, expandIncluded }) => ({
        isExpanded: expandIncluded,
        collapseCount: getCollapsedPeersCount(filter.include_peers.length + filter.pinned_peers.length) }),
      )),
      () => filterListData.next({ ...filterListData.value, expandIncluded: !filterListData.value.expandIncluded }),
    );
  }

  if (item === 'expandExcluded') {
    return expandButtonFilterListItem(
      filterListData.pipe(map(({ filter, expandExcluded }) => ({
        isExpanded: expandExcluded,
        collapseCount: getCollapsedPeersCount(filter.exclude_peers.length) }),
      )),
      () => filterListData.next({ ...filterListData.value, expandExcluded: !filterListData.value.expandExcluded }),
    );
  }

  if (item in setsInfos) {
    const setInfo = setsInfos[item as keyof typeof setsInfos];
    return filterListItem(setInfo[0](), setInfo[1]);
  }

  if (item.startsWith('peer_')) {
    const inputPeer = parseInputPeer(item.slice(5));
    const peer = inputPeerToPeer(inputPeer);
    return peer
      ? peerFilterListItem(peer)
      : filterListItem(undefined, 'Unknown peer');
  }

  if (process.env.NODE_ENV) {
    // eslint-disable-next-line no-console
    console.error(`Unknown filter list item "${item}", ignoring it. Please check the code for typos.`);
  }
  return div();
}

export default function filterScreen(
  { onBack, onNavigate }: SidebarComponentProps,
  filterSubject: BehaviorSubject<Readonly<DialogFilter> | undefined>,
) {
  let header: HTMLElement | undefined;

  // A separate subject is used for title to not recheck the list on every letter input
  const titleSubject = new BehaviorSubject<string>('');

  const isCreating = filterSubject.pipe(map((filter) => !filter), distinctUntilChanged());

  const filterListData = new BehaviorSubject<FilterListData>({
    filter: emptyFilter,
    expandIncluded: false,
    expandExcluded: false,
  });

  const listItems = new BehaviorSubject<string[]>([]);
  const listDriver = new VirtualizedList({
    items: listItems,
    threshold: 2,
    batch: 20,
    pivotBottom: false,
    topReached: true,
    className: 'filterScreen__body',
    renderer: (id) => renderListItem(
      id,
      filterListData,
      isCreating,
      titleSubject,
      onNavigate,
    ),
  });

  async function saveFilter() {
    const filter = {
      ...filterListData.value.filter,
      title: titleSubject.value,
    };
    const isNew = !filterSubject.value;

    try {
      if (isNew) {
        await folderService.createFilter(filter);
      } else {
        await folderService.changeFilter(filter);
      }
    } catch (error) {
      mainService.showPopup('alert', {
        title: `Couldn't ${isNew ? 'create' : 'edit'} the folder`,
        body: humanizeError(error.message),
      });
      return;
    }

    // eslint-disable-next-line no-unused-expressions
    onBack?.();
  }

  function deleteFilter() {
    if (filterSubject.value) {
      folderService.removeFilter(filterSubject.value.id);
      // eslint-disable-next-line no-unused-expressions
      onBack?.();
    }
  }

  const content = (
    div`.filterScreen`(
      listDriver.container,
    )
  );

  // Reset the values when a new filter arrives.
  // The observable is marked as not pure to reset the form data when the screen is requested,
  // otherwise you'll see the unsaved data when you reopen the same filter.
  useObservable(content, filterSubject, false, (filter) => {
    listDriver.clear();
    titleSubject.next(filter ? filter.title : emptyFilter.title);
    filterListData.next({
      filter: filter ?? emptyFilter,
      expandIncluded: false,
      expandExcluded: false,
    });
    if (filter) {
      peerService.loadMissingPeers([...filter.include_peers, ...filter.pinned_peers, ...filter.exclude_peers]);
    }
  });

  // Rebuild the header when the screen type changes
  useObservable(content, isCreating, true, (creating) => {
    if (header) {
      unmount(header);
    }
    header = renderHeader(creating, onBack, saveFilter, deleteFilter);
    mount(content, header, content.firstChild ?? undefined);
  });

  // Watches the list content
  filterListData.subscribe(({ filter, expandIncluded, expandExcluded }) => {
    const items = ['info', 'includedHeader'];

    if (filter.contacts) {
      items.push('contacts');
    }
    if (filter.non_contacts) {
      items.push('non-contacts');
    }
    if (filter.groups) {
      items.push('groups');
    }
    if (filter.broadcasts) {
      items.push('channels');
    }
    if (filter.bots) {
      items.push('bots');
    }

    // Pinned peers aren't added to included explicitly
    items.push(...makePeerListItems([...filter.pinned_peers, ...filter.include_peers], expandIncluded, 'expandIncluded'));
    items.push('excludedHeader');

    if (filter.exclude_muted) {
      items.push('muted');
    }
    if (filter.exclude_archived) {
      items.push('archived');
    }
    if (filter.exclude_read) {
      items.push('read');
    }

    items.push(...makePeerListItems(filter.exclude_peers, expandExcluded, 'expandExcluded'));
    listItems.next(items);
  });

  return content;
}
