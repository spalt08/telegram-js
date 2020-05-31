import { timer, combineLatest, Subject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { Peer, UserStatus } from 'mtproto-js';
import { userCache, chatCache, chatFullCache } from 'cache';
import { el, mount, unmountChildren } from 'core/dom';
import { text, fragment } from 'core/html';
import { useObservable, useWhileMounted } from 'core/hooks';
import { auth as authService } from 'services';
import { todoAssertHasValue, pluralize } from 'helpers/other';
import { areUserStatusesEqual } from 'helpers/api';
import './peer_status.scss';

interface Props {
  tag?: string;
  className?: string;
  noHighlight?: boolean;
}

const sharedMinuteTicker = new Subject();
timer(60 * 1000, 60 * 1000).subscribe(sharedMinuteTicker);

function areSameDays(date1: Date, date2: Date) {
  return date1.getDate() === date2.getDate()
    && date1.getMonth() === date2.getMonth()
    && date1.getFullYear() === date2.getFullYear();
}

function formatTime(date: Date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDate(date: Date) {
  return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear() % 100}`;
}

function formatCount(count: number) {
  return count.toLocaleString('en-US');
}

function formatLastSeenTime(date: number /* unix ms */) {
  const now = Date.now(); // todo: Use server time
  const timeDiff = (now - date) / 1000;
  if (timeDiff < 60) {
    return 'just now';
  }
  if (areSameDays(new Date(date), new Date(now - 24 * 60 * 60 * 1000))) {
    return `yesterday at ${formatTime(new Date(date))}`;
  }
  if (timeDiff < 60 * 60) {
    const minutes = Math.floor(timeDiff / 60);
    return `${minutes} ${pluralize(minutes, 'minute', 'minutes')} ago`;
  }
  if (timeDiff < 24 * 60 * 60) {
    const hours = Math.floor(timeDiff / 60 / 60);
    return `${hours} ${pluralize(hours, 'hour', 'hours')} ago`;
  }
  return formatDate(new Date(date));
}

function lastSeenTime(wasOnlineDate: number /* unix ms */) {
  let lastText = '';
  const node = text(lastText);

  function update() {
    const newText = formatLastSeenTime(wasOnlineDate);
    if (newText !== lastText) {
      node.textContent = newText;
      lastText = newText;
    }
  }

  useWhileMounted(node, () => {
    update();
    const subscription = sharedMinuteTicker.subscribe(update);
    return () => subscription.unsubscribe();
  });

  return node;
}

function buildUserStatus(status?: UserStatus) {
  switch (status?._) {
    case 'userStatusOnline': return text('online');
    case 'userStatusOffline': return status.was_online > 0
      ? fragment(text('last seen '), lastSeenTime(status.was_online * 1000))
      : text('offline');
    case 'userStatusRecently': return text('last seen recently');
    case 'userStatusLastWeek': return text('last seen within a week');
    case 'userStatusLastMonth': return text('last seen within a month');
    default: return text('last seen recently');
  }
}

function makeContainer({ tag = 'span', className = '' }: Pick<Props, 'tag' | 'className'> = {}) {
  return el(tag, { className: `peerStatus ${className}` });
}

const blankStatus = '\u200b'; // unicode zero width space character

export function peerUserStatus(peer: Peer.peerUser, { noHighlight, ...props }: Props = {}) {
  const container = makeContainer(props);

  if (peer.user_id === authService.userID) {
    container.textContent = '';
  } else {
    userCache.useItemBehaviorSubject(container, peer.user_id)
      .pipe(distinctUntilChanged((user1, user2) => {
        if (user1?._ !== user2?._) {
          return false;
        }
        if (user1?._ !== 'user') {
          return true;
        }
        if (!!user1.bot !== !!(user2 as typeof user1).bot) {
          return false;
        }
        if (user1.bot) {
          return true;
        }
        return areUserStatusesEqual(user1.status, (user2 as typeof user1).status);
      }))
      .subscribe((user) => {
        unmountChildren(container);
        if (user?._ !== 'user') {
          container.textContent = blankStatus;
        } else if (user.bot) {
          container.textContent = 'bot';
        } else {
          mount(container, buildUserStatus(user.status));
        }
        if (!noHighlight) {
          container.classList.toggle('-online', user?._ === 'user' && user.status?._ === 'userStatusOnline');
        }
      });
  }

  return container;
}

export function peerChatSimpleStatus(peer: Peer.peerChat, props?: Props) {
  const container = makeContainer(props);
  const textObservable = chatCache.useItemBehaviorSubject(container, peer.chat_id).pipe(
    map((chat) => chat?._ === 'chat' ? chat.participants_count : undefined),
    distinctUntilChanged(),
    map((participantsCount) => participantsCount === undefined ? blankStatus : `${formatCount(participantsCount)} members`),
  );
  mount(container, text(textObservable));
  return container;
}

export function peerChatFullStatus(peer: Peer.peerChat, props?: Props) {
  const container = makeContainer(props);
  container.textContent = blankStatus;

  const countObservable = chatCache.useItemBehaviorSubject(container, peer.chat_id).pipe(
    map((chat) => chat?._ === 'chat' ? chat.participants_count : undefined),
    distinctUntilChanged(),
  );

  const participantsObservable = chatFullCache.useItemBehaviorSubject(container, peer.chat_id).pipe(
    map((chatFull) => chatFull?._ === 'chatFull' && chatFull.participants._ === 'chatParticipants' ? chatFull.participants.participants : undefined),
    distinctUntilChanged(),
  );

  // todo: Counting users on every user cache update can slow the render. Also the user cache may omit no changes. Optimize it.
  useObservable(container, combineLatest([countObservable, participantsObservable, userCache.changes]), ([participantsCount, participants]) => {
    if (participantsCount === undefined) {
      container.textContent = blankStatus;
      return;
    }

    let statusText = `${formatCount(participantsCount)} members`;

    if (participants) {
      let onlineUsers = 0;
      let wasMe = false;

      participants.forEach((p) => {
        const user = userCache.get(p.user_id);
        if (user?._ === 'user' && user.status?._ === 'userStatusOnline') {
          onlineUsers++;
          if (user.id === authService.userID) wasMe = true;
        }
      });

      if (onlineUsers > 0 && !(onlineUsers === 1 && wasMe)) {
        statusText += `, ${onlineUsers} online`;
      }
    }

    container.textContent = statusText;
  });

  return container;
}

export function peerChannelSimpleStatus(peer: Peer.peerChannel, props?: Props) {
  const container = makeContainer(props);
  const textObservable = chatCache.useItemBehaviorSubject(container, peer.channel_id).pipe(
    map((channel) => {
      if (channel?._ !== 'channel' || channel.participants_count === undefined) {
        return blankStatus;
      }
      return `${formatCount(todoAssertHasValue(channel.participants_count))} ${channel.broadcast ? 'subscribers' : 'members'}`;
    }),
    distinctUntilChanged(),
  );
  mount(container, text(textObservable));
  return container;
}

export function peerChannelFullStatus(peer: Peer.peerChannel, props?: Props) {
  const container = makeContainer(props);

  const broadcastObservable = chatCache.useItemBehaviorSubject(container, peer.channel_id).pipe(
    map((channel) => channel?._ === 'channel' && !!channel.broadcast),
    distinctUntilChanged(),
  );

  const channelFullObservable = chatFullCache.useItemBehaviorSubject(container, peer.channel_id);

  useObservable(container, combineLatest([broadcastObservable, channelFullObservable]), ([isBroadcast, channelFull]) => {
    if (channelFull?._ !== 'channelFull') {
      container.textContent = blankStatus;
      return;
    }

    container.textContent = isBroadcast
      ? `${formatCount(todoAssertHasValue(channelFull.participants_count))} subscribers`
      : `${formatCount(todoAssertHasValue(channelFull.participants_count))} members, `
        + `${formatCount(todoAssertHasValue(channelFull.online_count))} online`;
  });

  return container;
}

export function peerSimpleStatus(peer: Peer, props?: Props) {
  switch (peer._) {
    case 'peerUser': return peerUserStatus(peer, props);
    case 'peerChat': return peerChatSimpleStatus(peer, props);
    case 'peerChannel': return peerChannelSimpleStatus(peer, props);
    default: return makeContainer(props);
  }
}

// To use this component properly, synchronize the peer full info
export function peerFullStatus(peer: Peer, props?: Props) {
  switch (peer._) {
    case 'peerChat': return peerChatFullStatus(peer, props);
    case 'peerChannel': return peerChannelFullStatus(peer, props);
    default: return peerSimpleStatus(peer, props);
  }
}
