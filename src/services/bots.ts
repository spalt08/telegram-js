import { userCache } from 'cache';
import client from 'client/client';
import { Message } from 'mtproto-js';
import { hiddenUrlClickHandler, urlClickHandler } from './click_handlers';

client.updates.on('updateBotCallbackQuery', (e) => {
  console.error(e);
});

client.updates.on('updateBotInlineQuery', (e) => {
  console.error(e);
});

export function activateBotCommand(msg: Message.message, row: number, column: number) {
  if (!msg.reply_markup || (msg.reply_markup._ !== 'replyInlineMarkup' && msg.reply_markup._ !== 'replyKeyboardMarkup')) {
    return;
  }

  const button = msg.reply_markup.rows[row].buttons[column];

  switch (button._) {
    case 'keyboardButton': {
      const replyTo = (msg.id > 0) ? msg.id : 0;
      // sendBotCommand(msg.to_id, msg.from_id, button.text, replyTo);
      break;
    }
    case 'keyboardButtonCallback':
    case 'keyboardButtonGame':
      // sendBotCallback(button, msg, row, column);
      break;
    case 'keyboardButtonUrl': {
      const { url } = button;
      const bot = msg.from_id ? userCache.get(msg.from_id) : undefined;
      const skipConfirmation = bot?._ === 'user' && bot.verified;
      if (skipConfirmation) {
        urlClickHandler(url);
      } else {
        hiddenUrlClickHandler(url);
      }
      break;
    }
    default:
  }
}
