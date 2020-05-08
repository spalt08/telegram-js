import { useInterface, getInterface } from 'core/hooks';
import { PollAnswer, PollAnswerVoters } from 'mtproto-js';
import { text, span, div } from 'core/html';
import { svgEl, unmountChildren, mount } from 'core/dom';
import { close as closeIcon, check as checkIcon } from 'components/icons';
import pollCheckbox from './poll-checkbox';

import './poll-option.scss';

// const ease = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
const ease = (t: number) => t;

type Props = {
  quiz: boolean,
  multiple: boolean,
  option: PollAnswer,
  answered: boolean,
  initialVoters: PollAnswerVoters | undefined,
  initialTotalVoters: number,
  clickCallback: (reset: () => void) => void,
};

function answerIcon() {
  const container = div`.pollOption__answer`({ style: { display: 'none' } });
  return useInterface(container, {
    update: (isCorrect?: boolean) => {
      unmountChildren(container);
      if (isCorrect !== undefined) {
        container.style.removeProperty('display');
        mount(container, isCorrect ? checkIcon() : closeIcon());
      }
    },
  });
}

export default function pollOption({ quiz, multiple, option, answered, initialVoters, initialTotalVoters, clickCallback }: Props) {
  let path: SVGPathElement;
  const checkbox = span`.pollOption__checkbox`(pollCheckbox(multiple, clickCallback));
  const percentage = span`.pollOption__percentage`();
  const answer = answerIcon();
  const container = div`.pollOption`(
    svgEl('svg', { width: 300, height: 30, class: 'pollOption__line' }, [
      path = svgEl('path', { d: 'M20 8 v 3.5 a 13 13 0 0 0 13 13 H 300' }),
    ]),
    percentage,
    checkbox,
    answer,
    span`.pollOption__text`(text(option.text)),
  );

  let voters = initialVoters;
  let totalVoters = initialTotalVoters ?? 1;
  // let currentPercentage = 0;
  // let targetPercentage = 0;
  let startTime: number;
  const update = (t: number) => {
    if (quiz && voters) {
      if (voters.chosen) {
        if (voters.correct) {
          container.classList.add('-correct');
          getInterface(answer).update(true);
        } else {
          container.classList.add('-incorrect');
          getInterface(answer).update(false);
        }
      } else if (voters.correct) {
        // container.classList.add('-correct');
        getInterface(answer).update(true);
      }
    }

    if (totalVoters > 0) {
      const p = (voters?.voters ?? 0) / totalVoters;
      percentage.textContent = `${Math.floor(t * p * 100)}%`;
      path.style.strokeDasharray = `0 ${Math.round(t * 41)} ${Math.round(t * p * 248)} 1000`;
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
    update(Math.min(t, 1));
    if (t < 1) {
      requestAnimationFrame(raf);
    } else {
      startTime = 0;
    }
  };

  const updateOption = (
    updateVoters: PollAnswerVoters | undefined,
    animate: boolean,
    updateAnswered: boolean,
    updateMaxVoters: number,
    updateTotalVoters: number) => {
    checkbox.classList.toggle('-answered', updateAnswered);
    percentage.classList.toggle('-answered', updateAnswered);
    voters = updateVoters;
    totalVoters = updateTotalVoters;
    // targetPercentage = totalVoters > 0 ? (voters?.voters ?? 0) / totalVoters : 0;
    if (animate) {
      requestAnimationFrame(raf);
    } else {
      update(1);
    }
  };

  updateOption(initialVoters, false, answered, 0, totalVoters);

  return useInterface(container, {
    updateOption,
  });
}

export type PollOptionInterface = ReturnType<typeof pollOption>;
