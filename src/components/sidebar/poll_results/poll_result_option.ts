import { userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import client from 'client/client';
import * as icons from 'components/icons';
import { profileAvatar, profileTitle } from 'components/profile';
import { ripple } from 'components/ui';
import { mount, unmount } from 'core/dom';
import { useInterface } from 'core/hooks';
import { div, text } from 'core/html';
import { userIdToPeer } from 'helpers/api';
import { MediaMessage } from 'helpers/message';
import { pluralize } from 'helpers/other';
import { MessageMedia, MessageUserVote } from 'mtproto-js';
import './poll_result_option.scss';

const INITIAL_DISPLAY_VOTERS_LIMIT = 4;
const SHOW_MORE_VOTERS_LIMIT = 10;

const decoder = new TextDecoder();

function createPlaceholder() {
  const titleWidth = 100 + Math.round(Math.random() * 100);
  return div`.pollResultOption__voter-placeholder`(div`.avatar`(), div`.voter-name`({ style: { width: `${titleWidth}px` } }));
}

export default function pollResultOption(message: MediaMessage<MessageMedia.messageMediaPoll>, option: ArrayBuffer) {
  const optionStr = decoder.decode(option);
  const answer = message.media.poll.answers.find((a) => decoder.decode(a.option) === optionStr)!;
  const optionText = answer.text;
  const optionTextEl = div`.pollResultOption__text`(text(optionText));
  const percentEl = div`.pollResultOption__percent`();
  const votersListEl = div`.pollResultOption__voters-list`();
  const showMoreVotersCountText = div`.pollResultOption__load-more-text`(text(''));
  const showMoreVotersEl = ripple({}, [div`.pollResultOption__load-more`(
    {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      onClick: () => loadData(),
    },
    icons.down(),
    showMoreVotersCountText,
  )]);
  const voterIdToElementMap = new Map<number, HTMLElement>();
  const container = div`.pollResultOption`(
    div`.pollResultOption__header`(optionTextEl, percentEl),
    votersListEl,
  );

  let addPlaceholders = true;
  let votersCount = 0;
  let votersCountShown = 0;
  const voterPlaceholders: Element[] = [];

  const updateShowMoreButton = () => {
    if ((votersCountShown === 0 && votersCount > INITIAL_DISPLAY_VOTERS_LIMIT) || (votersCountShown > 0 && votersCount > votersCountShown)) {
      const voters = votersCount - votersCountShown;
      mount(container, showMoreVotersEl);
      const limit = Math.min(voters, SHOW_MORE_VOTERS_LIMIT);
      const itemsType = message.media.poll.quiz ? pluralize(limit, 'answer', 'answers') : pluralize(limit, 'voter', 'voters');
      showMoreVotersCountText.textContent = `Show ${limit} more ${itemsType}`;
    } else {
      unmount(showMoreVotersEl);
    }
  };

  const updateVotersCount = (optionVoters: number, totalVoters: number) => {
    votersCount = optionVoters;
    updateShowMoreButton();
    if (optionVoters === 0) {
      container.classList.add('-hidden');
    } else {
      percentEl.textContent = `${Math.round((optionVoters / totalVoters) * 100)}%`;
      if (addPlaceholders) {
        const placeholderCount = Math.min(INITIAL_DISPLAY_VOTERS_LIMIT, optionVoters);
        for (let i = 0; i < placeholderCount; i++) {
          const placeholder = createPlaceholder();
          voterPlaceholders.push(placeholder);
          mount(votersListEl, placeholder);
        }
        addPlaceholders = false;
      }
    }
  };

  const updateVote = (vote: MessageUserVote) => {
    let voted = false;
    switch (vote._) {
      case 'messageUserVoteInputOption':
        voted = true;
        break;
      case 'messageUserVote':
        voted = decoder.decode(vote.option) === optionStr;
        break;
      case 'messageUserVoteMultiple':
        voted = vote.options.some((o) => decoder.decode(o) === optionStr);
        break;
      default:
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Unknown vote type.', vote);
        }
        break;
    }

    let voterEl = voterIdToElementMap.get(vote.user_id);
    if (!voterEl) {
      const placeholder = voterPlaceholders.pop();
      if (placeholder) {
        unmount(placeholder);
      }
      const voterPeer = userIdToPeer(vote.user_id);
      voterEl = div`.pollResultOption__voter`(
        profileAvatar(voterPeer),
        div`.pollResultOption__voter-name`(
          profileTitle(voterPeer),
        ),
      );
      voterIdToElementMap.set(vote.user_id, voterEl);
      mount(votersListEl, voterEl);
    } else {
      voterEl.classList.toggle('-hidden', !voted);
    }
  };

  let nextOffset: string | undefined;
  let limit = INITIAL_DISPLAY_VOTERS_LIMIT;
  const loadData = async () => {
    const request = {
      peer: peerToInputPeer(message.to_id),
      id: message.id,
      limit,
      offset: nextOffset,
      option,
    };
    // eslint-disable-next-line no-await-in-loop
    const pollVotes = await client.call('messages.getPollVotes', request);
    nextOffset = pollVotes.next_offset;
    limit = SHOW_MORE_VOTERS_LIMIT;
    userCache.put(pollVotes.users);
    pollVotes.votes.forEach((vote) => {
      updateVote(vote);
    });
    votersCountShown += pollVotes.votes.length;
    updateShowMoreButton();
  };

  loadData();

  return useInterface(container, { updateVotersCount });
}
