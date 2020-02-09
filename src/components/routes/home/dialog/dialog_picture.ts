import { div } from 'core/html';
import { Peer } from 'cache/types';
import { profileAvatar } from 'components/profile';

export default function dialogPicture(peer: Peer) {
  // todo: Show online status
  // const status = div`.dialog__status.online`();
  const container = div`.dialog__picture`(
    profileAvatar(peer, undefined, true),
    // status,
  );

  return container;
}
