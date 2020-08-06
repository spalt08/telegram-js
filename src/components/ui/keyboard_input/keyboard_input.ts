import { chatCache, userCache } from 'cache';
import { peerToInputChannel } from 'cache/accessors';
import client, { fetchUpdates } from 'client/client';
import { mount, unmountChildren } from 'core/dom';
import { useMaybeObservableMaybeObservable } from 'core/hooks';
import { div, nothing, text } from 'core/html';
import { MaybeObservable } from 'core/types';
import { Peer } from 'mtproto-js';
import { bots, click } from 'services';
import './keyboard_input.scss';

function renderButtons(peer: Peer | undefined, hasStartToken: boolean, onVisibilityChanged: () => void) {
  let hide = true;
  let buttonText = '';
  let buttonCallback: (() => void) | undefined;

  switch (peer?._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      if (user?._ === 'user' && user.bot && hasStartToken) {
        hide = false;
        buttonText = 'Start';
        buttonCallback = () => {
          bots.sendBotStart(user, peer);
          onVisibilityChanged();
        };
      }
      break;
    }
    case 'peerChat': {
      break;
    }
    case 'peerChannel': {
      const channel = chatCache.get(peer.channel_id);
      if (channel?._ === 'channel') {
        if (channel.left) {
          hide = false;
          buttonText = 'Join Group';
          const channelPeer = peer;
          buttonCallback = () => {
            client.call('channels.joinChannel', { channel: peerToInputChannel(channelPeer) })
              .then((update) => {
                fetchUpdates(update);
                onVisibilityChanged();
              });
          };
        }
      }
      break;
    }
    default:
  }

  onVisibilityChanged();

  if (hide) {
    return nothing;
  }

  buttonCallback = buttonCallback ?? (() => { });

  return div`.keyboardInput__one-button`(
    {
      onClick: buttonCallback,
    },
    text(buttonText ?? ''));
}

export default function keyboardInput(peer: MaybeObservable<Peer | null>, onVisibilityChanged?: () => void) {
  const container = div`.keyboardInput`();

  let currentPeer: Peer | undefined;

  useMaybeObservableMaybeObservable(
    container,
    peer,
    (newPeer) => {
      currentPeer = newPeer ?? undefined;
      if (newPeer?._ === 'peerUser') {
        const user = userCache.get(newPeer.user_id);
        if (user?._ === 'user' && user.bot) {
          return click.getStartToken(user);
        }
      }
      return undefined;
    },
    true,
    (token) => {
      unmountChildren(container);
      mount(container, renderButtons(currentPeer, !!token, () => {
        unmountChildren(container);
        if (onVisibilityChanged) onVisibilityChanged();
      }));
    },
  );

  return container;
}
