// @flow

import { Component } from 'core';
import { div, span } from 'core/html';

class ButtonComponent extends Component {
  constructor() {
    super('button', { className: 'btn' });
  }
}

export default (
  div`.LoginContainer`(
    div`.LoginForm`,
    ButtonComponent,
    span`.test`,
    div(
      span,
    ),
  )
);
