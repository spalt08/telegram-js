import { ripple } from 'components/ui';
import { listen } from 'core/dom';
import { useInterface } from 'core/hooks';
import { div, nothing, text } from 'core/html';
import { KeyboardButton, Message } from 'mtproto-js';
import { bots } from 'services';
import './reply_markup.scss';

function markupButton(msg: Message.message, button: KeyboardButton, row: number, column: number) {
  const isExternal = button._ === 'keyboardButtonUrl' || button._ === 'keyboardButtonUrlAuth';
  const isShare = button._ === 'keyboardButtonSwitchInline';
  const className = `reply-markup__button ${isExternal ? '-external' : ''} ${isShare ? '-share' : ''}`;
  const buttonEl = ripple({ className }, [text(button.text)]);
  listen(buttonEl, 'click', () => {
    bots.activateBotCommand(msg, row, column);
  });
  return buttonEl;
}

export default function replyMarkupRenderer(msg: Message.message, className?: string) {
  let container;
  let rows;

  if (msg._ === 'message' && msg.reply_markup && (msg.reply_markup._ === 'replyInlineMarkup' || msg.reply_markup._ === 'replyKeyboardMarkup')) {
    container = div`.reply-markup ${className}`(
      ...msg.reply_markup.rows.map((row, y) => div`.reply-markup__row`(
        ...row.buttons.map((button, x) => markupButton(msg, button, y, x))),
      ),
    );
    rows = msg.reply_markup.rows.length;
  } else {
    container = nothing;
    rows = 0;
  }

  return useInterface(container, {
    height: rows * 40,
  });
}
