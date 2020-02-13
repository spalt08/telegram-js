import { Peer, UserStatus } from 'cache/types';
import { userCache, chatCache, chatFullCache } from 'cache';
import { text, span } from 'core/html';
import { useObservable } from 'core/hooks';
import { timer, combineLatest } from 'rxjs';
import { auth as authService, chat as chatService } from 'services';
import './online_status.scss';

export function areSameDays(date1: Date, date2: Date) {
  return date1.getDate() === date2.getDate()
    && date1.getMonth() === date2.getMonth()
    && date1.getFullYear() === date2.getFullYear();
}

export function formatTime(date: Date) {
  return `${date.getHours()}:${`0${date.getMinutes()}`.slice(-2)}`;
}

export function formatDate(date: Date) {
  return `${date.getDate()}.${`0${date.getMonth() + 1}`.slice(-2)}.${date.getFullYear() - 2000}`;
}

function formatLastSeenTime(date: Date) {
  const now = new Date();
  const timeDiff = (now.getTime() - date.getTime()) / 1000;
  if (timeDiff < 60) {
    return 'just now';
  }
  if (areSameDays(date, new Date(now.getTime() - 24 * 60 * 60 * 1000))) {
    return `yesterday at ${formatTime(date)}`;
  }
  if (timeDiff < 60 * 60) {
    const minutes = Math.floor(timeDiff / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (timeDiff < 24 * 60 * 60) {
    const hours = Math.floor(timeDiff / 60 / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  return formatDate(date);
}

function formatStatus(status: UserStatus) {
  switch (status._) {
    case 'userStatusOnline': return 'online';
    case 'userStatusOffline': return status.was_online > 0
      ? `last seen ${formatLastSeenTime(new Date(status.was_online * 1000))}`
      : 'offline';
    case 'userStatusRecently': return 'last seen recently';
    case 'userStatusLastWeek': return 'last seen within a week';
    case 'userStatusLastMonth': return 'last seen within a month';
    default: return '';
  }
}

export default function onlineStatus(peer: Peer) {
  const statusText = text('\u200b'); // unicode zero width space character
  const container = span`.onlineStatus`(statusText);

  if (peer._ === 'peerUser') {
    if (peer.user_id === authService.userID) {
      statusText.textContent = '';
    } else {
      let prevStatus: UserStatus;
      let prevTime: number;
      const userSubject = userCache.useItemBehaviorSubject(container, peer.user_id);
      const minuteTimer = timer(0, 60 * 1000);
      const periodicUserObservable = combineLatest(userSubject, minuteTimer);
      useObservable(container, periodicUserObservable, (update) => {
        const [u, time] = update;
        if (!u || !u.status) return;
        if (prevStatus !== u.status || (prevTime !== time && u.status._ === 'userStatusOffline')) {
          statusText.textContent = formatStatus(u.status);
          container.classList.toggle('online', u.status._ === 'userStatusOnline');
        }
        prevStatus = u.status;
        prevTime = time;
      });
    }
  } else if (peer._ === 'peerChannel') {
    const channel = chatCache.get(peer.channel_id);
    if (channel) {
      chatService.loadFullInfo(channel);
    }
    const channelObservable = chatFullCache.useItemBehaviorSubject(container, peer.channel_id);
    useObservable(container, channelObservable, (cf) => {
      if (cf?._ === 'channelFull') {
        statusText.textContent = (channel?._ === 'channel' && channel.broadcast)
          ? `${cf.participants_count.toLocaleString('en-US')} subscribers`
          : `${cf.participants_count.toLocaleString('en-US')} members, ${cf.online_count.toLocaleString('en-US')} online`;
      }
    });
  }

  return container;
}
