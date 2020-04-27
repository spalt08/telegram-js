import { Peer } from 'mtproto-js';
import { MaybeObservable } from 'core/types';
import { div, fragment, nothing, text } from 'core/html';
import { makeTextMatchHighlightComponent, peerSimpleStatus, ripple } from 'components/ui';
import { profileAvatar } from 'components/profile';
import { message as messageService } from 'services';
import { chatCache, userCache } from 'cache';
import { peerToTitle } from 'cache/accessors';
import './contact.scss';

interface Props {
  peer: Peer;
  showUsername?: boolean;
  highlightOnline?: boolean;
  searchQuery?: MaybeObservable<string>;
  clickMiddleware?(next: () => void): void;
}

const nameHighlight = makeTextMatchHighlightComponent({
  inputMaxScanLength: 100,
  outputMaxLength: 100,
  outputMaxStartOffset: Infinity,
});

function getUsername(peer: Peer): string | undefined {
  switch (peer._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      if (user?._ === 'user') {
        return user.username;
      }
      break;
    }
    case 'peerChannel': {
      const channel = chatCache.get(peer.channel_id);
      if (channel?._ === 'channel') {
        return channel.username;
      }
      break;
    }
    default:
  }
  return undefined;
}

export default function contact({ peer, showUsername, highlightOnline, searchQuery = '', clickMiddleware }: Props) {
  const [, nameObservable] = peerToTitle(peer);
  const username = showUsername ? getUsername(peer) : undefined; // Not updated because the case is very rare and requires a more complex code

  const onClickBase = () => messageService.selectPeer(peer);
  const onClick = clickMiddleware ? () => clickMiddleware(onClickBase) : onClickBase;

  return div`.contact`(
    ripple({
      className: 'contact__ripple',
      contentClass: 'contact__ripple_content',
      onClick,
    }, [
      profileAvatar(peer),
      div`.contact__main`(
        nameHighlight({ tag: 'div', props: { class: 'contact__name' }, text: nameObservable, query: searchQuery }),
        div`.contact__description`(
          username
            ? fragment(nameHighlight({ tag: 'span', text: `@${username}`, query: searchQuery }), text(', '))
            : nothing,
          peerSimpleStatus(peer, { tag: 'span', noHighlight: !highlightOnline }),
        ),
      ),
    ]),
  );
}
