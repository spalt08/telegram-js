import { Poll, PollResults, PollAnswerVoters, Peer, Message } from 'mtproto-js';
import { div, text, span } from 'core/html';
import { mount, unmountChildren } from 'core/dom';
import { useWhileMounted, getInterface } from 'core/hooks';
import { polls } from 'services';
import { messageCache } from 'cache';
import { peerMessageToId, userIdToPeer } from 'helpers/api';
import { profileAvatar } from 'components/profile';
import pollOption, { PollOptionInterface } from './poll-option';

import './poll.scss';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function pollType(pollData: Poll) {
  if (pollData.closed) {
    return 'Final Results';
  }
  if (pollData.quiz) {
    return 'Quiz';
  }
  if (pollData.public_voters) {
    return 'Poll';
  }
  return 'Anonymous Poll';
}

function buildRecentVotersList(userIds?: number[]) {
  if (userIds) {
    const reversedIds = [...userIds].reverse();
    return reversedIds.map((userId) => div`.poll__avatar-wrapper`(profileAvatar(userIdToPeer(userId))));
  }
  return [];
}

export default function poll(peer: Peer, message: Message, info: HTMLElement) {
  if (message._ !== 'message' || message.media?._ !== 'messageMediaPoll') {
    throw new Error('message media must be of type "messageMediaPoll"');
  }
  const { poll: pollData, results } = message.media;
  const selectedOptions = new Set<string>();
  const pollOptions: ReturnType<typeof pollOption>[] = [];
  const totalVotersText = text('');
  const pollTypeText = text(pollType(pollData));
  const recentVoters = div`poll__recent-voters`(...buildRecentVotersList(results.recent_voters));
  const submitOptions = async () => {
    const optionsArray: ArrayBuffer[] = [];
    selectedOptions.forEach((o) => optionsArray.push(encoder.encode(o).buffer));
    await polls.sendVote(peer, message.id, optionsArray);
    selectedOptions.clear();
    pollOptions.forEach((po) => getInterface(po).reset());
  };
  const voteButton = div`.poll__vote-button.-inactive`({
    onClick: async () => {
      await submitOptions();
    },
  }, text('Vote'));
  const options = new Map<string, PollOptionInterface>();
  const answered = !!results.results && results.results.findIndex((r) => r.chosen) >= 0;
  const maxVoters = results.results ? Math.max(...results.results.map((r) => r.voters)) : 0;
  pollData.answers.forEach((answer) => {
    const optionKey = decoder.decode(answer.option);
    let voters: PollAnswerVoters | undefined;
    if (results.results) {
      voters = results.results.find((r) => decoder.decode(r.option) === optionKey);
    }
    const option = pollOption({
      quiz: pollData.quiz ?? false,
      multipleChoice: pollData.multiple_choice ?? false,
      option: answer,
      answered,
      closed: pollData.closed ?? false,
      voters,
      maxVoters,
      totalVoters: results.total_voters ?? 0,
      clickCallback: async (selected) => {
        if (pollData.multiple_choice) {
          const optKey = decoder.decode(answer.option);
          if (selected) {
            selectedOptions.add(optKey);
          } else {
            selectedOptions.delete(optKey);
          }
          voteButton.classList.toggle('-inactive', selectedOptions.size === 0);
        } else {
          selectedOptions.add(decoder.decode(answer.option));
          await submitOptions();
        }
      },
    });
    options.set(optionKey, option);
    pollOptions.push(option);
  });

  const updateTotalVotersText = (closed: boolean, totalVoters: number) => {
    totalVotersText.textContent = totalVoters > 0
      ? `${totalVoters} voter${totalVoters > 1 ? 's' : ''}`
      : `No voters${closed ? '' : ' yet'}`;
  };
  const updateVoteButtonText = (isAnswered: boolean) => {
    voteButton.textContent = isAnswered ? 'View Results' : 'Vote';
  };

  const updatePollResults = (updatedPoll: Poll | undefined, updatedResults: PollResults) => {
    const updateTotalVoters = updatedResults.total_voters ?? 0;
    updateTotalVotersText(updatedPoll?.closed ?? false, updateTotalVoters);
    if (updatedPoll) {
      pollTypeText.textContent = pollType(updatedPoll);
    }
    if (updatedResults.results) {
      unmountChildren(recentVoters);
      buildRecentVotersList(updatedResults.recent_voters).forEach((avatar) => {
        mount(recentVoters, avatar);
      });
      const updateMaxVoters = Math.max(...updatedResults.results.map((r) => r.voters));
      const updateAnswered = updatedResults.results.findIndex((r) => r.chosen) >= 0;
      updateVoteButtonText(updateAnswered);
      updatedResults.results.forEach((r) => {
        const op = options.get(decoder.decode(r.option));
        if (op) {
          getInterface(op).updateOption({
            voters: r,
            answered: updateAnswered,
            closed: updatedPoll?.closed,
            maxVoters: updateMaxVoters,
            totalVoters: updateTotalVoters,
          });
        }
      });
    }
  };

  updateTotalVotersText(pollData.closed ?? false, results.total_voters ?? 0);
  updateVoteButtonText(answered);

  const container = div`.poll`(
    div`.poll__question`(text(pollData.question)),
    div`poll__info`(div`poll__type`(pollTypeText), recentVoters),
    div`.poll__options`(...pollOptions),
    pollData.multiple_choice ? voteButton : span`.poll__voters`(totalVotersText),
    info,
  );

  useWhileMounted(container, () => messageCache.watchItem(peerMessageToId(peer, message.id), (item) => {
    if (item?._ === 'message' && item.media?._ === 'messageMediaPoll') {
      updatePollResults(item.media.poll, item.media.results);
    }
  }));

  return container;
}
