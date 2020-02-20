import { ReplyMarkup } from 'cache/types';
import { nothing, div, text } from 'core/html';
import { mount } from 'core/dom';
import './reply_markup.scss';

export default function replyMarkupRenderer(markup: ReplyMarkup): Node {
  if (markup._ === 'replyKeyboardForceReply' || markup._ === 'replyKeyboardHide') return nothing;

  const container = div`.reply-markup`();

  for (let i = 0; i < markup.rows.length; i++) {
    const row = div`.reply-markup__row`();

    for (let j = 0; j < markup.rows[i].buttons.length; j++) {
      const button = markup.rows[i].buttons[j];
      const buttonEl = div`.reply-markup__button`(text(button.text));

      mount(row, buttonEl);
    }

    mount(container, row);
  }

  return container;
}
