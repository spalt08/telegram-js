import { Peer } from 'mtproto-js';
import { userCache, chatCache, userFullCache, chatFullCache } from 'cache';
import { div, nothing } from 'core/html';
import * as icons from 'components/icons';
import { BehaviorSubject } from 'rxjs';
import { infoListItem } from 'components/ui';
import { mount } from 'core/dom';
import './peer_info.scss';
import { useObservable } from 'core/hooks';

function userInfo(id: number) {
  const container = div`.peerInfo`();

  const bio = new BehaviorSubject('');
  const username = new BehaviorSubject('');
  const phone = new BehaviorSubject('');

  mount(container, infoListItem({ icon: icons.info, label: 'Bio', value: bio }));
  mount(container, infoListItem({ icon: icons.username, label: 'Username', value: username }));
  mount(container, infoListItem({ icon: icons.phone, label: 'Phone', value: phone }));

  useObservable(container, userCache.useItemBehaviorSubject(container, id), (user) => {
    if (user && user._ === 'user' && user.username) username.next(user.username);
    else username.next('');

    if (user && user._ === 'user' && user.phone) phone.next(user.phone);
    else phone.next('');
  });

  useObservable(container, userFullCache.useItemBehaviorSubject(container, id), (user) => {
    if (user && user.about) bio.next(user.about);
    else bio.next('');
  });

  return container;
}

function chatInfo(id: number) {
  const container = div`.peerInfo`();

  const about = new BehaviorSubject('');
  const link = new BehaviorSubject('');

  mount(container, infoListItem({ icon: icons.info, label: 'About', value: about }));
  mount(container, infoListItem({ icon: icons.username, label: 'Link', value: link }));

  useObservable(container, chatFullCache.useItemBehaviorSubject(container, id), (chat) => {
    if (chat && chat.about) about.next(chat.about);
    else about.next('');
  });

  useObservable(container, chatCache.useItemBehaviorSubject(container, id), (chat) => {
    if (chat && chat._ === 'channel' && chat.username) link.next(chat.username);
    else link.next('');
  });

  return container;
}

export default function peerInfo(peer: Peer) {
  switch (peer._) {
    case 'peerUser': return userInfo(peer.user_id);
    case 'peerChat': return chatInfo(peer.chat_id);
    case 'peerChannel': return chatInfo(peer.channel_id);
    default:
      return nothing;
  }
}
