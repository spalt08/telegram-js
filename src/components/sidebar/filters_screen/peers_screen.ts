import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { InputPeer } from 'mtproto-js';
import { div, text } from 'core/html';
import { heading, VirtualizedList } from 'components/ui';
import * as icons from 'components/icons';
import { useObservable } from 'core/hooks';
import { inputPeerToPeer, peerToId } from 'helpers/api';
import { PeersType, typesInfos, typesToExclude, typesToInclude } from './constants';
import peersListItem from './peers_list_item';
import peersInput, { PeersInputItem } from './peers_input';
import './peers_screen.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export interface ScreenCtx {
  peers: readonly Readonly<InputPeer>[];
  types: ReadonlySet<PeersType>;
  typesFor?: 'included' | 'excluded';
  onSubmit?(peers: ReadonlyMap<string, InputPeer>, types: ReadonlySet<PeersType>): void;
}

function renderListItem(
  item: string,
  selectedPeers: Observable<ReadonlyMap<string, InputPeer>>,
  selectedTypes: Observable<ReadonlySet<PeersType>>,
  onPeerToggle: (peer: InputPeer) => void,
  onTypeToggle: (type: PeersType) => void,
) {
  if (item === 'typesHeader') {
    return div`.filterPeersScreen__header`(text('Chat types'));
  }

  if (item === 'chatsHeader') {
    return div`.filterPeersScreen__header`(text('Chats'));
  }

  if (item in typesInfos) {
    const setInfo = typesInfos[item as keyof typeof typesInfos];
    return peersListItem(
      setInfo[0](),
      setInfo[1],
      undefined,
      selectedTypes.pipe(map((types) => types.has(item as keyof typeof typesInfos))),
      () => onTypeToggle(item as keyof typeof typesInfos),
    );
  }

  if (process.env.NODE_ENV) {
    // eslint-disable-next-line no-console
    console.error(`Unknown peers list item "${item}", ignoring it. Please check the code for typos.`);
  }
  return div();
}

export default function peersScreen({ onBack }: SidebarComponentProps, ctxSubject: BehaviorSubject<ScreenCtx>) {
  const selectedPeers = new BehaviorSubject(new Map<string, InputPeer>());
  const selectedTypes = new BehaviorSubject(new Set<PeersType>());
  const searchInput = new BehaviorSubject('');

  function submit() {
    // eslint-disable-next-line no-unused-expressions
    ctxSubject.value.onSubmit?.(selectedPeers.value, selectedTypes.value);
    // eslint-disable-next-line no-unused-expressions
    onBack?.();
  }

  function togglePeer(inputPeer: InputPeer) {
    const peer = inputPeerToPeer(inputPeer);
    if (!peer) {
      return;
    }

    const peerId = peerToId(peer);
    const peers = selectedPeers.value;

    if (peers.has(peerId)) {
      peers.delete(peerId);
    } else {
      peers.set(peerId, inputPeer);
    }

    selectedPeers.next(peers);
  }

  function toggleType(type: PeersType) {
    const types = selectedTypes.value;

    if (types.has(type)) {
      types.delete(type);
    } else {
      types.add(type);
    }

    selectedTypes.next(types);
  }

  function removeType(type: PeersType) {
    const types = selectedTypes.value;
    if (types.has(type)) {
      types.delete(type);
      selectedTypes.next(types);
    }
  }

  function removePeer(peerId: string) {
    const peers = selectedPeers.value;
    if (peers.has(peerId)) {
      peers.delete(peerId);
      selectedPeers.next(peers);
    }
  }

  const listItems = new BehaviorSubject<string[]>([]);
  const listDriver = new VirtualizedList({
    items: listItems,
    threshold: 2,
    batch: 20,
    pivotBottom: false,
    topReached: true,
    className: 'filterPeersScreen__list',
    renderer: (id) => renderListItem(id, selectedPeers, selectedTypes, togglePeer, toggleType),
  });

  const content = (
    div`.filterPeersScreen`(
      heading({
        title: ctxSubject.pipe(map(({ typesFor }) => typesFor === 'excluded' ? 'Excluded Chats' : 'Included Chats')),
        className: 'filterPeersScreen__head',
        buttons: [
          { icon: icons.back, position: 'left', onClick: () => onBack?.() },
          { icon: icons.check, position: 'right', color: 'accent', onClick: submit },
        ],
      }),
      peersInput({
        className: 'filterPeersScreen__input',
        items: combineLatest([selectedTypes, selectedPeers])
          .pipe(map(([types, inputPeers]) => {
            const items: PeersInputItem[] = [];

            types.forEach((type) => items.push({ _: 'type', type }));

            inputPeers.forEach((inputPeer) => {
              const peer = inputPeerToPeer(inputPeer);
              if (peer) {
                items.push({ _: 'peer', peer });
              }
            });

            return items;
          })),
        searchValue: searchInput,
        onItemRemove(item) {
          switch (item._) {
            case 'type': removeType(item.type); break;
            case 'peer': removePeer(peerToId(item.peer)); break;
            default:
          }
        },
      }),
      div`.filterPeersScreen__shadow`(),
      listDriver.container,
    )
  );

  // Reset the values when a new input arrives.
  useObservable(content, ctxSubject, false, (screenInput) => {
    const peers = new Map<string, InputPeer>();
    const types = new Set<PeersType>(screenInput.types);

    screenInput.peers.forEach((inputPeer) => {
      const peer = inputPeerToPeer(inputPeer);
      if (peer) {
        peers.set(peerToId(peer), inputPeer);
      }
    });

    listDriver.clear();
    selectedPeers.next(peers);
    selectedTypes.next(types);
    listItems.next([
      'typesHeader',
      ...(screenInput.typesFor === 'excluded' ? typesToExclude : typesToInclude),
      'chatsHeader',
    ]);
  });

  return content;
}
