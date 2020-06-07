import { profileAvatar, profileTitle } from 'components/profile';
import { mount, unmount, unmountChildren } from 'core/dom';
import { useInterface } from 'core/hooks';
import { div, text } from 'core/html';
import { userIdToPeer } from 'helpers/api';

export default function pollResultOption(option: ArrayBuffer, optionText: string, quiz: boolean) {
  const optionTextEl = div`.pollResultOption__text`(text(optionText));
  const votersCountEl = text('');
  const votersListEl = div`.pollResultOption__voters-list`();
  const voterPlaceholders: Element[] = [];
  const voterIdToElementMap = new Map<number, HTMLElement>();
  const container = div`.pollResultOption`(div`.pollResultOption__header`(optionTextEl, votersCountEl), votersListEl);
  return useInterface(container, {
    setVoters: (voters: number, totalVoters: number) => {
      if (voters === 0) {
        container.classList.add('-hidden');
      }
      optionTextEl.textContent = `${optionText} \u2014 ${Math.round((voters / totalVoters) * 100)}%`;
      votersCountEl.textContent = `${voters} ${quiz ? 'answered' : 'voted'}`;
      unmountChildren(votersListEl);
      for (let i = 0; i < voters; i++) {
        const titleWidth = 100 + Math.round(Math.random() * 100);
        const placeholder = div`.pollResultOption__voter-placeholder`(div`.avatar`(), div`.voter-name`({ style: { width: `${titleWidth}px` } }));
        voterPlaceholders.push(placeholder);
        mount(votersListEl, placeholder);
      }
    },
    setVoter: (userId: number, voted: boolean) => {
      let voterEl = voterIdToElementMap.get(userId);
      if (!voterEl) {
        const placeholder = voterPlaceholders.pop();
        if (placeholder) {
          unmount(placeholder);
        }
        const peer = userIdToPeer(userId);
        voterEl = div`.pollResultOption__voter`(
          profileAvatar(userIdToPeer(userId)),
          div`.pollResultOption__voter-name`(
            profileTitle(peer),
          ),
        );
        voterIdToElementMap.set(userId, voterEl);
        mount(votersListEl, voterEl);
      } else {
        voterEl.classList.toggle('-hidden', !voted);
      }
    },
  });
}
