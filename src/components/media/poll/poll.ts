import { Poll, PollResults, PollAnswerVoters, Peer } from 'mtproto-js';
import { div, text, span } from 'core/html';
import { mount } from 'core/dom';
import { useWhileMounted, getInterface } from 'core/hooks';
import { polls } from 'services';

import './poll.scss';
import pollOption, { PollOptionInterface } from './poll-option';

const decoder = new TextDecoder();
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

export default function poll(peer: Peer, messageId: number, pollData: Poll, results: PollResults, info: HTMLElement) {
  const pollOptions = div`.poll__options`();
  const totalVotersText = text('');
  const container = span`.poll`(
    div`.poll__question`(text(pollData.question)),
    div`poll__type`(text(pollType(pollData))),
    pollOptions,
    span`.poll__voters`(totalVotersText),
    info,
  );
  const options = new Map<string, PollOptionInterface>();
  const answered = !!results.results && results.results.findIndex((r) => r.chosen) >= 0;
  pollData.answers.forEach((answer) => {
    const optionKey = decoder.decode(answer.option);
    let voters: PollAnswerVoters | undefined;
    if (results.results) {
      voters = results.results.find((r) => decoder.decode(r.option) === optionKey);
    }
    const option = pollOption({
      quiz: pollData.quiz ?? false,
      multiple: pollData.multiple_choice ?? false,
      option: answer,
      answered,
      initialVoters: voters,
      initialTotalVoters: results.total_voters ?? 0,
      clickCallback: async (reset: () => void) => {
        await polls.sendVote(peer, messageId, [answer.option]);
        reset();
      },
    });
    options.set(optionKey, option);
    mount(pollOptions, option);
  });

  const updateTotalVotersText = (totalVoters: number) => {
    totalVotersText.textContent = totalVoters > 0
      ? `${totalVoters} voter${totalVoters > 1 ? 's' : ''}`
      : 'No voters yet';
  };

  const updatePollResults = (pollResults: PollResults, initial: boolean) => {
    const totalVoters = pollResults.total_voters ?? 0;
    updateTotalVotersText(totalVoters);
    if (pollResults.results) {
      const maxVoters = Math.max(...pollResults.results.map((r) => r.voters));
      const updateAnswered = pollResults.results.findIndex((r) => r.chosen) >= 0;
      pollResults.results.forEach((r) => {
        const op = options.get(decoder.decode(r.option));
        if (op) {
          getInterface(op).updateOption(r, !initial, updateAnswered, maxVoters, totalVoters);
        }
      });
    }
  };

  updatePollResults(results, true);

  const updateListener = (update: PollResults, initial: boolean) => {
    updatePollResults(update, initial);
  };

  useWhileMounted(container, () => {
    polls.subscribe(pollData.id, updateListener);
    return () => polls.unsubscribe(pollData.id, updateListener);
  });

  return container;
}
