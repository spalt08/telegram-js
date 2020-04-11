import { Peer } from 'mtproto-js';
import { userCache, chatCache, userFullCache, chatFullCache } from 'cache';
import { div, nothing } from 'core/html';
import { info, username, phone } from 'components/icons';
import { BehaviorSubject } from 'rxjs';
import { infoListItem } from 'components/ui';
import { mount } from 'core/dom';
import './peer_info.scss';

function userInfo(userId: number) {
  const bioSubject = new BehaviorSubject<string>('');
  const usernameSubject = new BehaviorSubject<string>('');
  const phoneSubject = new BehaviorSubject<string>('');

  const container = div`.peerInfo`();
  mount(container, infoListItem(container, info(), 'Bio', bioSubject));
  mount(container, infoListItem(container, username(), 'Username', usernameSubject));
  mount(container, infoListItem(container, phone(), 'Phone', phoneSubject));

  const userSubject = userCache.useItemBehaviorSubject(container, userId);
  userSubject.subscribe((u) => {
    if (u?._ === 'user') {
      usernameSubject.next(u.username || '');
      phoneSubject.next(u.phone ? `+${u.phone}` : '');
    }
  });
  const userFullSubject = userFullCache.useItemBehaviorSubject(container, userId);
  userFullSubject.subscribe((uf) => {
    if (uf?._ === 'userFull') bioSubject.next(uf.about || '');
  });

  return container;
}

function chatInfo(chatId: number) {
  const aboutSubject = new BehaviorSubject<string>('');
  const container = div`.peerInfo`();
  mount(container, infoListItem(container, info(), 'About', aboutSubject));

  const chatFullSubject = chatFullCache.useItemBehaviorSubject(container, chatId);
  chatFullSubject.subscribe((cf) => {
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

  const channelFullSubject = chatFullCache.useItemBehaviorSubject(container, channelId);
  channelFullSubject.subscribe((cf) => {
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
