import { messageCache } from 'cache';
import { messageToSenderPeer, peerToColorCode } from 'cache/accessors';
import { profileAvatar, profileTitle } from 'components/profile';
import { bubble, formattedMessage, datetime, bubbleClassName } from 'components/ui';
import { div, nothing, text } from 'core/html';
import { isEmoji, getDayOffset, getMessageTooltipTitle } from 'helpers/message';
import { formatNumber } from 'helpers/other';
import { Message } from 'mtproto-js';
import './message.scss';
import messageReply from './reply';
import messageSerivce from './service';
import { messageMediaUpper, messageMediaLower, enhanceClassName, hasMediaToMask, messageMediaImmutable } from './message_media';
import { mount } from 'core/dom';

export type MessageSibling = undefined | {
  id: string;
  day: string;
  from?: number;
};

// // Display only emoji
// if (msg.message.length <= 6 && isEmoji(msg.message)) {
//   return {
//     message: div`.as-emoji.only-sticker`(
//       reply,
//       div`.message__emoji${`e${msg.message.length / 2}`}`(text(msg.message)),
//       info,
//     ),
//     info,
//   };
// }

function isLastMessage(msg: Message.message, siblings: [MessageSibling, MessageSibling]) {
  const nextSibling = siblings[0];
  if (!nextSibling) return true;
  return nextSibling.day !== getDayOffset(msg) || nextSibling.from !== msg.from_id;
}

function isFirstMessage(msg: Message.message, siblings: [MessageSibling, MessageSibling]) {
  const prevSibling = siblings[1];
  if (!prevSibling) return true;
  return prevSibling.day !== getDayOffset(msg) || prevSibling.from !== msg.from_id;
}

function messageTitle(peer: Peer) {
  return div`.message__title${`color-${peerToColorCode(peer)}`}`(profileTitle(peer));
}

export default function message(id: string, siblings: [MessageSibling, MessageSibling]) {
  const msg = messageCache.get(id);

  if (!msg) return div();

  switch (msg._) {
    case 'messageEmpty':
      return div();

    case 'messageService':
      return messageSerivce(msg);

    default:
  }

  const senderPeer = messageToSenderPeer(msg);
  const isChat = msg.to_id._ !== 'peerUser';
  const isLast = isLastMessage(msg, siblings);
  const isFirst = isFirstMessage(msg, siblings);
  const masked = hasMediaToMask(msg);

  let avatar = (isChat && !msg.out && isLast) ? profileAvatar(senderPeer) : undefined;
  let reply = msg.reply_to_msg_id ? messageReply(msg.reply_to_msg_id, msg) : undefined;
  let title = (isChat && isFirst && !msg.out && !masked) ? messageTitle(senderPeer) : undefined;
  let textEl = msg.message ? div`.message__text${msg.out ? '.message__text-out' : ''}`(formattedMessage(msg)) : undefined;
  let mediaUpper = messageMediaUpper(msg);
  let mediaLower = messageMediaLower(msg);

  const edited = text(msg.edit_date && !msg.edit_hide ? 'edited ' : '');
  const info: HTMLDivElement = div({ className: msg.out ? 'message__info-out' : 'message__info' },
    (msg.views && !msg.out) ? div`.message__views`(text(formatNumber(msg.views))) : nothing, // to do: update views
    (msg.post_author && !msg.out) ? div`.message__author`(text(`${msg.post_author}, `)) : nothing,
    edited,
    datetime({ timestamp: msg.date, date: false }),
  );

  let content = messageMediaImmutable(msg);

  if (!content) {
    content = bubble({ media: masked, out: msg.out, isFirst, isLast, className: enhanceClassName(msg) },
      title || nothing,
      reply || nothing,
      mediaUpper || nothing,
      textEl || nothing,
      mediaLower || nothing,
    );
  } else if (reply) {
    mount(content, reply, content.firstChild || undefined);
  }

  const container = div(
    { className: msg.out ? 'message-out' : `message${isChat ? '-chat' : ''}${isLast ? '-last' : ''}` },
    div`.message__align`(
      avatar || nothing,
      content,
    ),
  );

  info.title = getMessageTooltipTitle(msg);
  if (textEl && !mediaLower) mount(textEl, info);
  else mount(content, info);

  return container;
}
