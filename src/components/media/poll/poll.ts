import { Poll, PollResults, PollAnswerVoters, PollAnswer } from 'mtproto-js';
import { div, text, span } from 'core/html';
import { mount, svgEl } from 'core/dom';
import { useWhileMounted, useInterface, getInterface } from 'core/hooks';
import { polls } from 'services';

import './poll.scss';

const decoder = new TextDecoder();
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

function pollOption(option: PollAnswer, initialVoters?: PollAnswerVoters, initialTotalVoters?: number) {
  let path: SVGPathElement;
  const percentage = text('');
  const container = div`.poll__option`(
    span`.poll__option-text`(text(option.text)),
    svgEl('svg', { width: 300, height: 30, class: 'poll__option-line' }, [
      path = svgEl('path', { d: 'M20 8 a 15 15 0 0 0 15 15 H 298' }),
    ]),
    span`.poll__option-percentage`(percentage),
  );

  let voters = initialVoters;
  let totalVoters = initialTotalVoters ?? 1;
  // let currentPercentage = 0;
  // let targetPercentage = 0;
  let startTime: number;
  const update = (t: number) => {
    if (totalVoters > 0) {
      const p = (voters?.voters ?? 0) / totalVoters;
      percentage.textContent = `${Math.floor(t * p * 100)}%`;
      path.style.strokeDasharray = `0 ${Math.round(t * 40)} ${Math.round(t * p * 248)} 1000`;
    } else {
      percentage.textContent = '';
      path.style.strokeDasharray = '0 0 0 1000';
    }
  };
  const raf = (time: number) => {
    if (!startTime) {
      startTime = time;
    }
    const t = ease((time - startTime) / (1000 * 0.4));
    update(t);
    if (t < 1) {
      requestAnimationFrame(raf);
    } else {
      startTime = 0;
    }
  };

  update(1);

  const updateOption = (updateVoters: PollAnswerVoters, updateTotalVoters: number) => {
    voters = updateVoters;
    totalVoters = updateTotalVoters;
    // targetPercentage = totalVoters > 0 ? (voters?.voters ?? 0) / totalVoters : 0;
    requestAnimationFrame(raf);
  };

  return useInterface(container, {
    updateOption,
  });
}

type PollOptionInterface = ReturnType<typeof pollOption>;

function pollType(pollData: Poll) {
  if (pollData.quiz) {
    return 'Quiz';
  }
  if (pollData.public_voters) {
    return 'Poll';
  }
  return 'Anonymous Poll';
}

export default function poll(pollData: Poll, results: PollResults, info: HTMLElement) {
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
  pollData.answers.forEach((a) => {
    const optionKey = decoder.decode(a.option);
    let voters: PollAnswerVoters | undefined;
    if (results.results) {
      voters = results.results.find((r) => decoder.decode(r.option) === optionKey);
    }
    const option = pollOption(a, voters, results.total_voters);
    options.set(optionKey, option);
    mount(pollOptions, option);
  });

  const updateTotalVotersText = (totalVoters: number) => {
    totalVotersText.textContent = totalVoters > 0
      ? `${totalVoters} voter${totalVoters > 1 ? 's' : ''}`
      : 'No voters yet';
  };

  const updatePollResults = (pollResults: PollResults) => {
    const totalVoters = pollResults.total_voters ?? 0;
    updateTotalVotersText(totalVoters);
    if (pollResults.results) {
      pollResults.results!.forEach((r) => {
        const op = options.get(decoder.decode(r.option));
        if (op) {
          getInterface(op).updateOption(r, totalVoters);
        }
      });
    }
  };

  updateTotalVotersText(results.total_voters ?? 0);

  const updateListener = (update: PollResults) => {
    updatePollResults(update);
  };

  useWhileMounted(container, () => {
    polls.addListener(pollData.id, updateListener);
    return () => polls.removeListener(pollData.id, updateListener);
  });

  return container;
}
