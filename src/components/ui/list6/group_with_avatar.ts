import { div } from 'core/html';
import { profileAvatar } from 'components/profile';
import { userIdToPeer } from 'helpers/api';
import listGroup from './list_group';

import './group_with_avatar.scss';

export default function groupWithAvatar(userId: number) {
  return listGroup((container) => (
    div`.groupWithAvatar`(
      div`.groupWithAvatar__avatar`(profileAvatar(userIdToPeer(userId))),
      container,
    )
  ));
}
