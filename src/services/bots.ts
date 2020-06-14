import { userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import client from 'client/client';
import { peerMessageToId } from 'helpers/api';
import { KeyboardButton, Message, Peer } from 'mtproto-js';
import { message } from 'services';
import { hiddenUrlClickHandler, urlClickHandler } from './click_handlers';

function sendBotCommand(peer: Peer, botId: number, cmd: string, replyTo: number) {
  const bot = userCache.get(botId);
  if (bot?._ !== 'user') {
    return;
  }

  let toSend = cmd;
  if (!replyTo && cmd.indexOf('@') < 2 && bot.username) {
    toSend += `@${bot.username}`;
  }
  message.replyToMessageID.next(peerMessageToId(peer, replyTo));
  message.sendMessage(toSend);
}

function sendBotCallback(button: KeyboardButton.keyboardButtonCallback, msg: Message.message) {
  const bot = userCache.get(msg.from_id!);
  if (bot?._ !== 'user') {
    return;
  }
  client.call('messages.getBotCallbackAnswer', { peer: peerToInputPeer(msg.to_id), msg_id: msg.id, data: button.data, game: false });
}

export function activateBotCommand(msg: Message.message, row: number, column: number) {
  if (!msg.reply_markup || (msg.reply_markup._ !== 'replyInlineMarkup' && msg.reply_markup._ !== 'replyKeyboardMarkup')) {
    return;
  }

  const button = msg.reply_markup.rows[row].buttons[column];

  switch (button._) {
    case 'keyboardButton': {
      const replyTo = (msg.id > 0) ? msg.id : 0;
      sendBotCommand(msg.to_id, msg.from_id!, button.text, replyTo);
      break;
    }
    case 'keyboardButtonCallback':
      sendBotCallback(button, msg);
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
