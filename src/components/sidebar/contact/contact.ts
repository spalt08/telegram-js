import { Peer } from 'client/schema';
import { MaybeObservable } from 'core/types';
import { div, text } from 'core/html';
import { makeTextMatchHighlightComponent, ripple } from 'components/ui';
import { profileAvatar } from 'components/profile';
import { message as messageService } from 'services';
import { peerToTitle } from 'cache/accessors';
import './contact.scss';

interface Props {
  peer: Peer;
  showUsername?: boolean;
  highlightOnline?: boolean;
  searchQuery?: MaybeObservable<string>;
}

const nameHighlight = makeTextMatchHighlightComponent({
  inputMaxScanLength: 100,
  outputMaxLength: 100,
  outputMaxStartOffset: Infinity,
});

export default function contact({ peer, showUsername, highlightOnline, searchQuery = '' }: Props) {
  const [, nameObservable] = peerToTitle(peer);

  return div`.contact`(
    ripple({
      className: 'contact__ripple',
      contentClass: 'contact__ripple_content',
      onClick() {
        messageService.selectPeer(peer);
      },
    }, [
      profileAvatar(peer),
      div`.contact__main`(
        nameHighlight({ tag: 'div', props: { class: 'contact__name' }, text: nameObservable, query: searchQuery }),
        div`.contact__description`(
          text('To be continued...'), // todo: Add peer summary
        ),
      ),
    ]),
  );
}
