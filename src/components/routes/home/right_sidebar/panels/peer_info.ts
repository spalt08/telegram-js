import { Peer } from 'cache/types';
import { userCache, chatCache, userFullCache, chatFullCache } from 'cache';
import { div, nothing } from 'core/html';
import { useObservable } from 'core/hooks';
import { info, username, phone } from 'components/icons';
import { BehaviorSubject } from 'rxjs';
import { infoListItem } from 'components/ui';
import './peer_info.scss';
import { mount } from 'core/dom';

function userInfo(userId: number) {
  const bioSubject = new BehaviorSubject<string>('');
  const usernameSubject = new BehaviorSubject<string>('');
  const phoneSubject = new BehaviorSubject<string>('');

  const container = div`.peerInfo`();
  mount(container, infoListItem(container, info(), 'Bio', bioSubject));
  mount(container, infoListItem(container, username(), 'Username', usernameSubject));
  mount(container, infoListItem(container, phone(), 'Phone', phoneSubject));

  const userSubject = userCache.useItemBehaviorSubject(container, userId);
  useObservable(container, userSubject, (u) => {
    if (u) {
      usernameSubject.next(u.username || '');
      phoneSubject.next(u.phone ? `+${u.phone}` : '');
    }
  });
  const userFullObservable = userFullCache.useItemBehaviorSubject(container, userId);
  useObservable(container, userFullObservable, (uf) => {
    if (uf) bioSubject.next(uf.about);
  });

  return container;
}

function chatInfo(chatId: number) {
  const aboutSubject = new BehaviorSubject<string>('');
  const container = div`.peerInfo`();
  mount(container, infoListItem(container, info(), 'About', aboutSubject));

  const chatFullObservable = chatFullCache.useItemBehaviorSubject(container, chatId);
  useObservable(container, chatFullObservable, (cf) => {
    if (cf) {
      aboutSubject.next(cf.about);
    }
  });

  return container;
}

function channelInfo(channelId: number) {
  const aboutSubject = new BehaviorSubject<string>('');
  const linkSubject = new BehaviorSubject<string>('');
  const container = div`.peerInfo`();
  mount(container, infoListItem(container, info(), 'About', aboutSubject));
  mount(container, infoListItem(container, username(), 'Link', linkSubject));

  const channelFullObservable = chatFullCache.useItemBehaviorSubject(container, channelId);
  useObservable(container, channelFullObservable, (cf) => {
    if (cf) {
      aboutSubject.next(cf.about);
      const channel = chatCache.get(cf.id);
      if (channel?._ === 'channel' && channel.username) linkSubject.next(`https://t.me/${channel.username}`);
    }
  });

  return container;
}

export default function peerInfo(peer: Peer) {
  switch (peer._) {
    case 'peerUser': return userInfo(peer.user_id);
    case 'peerChat': return chatInfo(peer.chat_id);
    case 'peerChannel': return channelInfo(peer.channel_id);
    default:
      return nothing;
  }
}
