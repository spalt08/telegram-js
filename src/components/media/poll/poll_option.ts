import { check as checkIcon, close as closeIcon } from 'components/icons';
import { mount, svgEl, unmountChildren } from 'core/dom';
import { getInterface, useInterface } from 'core/hooks';
import { div, label, span, text } from 'core/html';
import { PollAnswer, PollAnswerVoters } from 'mtproto-js';
import pollCheckbox from './poll_checkbox';
import './poll_option.scss';

type Props = {
  quiz: boolean,
  multipleChoice: boolean,
  option: PollAnswer,
  answered: boolean,
  closed: boolean,
  voters?: PollAnswerVoters,
  maxVoters: number,
  totalVoters: number,
  clickCallback: (selected: boolean) => void,
};

function answerIcon() {
  const container = div`.pollOption__answer.-hidden`();
  return useInterface(container, {
    update: (isCorrect?: boolean) => {
      container.classList.toggle('-hidden', isCorrect === undefined);
      if (isCorrect !== undefined) {
        unmountChildren(container);
        mount(container, isCorrect ? checkIcon() : closeIcon());
      }
    },
  });
}

export default function pollOption(initialProps: Props) {
  let prevProps = initialProps;
  let currProps = initialProps;
  let firstAnimationCompleted = initialProps.answered;

  let path: SVGPathElement;
  const checkboxEl = pollCheckbox({
    multiple: currProps.multipleChoice,
    clickCallback: currProps.clickCallback,
  });
  const checkbox = span`.pollOption__checkbox`(checkboxEl);
  const percentage = span`.pollOption__percentage`();
  const answer = answerIcon();
  const line = svgEl('svg', { width: 300, height: 30, class: 'pollOption__line' }, [
    path = svgEl('path', { d: 'M20 8 v 3.5 a 13 13 0 0 0 13 13 H 300' }),
  ]);
  const container = label`.pollOption`(
    line,
    percentage,
    checkbox,
    answer,
    span`.pollOption__text`(text(currProps.option.text)),
  );

  const update = (t: number) => {
    const prevVoters = firstAnimationCompleted ? prevProps.voters?.voters ?? 0 : 0;
    const currVoters = currProps.voters?.voters ?? 0;
    const p1 = prevVoters > 0 ? prevVoters / prevProps.totalVoters : 0;
    const p2 = currVoters > 0 ? currVoters / currProps.totalVoters : 0;
    const p = p1 + (p2 - p1) * t;
    percentage.textContent = `${Math.round(p * 100)}%`;
    const x1 = prevVoters > 0 ? prevVoters / prevProps.maxVoters : 0;
    const x2 = currVoters > 0 ? currVoters / currProps.maxVoters : 0;
    const x = x1 + (x2 - x1) * t;
    const t1 = firstAnimationCompleted ? 1 : t;
    path.style.strokeDasharray = `0 ${Math.round(t1 * 41)} ${Math.round(x * 248)} 1000`;
  };

  let startTime: number;
  const rafCallback = (time: number) => {
    if (!startTime) {
      startTime = time;
    }
    const t = (time - startTime) / (1000 * 0.3);
    update(Math.min(t, 1));
    if (t < 1) {
      requestAnimationFrame(rafCallback);
    } else {
      startTime = 0;
      prevProps = currProps;
      if (currProps.answered) {
        firstAnimationCompleted = true;
      }
    }
  };

  const updateOption = (updatedProps: Partial<Props>) => {
    if (updatedProps !== currProps) {
      currProps = { ...currProps, ...updatedProps };
    }
    if (!currProps.answered) {
      firstAnimationCompleted = false;
    }
    const answered = currProps.answered || currProps.closed;
    checkbox.classList.toggle('-answered', answered);
    percentage.classList.toggle('-answered', answered);
    line.classList.toggle('-answered', answered);
    getInterface(answer).update();
    container.classList.remove('-correct');
    container.classList.remove('-incorrect');
    if (currProps.voters) {
      if (currProps.quiz) {
        if (currProps.voters.chosen) {
          if (currProps.voters.correct) {
            container.classList.add('-correct');
            getInterface(answer).update(true);
          } else {
            container.classList.add('-incorrect');
            getInterface(answer).update(false);
          }
        } else if (currProps.voters.correct) {
          getInterface(answer).update(true);
        }
      } else if (currProps.voters.chosen) {
        getInterface(answer).update(true);
      }
    }
    if (currProps.answered && prevProps !== currProps) {
      requestAnimationFrame(rafCallback);
    } else {
      update(1);
    }
  };

  updateOption(currProps);

  return useInterface(container, {
    updateOption,
    reset: () => getInterface(checkboxEl).reset(),
  });
}

export type PollOptionInterface = ReturnType<typeof pollOption>;
