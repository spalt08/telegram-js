import { mount, svgEl, unmount } from 'core/dom';
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
  clickCallback: (selected: boolean, key: ArrayBuffer) => void,
};

function answerIcon() {
  const container = div`.pollOption__answer`();
  return useInterface(container, {
    update: (correct?: boolean, chosen?: boolean) => {
      container.classList.toggle('-hidden', !(correct || chosen));
      container.classList.toggle('-chosen', chosen);
      container.classList.toggle('-correct', correct === true);
      container.classList.toggle('-wrong', correct === false);
    },
  });
}

export default function pollOption(initialProps: Props) {
  let prevProps = initialProps;
  let currProps = initialProps;
  let firstAnimationCompleted = initialProps.answered;

  let final = currProps.answered || currProps.closed;
  let width: number | undefined;
  let path: SVGPathElement;
  let checkbox: Element;
  let checkboxEl: ReturnType<typeof pollCheckbox>;
  let lineSvg: SVGElement;
  const percentage = span`.pollOption__percentage`();
  const answer = answerIcon();
  const optionText = div`.pollOption__text`(text(currProps.option.text));
  const container = label`.pollOption`(optionText);
  const lineDiv = div`.pollOption__line-div`();
  if (!final) {
    checkboxEl = pollCheckbox({
      multiple: currProps.multipleChoice,
      clickCallback: (selected) => currProps.clickCallback(selected, initialProps.option.option),
    });
    lineSvg = svgEl('svg', { class: 'pollOption__line-svg' }, [
      path = svgEl('path', { d: 'M20 8 v 3.5 a 13 13 0 0 0 13 13 H 300' }),
    ]);
    checkbox = span`.pollOption__checkbox`(checkboxEl);
    mount(container, checkbox);
    mount(container, lineSvg);
    mount(container, percentage);
    mount(container, answer);
  } else {
    mount(container, lineDiv);
    mount(container, percentage);
    mount(container, answer);
  }

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
    if (final) {
      lineDiv.style.right = `calc(${1 - x} * (100% - 48px))`;
    } else {
      if (!width) {
        width = container.getBoundingClientRect().width;
        lineSvg.setAttribute('width', width.toString());
        lineSvg.setAttribute('height', '19');
      }
      path.setAttribute('d', `M20 0 v 4 a 13 13 0 0 0 13 13 H ${width}`);
      path.style.strokeDasharray = `0 ${Math.round(t1 * 42)} ${Math.round(x * (width - 52))} 1000`;
    }
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
      if (!prevProps.answered && currProps.answered) {
        if (lineSvg) {
          mount(container, lineDiv, lineSvg);
          unmount(lineSvg);
        }
        final = true;
        update(1);
      }
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
    if (checkbox) checkbox.classList.toggle('-answered', answered);
    if (percentage) percentage.classList.toggle('-answered', answered);
    if (lineDiv) lineDiv.classList.toggle('-answered', answered);
    if (lineSvg) lineSvg.classList.toggle('-answered', answered);
    getInterface(answer).update();
    if (currProps.voters) {
      if (currProps.quiz) {
        if (currProps.voters.chosen) {
          container.classList.toggle('-correct', currProps.voters.correct === true);
          container.classList.toggle('-wrong', currProps.voters.correct === false);
        }
        getInterface(answer).update(currProps.voters.correct, currProps.voters.chosen);
      } else if (currProps.voters.chosen) {
        getInterface(answer).update(undefined, currProps.voters.chosen);
      }
    }
    if (!currProps.closed && prevProps !== currProps) {
      requestAnimationFrame(rafCallback);
    } else {
      update(1);
    }
  };

  updateOption(currProps);

  return useInterface(container, {
    updateOption,
    getKey: () => initialProps.option.option,
    reset: () => getInterface(checkboxEl).reset(),
  });
}

export type PollOptionInterface = ReturnType<typeof pollOption>;
