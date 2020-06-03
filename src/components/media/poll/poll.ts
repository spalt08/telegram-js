import { messageCache } from 'cache';
import { profileAvatar } from 'components/profile';
import { mount, unmount, unmountChildren } from 'core/dom';
import { getInterface } from 'core/hooks';
import { div, nothing, text } from 'core/html';
import { peerMessageToId, userIdToPeer } from 'helpers/api';
import { Message, Peer, Poll, PollAnswerVoters, PollResults } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { main, polls } from 'services';
import fireworksControl from './fireworks/fireworks_control';
import './poll.scss';
import pollCountdown from './poll_countdown';
import pollFooter, { VoteButtonState } from './poll_footer';
import pollOption from './poll_option';
import pollSolution from './poll_solution';


const decoder = new TextDecoder();

function pollType(pollData: Poll) {
  if (pollData.closed) {
    return 'Final Results';
  }
  if (pollData.quiz) {
    return pollData.public_voters ? 'Quiz' : 'Anonymous Quiz';
  }
  return pollData.public_voters ? 'Poll' : 'Anonymous Poll';
}

function buildRecentVotersList(userIds?: number[]) {
  if (userIds) {
    return userIds.map((userId) => div`.poll__avatar-wrapper`(profileAvatar(userIdToPeer(userId)))).reverse();
  }
  return [];
}

export default function poll(peer: Peer, message: Message.message, info: HTMLElement) {
  if (message.media?._ !== 'messageMediaPoll') {
    throw new Error('message media must be of type "messageMediaPoll"');
  }
  const resultsSubject = new BehaviorSubject<PollResults>(message.media.results);
  const { media } = message;
  const { results } = media;
  const pollData = media.poll as Required<Poll.poll>;
  const selectedOptions = new Set<ArrayBuffer>();
  const pollOptions: ReturnType<typeof pollOption>[] = [];
  const countdownEl = pollData.close_date > 0 && !pollData.closed ? pollCountdown(message.date, pollData.close_date) : nothing;
  const solutionEl = pollData.quiz ? pollSolution(resultsSubject) : nothing;
  const pollHeader = text(pollType(pollData));
  const recentVotersEl = div`poll__recent-voters`(...buildRecentVotersList(results.recent_voters));
  let answered = !!results.results && results.results.findIndex((r) => r.chosen) >= 0;
  const maxVoters = results.results ? Math.max(...results.results.map((r) => r.voters)) : 0;
  const fireworks = fireworksControl();

  const submitOptions = async () => {
    if (!answered) {
      const optionsArray: ArrayBuffer[] = [];
      selectedOptions.forEach((o) => optionsArray.push(o));
      try {
        await polls.sendVote(peer, message.id, optionsArray);
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error(e);
        }
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
    onViewResults: () => { main.openSidebar('pollResults', { peer, messageId: message.id }); },
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
      clickCallback: (selected, key) => {
        if (pollData.multiple_choice) {
          if (selected) {
            selectedOptions.add(key);
          } else {
            selectedOptions.delete(key);
          }
          getInterface(voteFooterEl).updateState(answered ? VoteButtonState.ViewResults : VoteButtonState.Vote, selectedOptions.size > 0);
        } else {
          selectedOptions.add(answer.option);
          submitOptions();
        }
      },
    });
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
    unmountChildren(recentVotersEl);
    buildRecentVotersList(updatedResults.recent_voters).forEach((avatar) => {
      mount(recentVotersEl, avatar);
    });
    const updateMaxVoters = Math.max(...voters.map((r) => r.voters));
    answered = voters.findIndex((r) => r.chosen) >= 0;
    const correct = voters.some((r) => r.chosen && r.correct);
    if (correct) {
      getInterface(fireworks).start();
    }
    if (updatedPoll.closed) {
      unmount(countdownEl);
      resultsSubject.next(updatedResults);
    }
    updateVoteButtonText(updatedPoll.closed, answered, updatedPoll.public_voters);
    updateVoters(updateTotalVoters);
    const votersMap = new Map(voters.map((v) => [decoder.decode(v.option), v]));
    pollOptions.forEach((option) => {
      const optionInterface = getInterface(option);
      const answerVoters = votersMap.get(decoder.decode(optionInterface.getKey()));
      optionInterface.updateOption({
        voters: answerVoters,
        answered,
        closed: updatedPoll.closed,
        maxVoters: updateMaxVoters,
        totalVoters: updateTotalVoters,
      });
    });
  };

  info.classList.add('poll__message-info');
  const container = div`.poll`(
    div`.poll__body`(
      div`.poll__question`(text(pollData.question)),
      div`poll__info`(
        div`poll__type`(pollHeader),
        recentVotersEl,
        countdownEl,
        solutionEl,
      ),
      div`.poll__options`(...pollOptions),
    ),
    div`.poll__footer`(
      voteFooterEl,
      info,
    ),
    fireworks,
  );

  messageCache.useItemBehaviorSubject(container, peerMessageToId(peer, message.id)).subscribe((msg) => {
    if (msg?._ === 'message' && msg.media?._ === 'messageMediaPoll') {
      updatePollResults(msg.media.poll as Required<Poll>, msg.media.results);
    }
  });

  return container;
}
