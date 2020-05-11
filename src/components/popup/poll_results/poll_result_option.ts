import { div, text } from 'core/html';
import { useInterface } from 'core/hooks';
import { pluralize } from 'helpers/other';
import { userIdToPeer } from 'helpers/api';
import { mount } from 'core/dom';
import { profileAvatar, profileTitle } from 'components/profile';

import './poll_result_option.scss';

export default function pollResultOption(option: ArrayBuffer, optionText: string, quiz: boolean) {
  const optionTextEl = div`.pollResultOption__text`(text(optionText));
  const votersCountEl = text('');
  const votersListEl = div`.pollResultOption__voters-list`();
  const container = div`.pollResultOption`(div`.pollResultOption__header`(optionTextEl, votersCountEl), votersListEl);
  return useInterface(container, {
    setVoters: (voters: number, totalVoters: number) => {
      optionTextEl.textContent = `${optionText} \u2014 ${Math.round((voters / totalVoters) * 100)}%`;
      votersCountEl.textContent = `${voters} ${quiz ? pluralize(voters, 'answer', 'answers') : pluralize(voters, 'vote', 'votes')}`;
    },
    setVoter: (userId: number, voted: boolean) => {
      const peer = userIdToPeer(userId);
      mount(votersListEl, div`.pollResultOption__voter`(profileAvatar(userIdToPeer(userId)), div`.pollResultOption__voter-name`(profileTitle(peer))));
    },
  });
}
