import { lamp } from 'components/icons';
import { useMaybeObservable } from 'core/hooks';
import { div } from 'core/html';
import { MaybeObservable } from 'core/types';
import { PollResults } from 'mtproto-js';
import './poll_solution.scss';

export default function pollSolution(results: MaybeObservable<PollResults>) {
  const container = div`.pollSolution`(lamp());
  useMaybeObservable(container, results, (r) => {
    container.classList.toggle('-visible', !!r.solution);
    container.title = r.solution ?? ''; // todo: show solution in popup
  });
  return container;
}
