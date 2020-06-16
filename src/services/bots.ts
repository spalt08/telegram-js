import { userCache } from 'cache';
import { peerToInputPeer, peerToInputUser } from 'cache/accessors';
import client, { fetchUpdates } from 'client/client';
import { peerMessageToId, userIdToPeer } from 'helpers/api';
import { KeyboardButton, Message, Peer, User } from 'mtproto-js';
import { hiddenUrlClickHandler, urlClickHandler } from './click_handlers';

const { message } = require('services');

export default class BotsService {
  #botStartTokens = new Map<number, string | undefined>();
  #botStartGroupTokens = new Map<number, string | undefined>();

  setStartToken(bot: User.user, token?: string) {
    this.#botStartTokens.set(bot.id, token);
  }

  setStartGroupToken(bot: User.user, token?: string) {
    this.#botStartGroupTokens.set(bot.id, token);
  }

  sendBotCommand(peer: Peer, botId: number, cmd: string, replyTo: number) {
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

  private sendBotCallback(button: KeyboardButton.keyboardButtonCallback, msg: Message.message) {
    const bot = userCache.get(msg.from_id!);
    if (bot?._ !== 'user') {
      return;
    }
    client.call('messages.getBotCallbackAnswer', { peer: peerToInputPeer(msg.to_id), msg_id: msg.id, data: button.data, game: false });
  }

  sendBotStart(bot: User.user, chat?: Peer) {
    const token = chat ? this.#botStartGroupTokens.get(bot.id) : this.#botStartTokens.get(bot.id);
    if (!token && chat) {
      this.sendBotCommand(chat, bot.id, '/start', 0);
      return;
    }

    const randomId = Math.ceil(Math.random() * 0xFFFFFF).toString(16) + Math.ceil(Math.random() * 0xFFFFFF).toString(16);
    const params = {
      peer: chat ? peerToInputPeer(chat) : { _: 'inputPeerEmpty' } as const,
      bot: peerToInputUser(userIdToPeer(bot.id)),
      random_id: randomId,
      start_param: token ?? '',
    } as const;
    client.call('messages.startBot', params).then((updates) => fetchUpdates(updates));
  }

  activateBotCommand(msg: Message.message, row: number, column: number) {
    if (!msg.reply_markup || (msg.reply_markup._ !== 'replyInlineMarkup' && msg.reply_markup._ !== 'replyKeyboardMarkup')) {
      return;
    }

    const button = msg.reply_markup.rows[row].buttons[column];

    switch (button._) {
      case 'keyboardButton': {
        const replyTo = (msg.id > 0) ? msg.id : 0;
        this.sendBotCommand(msg.to_id, msg.from_id!, button.text, replyTo);
        break;
      }
      case 'keyboardButtonCallback':
        this.sendBotCallback(button, msg);
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

}
