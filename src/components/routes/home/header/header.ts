import { message, main, RightSidebarPanel } from 'services';
import { useObservable } from 'core/hooks';
import { div } from 'core/html';
import { unmountChildren, mount } from 'core/dom';
import { profileAvatar, profileTitle } from 'components/profile';
import roundButton from 'components/ui/round_button/round_button';
import { more, search } from 'components/icons';
import { onlineStatus, typingIndicator } from 'components/ui';
import { Peer, Message } from 'cache/types';
import { userFullCache, chatFullCache, chatCache } from 'cache';
import { empty, Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import client from 'client/client';
import './header.scss';

function pinnedMessageObservable(base: Node, peer: Peer) {
  let cache: Observable<{ pinned_msg_id: number } | undefined>;
  switch (peer._) {
    case 'peerUser':
      cache = userFullCache.useItemBehaviorSubject(base, peer.user_id);
      break;
    case 'peerChat':
      cache = chatFullCache.useItemBehaviorSubject(base, peer.chat_id);
      break;
    case 'peerChannel':
      cache = chatFullCache.useItemBehaviorSubject(base, peer.channel_id);
      break;
    default:
      cache = empty();
      break;
  }
  return cache.pipe(filter((fc) => fc !== undefined), map((fc) => fc!.pinned_msg_id));
}

export default function header() {
  const container = div`.header.hidden`();

  useObservable(container, message.activePeer, (peer) => {
    unmountChildren(container);

    if (!peer) {
      container.classList.add('hidden');
      return;
    }

    const profile = div`.header__profile`(
      profileAvatar(peer, undefined, true),
      div`.header__info`(
        div`.header__title`(profileTitle(peer, true)),
        typingIndicator(peer, 'header__typing-indicator', onlineStatus(peer)),
      ),
    );

    mount(container, profile);

    const actions = div`.header__actions`(
      roundButton({
        onClick: () => {
          main.setRightSidebarPanel(RightSidebarPanel.Search);
        },
      }, search()),
      roundButton({
        onClick: () => {
          main.setRightSidebarPanel(RightSidebarPanel.Info);
        },
      }, more()),
    );

    mount(container, actions);

    useObservable(container, pinnedMessageObservable(container, peer), (pinned_msg_id) => {
      if (peer._ === 'peerChannel') {
        const channel = chatCache.get(peer.channel_id);
        if (channel?._ !== 'channel') return;
        client.call('channels.getMessages', {
          channel: { _: 'inputChannel', channel_id: peer.channel_id, access_hash: channel.access_hash },
          id: [{ _: 'inputMessageID', id: pinned_msg_id }],
        }, (error, msg: Message) => {
          console.error(msg);
        });
      } else {
        client.call('messages.getMessages', {
          id: [{ _: 'inputMessageID', id: pinned_msg_id }],
        }, (error, msg: Message) => {
          console.error(msg);
        });
      }
    });

    container.classList.remove('hidden');
  });

  return container;
}
