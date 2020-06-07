import { userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import client from 'client/client';
import { profileAvatar, profileTitle } from 'components/profile';
import { mount, unmount, unmountChildren } from 'core/dom';
import { useInterface } from 'core/hooks';
import { div, text } from 'core/html';
import { userIdToPeer } from 'helpers/api';
import { MediaMessage } from 'helpers/message';
import { MessageMedia, Peer } from 'mtproto-js';
import './poll_result_option.scss';

const decoder = new TextDecoder();

function createPlaceholder() {
  const titleWidth = 100 + Math.round(Math.random() * 100);
  return div`.pollResultOption__voter-placeholder`(div`.avatar`(), div`.voter-name`({ style: { width: `${titleWidth}px` } }));
}

export default function pollResultOption(peer: Peer, message: MediaMessage<MessageMedia.messageMediaPoll>, option: ArrayBuffer) {
  const optionStr = decoder.decode(option);
  const answer = message.media.poll.answers.find((a) => decoder.decode(a.option) === optionStr)!;
  const optionText = answer.text;
  const optionTextEl = div`.pollResultOption__text`(text(optionText));
  const percentEl = div`.pollResultOption__percent`();
  const votersListEl = div`.pollResultOption__voters-list`();
  const voterPlaceholders: Element[] = [];
  const voterIdToElementMap = new Map<number, HTMLElement>();
  const container = div`.pollResultOption`(div`.pollResultOption__header`(optionTextEl, percentEl), votersListEl);

  const setVoters = (voters: number, totalVoters: number) => {
    if (voters === 0) {
      container.classList.add('-hidden');
    }
    percentEl.textContent = `${Math.round((voters / totalVoters) * 100)}%`;
    unmountChildren(votersListEl);
    const placeholderCount = Math.min(4, voters);
    for (let i = 0; i < placeholderCount; i++) {
      const placeholder = createPlaceholder();
      voterPlaceholders.push(placeholder);
      mount(votersListEl, placeholder);
    }
  };

  const setVoter = (userId: number, voted: boolean) => {
    let voterEl = voterIdToElementMap.get(userId);
    if (!voterEl) {
      const placeholder = voterPlaceholders.pop();
      if (placeholder) {
        unmount(placeholder);
      }
      const voterPeer = userIdToPeer(userId);
      voterEl = div`.pollResultOption__voter`(
        profileAvatar(voterPeer),
        div`.pollResultOption__voter-name`(
          profileTitle(voterPeer),
        ),
      );
      voterIdToElementMap.set(userId, voterEl);
      mount(votersListEl, voterEl);
    } else {
      voterEl.classList.toggle('-hidden', !voted);
    }
  };

  const loadData = async () => {
    const request = {
      peer: peerToInputPeer(peer),
      id: message.id,
      limit: 4,
      option,
    };
    // eslint-disable-next-line no-await-in-loop
    const pollVotes = await client.call('messages.getPollVotes', request);
    userCache.put(pollVotes.users);
    pollVotes.votes.forEach((vote) => {
      // updateVote(vote, decoder.decode(answer.option));
    });
  };

  loadData();

  return useInterface(container, {
    setVoters,
    setVoter,
  });
}
