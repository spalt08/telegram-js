import { Peer } from 'client/schema';
import { MaybeObservable } from 'core/types';
import { div, text } from 'core/html';
import { ripple } from 'components/ui';
import { profileAvatar, profileTitle } from 'components/profile';
import { message as messageService } from 'services';
import './contact.scss';

interface Props {
  peer: Peer;
  showUsername?: boolean;
  highlightOnline?: boolean;
  searchQuery?: MaybeObservable<string>;
}

export default function contact({ peer, showUsername, highlightOnline, searchQuery = '' }: Props) {
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
        div`.contact__name`(
          profileTitle(peer),
        ),
        div`.contact__description`(
          text('To be continued...'), // todo: Add peer summary
        ),
      ),
    ]),
  );
}
