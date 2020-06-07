import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { messageCache } from 'cache';
import { profileAvatar } from 'components/profile';
import { simpleList } from 'components/ui';
import { getInterface, useWhileMounted } from 'core/hooks';
import { div, text } from 'core/html';
import { peerMessageToId, userIdToPeer } from 'helpers/api';
import { Message, Peer, Poll, PollAnswerVoters, PollResults } from 'mtproto-js';
import { main, polls } from 'services';
import './poll.scss';
import pollFooter, { VoteButtonState } from './poll_footer';
import pollOption, { PollOptionInterface } from './poll_option';


const decoder = new TextDecoder();
const encoder = new TextEncoder();

function pollType(pollData: Poll) {
  if (pollData.closed) {
    return 'Final Results';
  }
  if (pollData.quiz) {
    return pollData.public_voters ? 'Quiz' : 'Anonymous Quiz';
  }
  return pollData.public_voters ? 'Poll' : 'Anonymous Poll';
}

function buildRecentVoter(userId: number) {
  return div`.poll__avatar-wrapper`(profileAvatar(userIdToPeer(userId)));
}

export default function poll(peer: Peer, message: Message.message, info: HTMLElement) {
  if (message.media?._ !== 'messageMediaPoll') {
    throw new Error('message media must be of type "messageMediaPoll"');
  }
  const { media } = message;
  const { results } = media;
  const pollData = media.poll as Required<Poll.poll>;
  const selectedOptions = new Set<string>();
  const pollOptions: ReturnType<typeof pollOption>[] = [];
  const pollHeader = text(pollType(pollData));
  const recentVoters = new BehaviorSubject(results.recent_voters);
  const options = new Map<string, PollOptionInterface>();
  let answered = !!results.results && results.results.findIndex((r) => r.chosen) >= 0;
  const maxVoters = results.results ? Math.max(...results.results.map((r) => r.voters)) : 0;

  const submitOptions = async () => {
    if (!answered) {
      const optionsArray: ArrayBuffer[] = [];
      selectedOptions.forEach((o) => optionsArray.push(encoder.encode(o).buffer));
      try {
        await polls.sendVote(peer, message.id, optionsArray);
      } catch (e) {
        console.log(e);
      }
    }
    selectedOptions.clear();
    pollOptions.forEach((po) => getInterface(po).reset());
  };

  const voteFooterEl = pollFooter({
    quiz: pollData.quiz,
    publicVoters: pollData.public_voters,
    multipleChoice: pollData.multiple_choice,
    onSubmit: submitOptions,
    onViewResults: () => { main.showPopup('pollResults', { peer, messageId: peerMessageToId(peer, message.id) }); },
  });

  pollData.answers.forEach((answer) => {
    const optionKey = decoder.decode(answer.option);
    let voters: PollAnswerVoters | undefined;
    if (results.results) {
      voters = results.results.find((r) => decoder.decode(r.option) === optionKey);
    }
    const option = pollOption({
      quiz: pollData.quiz,
      multipleChoice: pollData.multiple_choice,
      option: answer,
      answered,
      closed: pollData.closed,
      voters,
      maxVoters,
      totalVoters: results.total_voters ?? 0,
      clickCallback: (selected) => {
        if (pollData.multiple_choice) {
          const optKey = decoder.decode(answer.option);
          if (selected) {
            selectedOptions.add(optKey);
          } else {
            selectedOptions.delete(optKey);
          }
          getInterface(voteFooterEl).updateState(answered ? VoteButtonState.ViewResults : VoteButtonState.Vote, selectedOptions.size > 0);
        } else {
          selectedOptions.add(decoder.decode(answer.option));
          submitOptions();
        }
      },
    });
    options.set(optionKey, option);
    pollOptions.push(option);
  });

  const updateVoteButtonText = (closed: boolean, voted: boolean, publicVoters: boolean) => {
    if (voted && !publicVoters) {
      getInterface(voteFooterEl).updateState(VoteButtonState.ViewResults, selectedOptions.size > 0);
    } else {
      getInterface(voteFooterEl).updateState(closed || voted ? VoteButtonState.ViewResults : VoteButtonState.Vote, selectedOptions.size > 0);
    }
  };

  const updateVoters = (voters: number) => {
    getInterface(voteFooterEl).updateVoters(voters);
  };

  const updatePollResults = (updatedPoll: Required<Poll>, updatedResults: PollResults) => {
    const updateTotalVoters = updatedResults.total_voters ?? 0;
    if (updatedPoll) {
      pollHeader.textContent = pollType(updatedPoll);
    }
    const voters = updatedResults.results ?? [];
    recentVoters.next(updatedResults.recent_voters);
    const updateMaxVoters = Math.max(...voters.map((r) => r.voters));
    answered = voters.findIndex((r) => r.chosen) >= 0;
    updateVoteButtonText(updatedPoll.closed, answered, updatedPoll.public_voters);
    updateVoters(updateTotalVoters);
    voters.forEach((r) => {
      const op = options.get(decoder.decode(r.option));
      if (op) {
        getInterface(op).updateOption({
          voters: r,
          answered,
          closed: updatedPoll.closed,
          maxVoters: updateMaxVoters,
          totalVoters: updateTotalVoters,
        });
      }
    });
  };

  updatePollResults(pollData, results);

  info.classList.add('poll__message-info');
  const container = div`.poll`(
    div`.poll__body`(
      div`.poll__question`(text(pollData.question)),
      div`poll__info`(
        div`poll__type`(pollHeader),
        simpleList({
          items: recentVoters.pipe(map((userIds) => userIds ? [...userIds].reverse() : [])),
          render: buildRecentVoter,
          props: {
            className: 'poll__recent-voters',
          },
        }),
      ),
      div`.poll__options`(...pollOptions),
    ),
    div`.poll__footer`(
      voteFooterEl,
      info,
    ),
  );

  useWhileMounted(container, () => messageCache.watchItem(peerMessageToId(peer, message.id), (item) => {
    if (item?._ === 'message' && item.media?._ === 'messageMediaPoll') {
      updatePollResults(item.media.poll as Required<Poll>, item.media.results);
    }
  }));

  return container;
}
