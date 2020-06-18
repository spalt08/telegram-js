import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { DialogFilter, DialogFilterSuggested, InputPeer, User } from 'mtproto-js';
import { div, nothing, text } from 'core/html';
import { folder as folderService } from 'services';
import { ripple } from 'components/ui';
import { MaybeObservable } from 'core/types';
import { pluralize } from 'helpers/other';
import { userCache } from 'cache';
import './filter_preview.scss';

interface Button {
  text: string;
  onClick(): void;
}

function filterPreview(
  title: MaybeObservable<string>,
  description: MaybeObservable<string>,
  onClick?: () => void,
  buttons: Button[] = [],
) {
  const content = [
    div`.filterPreview__body`(
      title ? div`.filterPreview__title`(text(title)) : nothing,
      description ? div`.filterPreview__description`(text(description)) : nothing,
    ),
    ...buttons.map((button) => (
      ripple({
        tag: 'button',
        className: 'filterPreview__button',
        onClick(event) {
          event.preventDefault();
          button.onClick();
        },
      }, [
        text(button.text),
      ])
    )),
  ];

  if (onClick) {
    return (
      div`.filterPreview`(
        ripple({
          className: 'filterPreview__ripple',
          contentClass: 'filterPreview__ripple_content',
          onClick(event) {
            if (!event.defaultPrevented) {
              event.preventDefault();
              onClick();
            }
          },
        }, content),
      )
    );
  }
  return (
    div`.filterPreview`(
      div`.filterPreview__ripple_content`(...content),
    )
  );
}

function countPeerTypes(peers: readonly InputPeer[]) {
  let chats = 0;
  let channels = 0;
  let people = 0;
  let bots = 0;

  let user: User | undefined;

  // Pinned aren't added to include_peers explicitly
  peers.forEach((inputPeer) => {
    switch (inputPeer._) {
      case 'inputPeerSelf':
        people++;
        break;
      case 'inputPeerUser':
      case 'inputPeerUserFromMessage':
        user = userCache.get(inputPeer.user_id);
        if (user?._ === 'user' && user.bot) {
          bots++;
        } else {
          people++;
        }
        break;
      case 'inputPeerChannel':
      case 'inputPeerChannelFromMessage':
        channels++;
        break;
      case 'inputPeerChat':
        chats++;
        break;
      default:
    }
  });

  return { chats, channels, people, bots };
}

function printPeerTypesCounts(typeCounts: ReturnType<typeof countPeerTypes>) {
  const result: string[] = [];
  if (typeCounts.people > 0) {
    result.push(`${typeCounts.people} ${pluralize(typeCounts.people, 'person', 'people')}`);
  }
  if (typeCounts.bots > 0) {
    result.push(`${typeCounts.bots} ${pluralize(typeCounts.bots, 'bot', 'bots')}`);
  }
  if (typeCounts.chats > 0) {
    result.push(`${typeCounts.chats} ${pluralize(typeCounts.chats, 'chat', 'chats')}`);
  }
  if (typeCounts.channels > 0) {
    result.push(`${typeCounts.channels} ${pluralize(typeCounts.channels, 'channel', 'channels')}`);
  }
  return result;
}

function makeFilterDescription(dialogFilter: DialogFilter) {
  const items: string[] = [];

  if (dialogFilter.contacts) {
    items.push('all Contacts');
  }
  if (dialogFilter.non_contacts) {
    items.push('all Non-Contacts');
  }
  if (dialogFilter.groups) {
    items.push('all Groups');
  }
  if (dialogFilter.broadcasts) {
    items.push('all Channels');
  }
  if (dialogFilter.bots) {
    items.push('all Bots');
  }

  // Pinned peers aren't added to include_peers explicitly
  const includedTypesCounts = countPeerTypes(dialogFilter.include_peers);
  const pinnedTypesCounts = countPeerTypes(dialogFilter.pinned_peers);
  includedTypesCounts.people += pinnedTypesCounts.people;
  includedTypesCounts.bots += pinnedTypesCounts.bots;
  includedTypesCounts.chats += pinnedTypesCounts.chats;
  includedTypesCounts.channels += pinnedTypesCounts.channels;
  items.push(...printPeerTypesCounts(includedTypesCounts));

  if (dialogFilter.exclude_muted) {
    items.push('exclude Muted');
  }
  if (dialogFilter.exclude_read) {
    items.push('exclude Read');
  }
  if (dialogFilter.exclude_archived) {
    items.push('exclude Archived');
  }

  const excludeTypesCounts = countPeerTypes(dialogFilter.exclude_peers);
  items.push(...printPeerTypesCounts(excludeTypesCounts).map((item) => `exclude ${item}`));

  const itemsString = items.join(', ');
  return itemsString[0].toUpperCase() + itemsString.slice(1);
}

export function addedFilterPreview(id: number) {
  const filterObservable = folderService.filters.pipe(
    map((filters) => filters?.get(id)?.filter),
    filter((dialogFilter): dialogFilter is DialogFilter => !!dialogFilter),
    distinctUntilChanged(),
  );

  return filterPreview(
    filterObservable.pipe(map((dialogFilter) => dialogFilter.title)),
    filterObservable.pipe(map(makeFilterDescription)),
    () => console.log('Todo filter settings'),
  );
}

export function suggestedFilterPreview(id: number) {
  const filterObservable = folderService.suggestedFilters.pipe(
    map((filters) => filters?.get(id)),
    filter((suggestion): suggestion is DialogFilterSuggested => !!suggestion),
    distinctUntilChanged(),
  );

  return filterPreview(
    filterObservable.pipe(map((suggestion) => suggestion.filter.title)),
    filterObservable.pipe(map((suggestion) => suggestion.description)),
    undefined,
    [{ text: 'Add', onClick: () => console.log('Todo add suggested filter') }],
  );
}
