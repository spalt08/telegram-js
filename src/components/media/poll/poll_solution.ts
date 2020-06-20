import { listen } from 'core/dom';
import { useMaybeObservable } from 'core/hooks';
import { div } from 'core/html';
import { MaybeObservable } from 'core/types';
import { PollResults } from 'mtproto-js';
import { main } from 'services';
import './poll_solution.scss';

export default function pollSolution(results: MaybeObservable<PollResults>) {
  let pollResults: PollResults;
  const container = div`.pollSolution`();
  useMaybeObservable(container, results, true, (r) => {
    container.classList.toggle('-visible', !!r.solution);
    pollResults = r;
  });

  listen(container, 'click', () => {
    main.showQuizResults(pollResults);
  });

  return container;
}
