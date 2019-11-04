// @flow

import { div, span } from 'core/html';
import { useMutation } from 'core/mutation';

const timer = useMutation<number>(0);

setInterval(() => timer.value++, 100);

export default (
  div`.LoginContainer`(
    div`.LoginForm`,
    div(
      span('Timer: '),
      timer,
    ),
  )
);
