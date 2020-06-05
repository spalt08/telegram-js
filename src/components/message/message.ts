import { messageCache } from 'cache';
import { BehaviorSubject } from 'rxjs';
import { messageToSenderPeer, peerToColorCode } from 'cache/accessors';
import { profileAvatar, profileTitle } from 'components/profile';
import { bubble, formattedMessage, datetime, bubbleClassName } from 'components/ui';
import { mount, unmountChildren, unmount } from 'core/dom';
import { div, nothing, text } from 'core/html';
import { useObservable } from 'core/hooks';
import { isEmoji, getDayOffset, getMessageTooltipTitle } from 'helpers/message';
import { formatNumber } from 'helpers/other';
import { Message, Peer } from 'mtproto-js';
import './message.scss';
import messageReply from './reply';
import messageSerivce from './service';
import { messageMediaUpper, messageMediaLower, enhanceClassName, hasMediaToMask, messageMediaImmutable, hasMediaChanged } from './message_media';

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

export default function message(id: string, siblings: BehaviorSubject<[MessageSibling, MessageSibling]>) {
  const cached = messageCache.get(id);

  if (!cached) return div();

  switch (cached._) {
    case 'messageEmpty':
      return div();

    case 'messageService':
      return messageSerivce(cached);

    default:
  }

  let msg = cached;
  const senderPeer = messageToSenderPeer(msg);
  const isChat = msg.to_id._ !== 'peerUser';
  let isLast = isLastMessage(msg, siblings.value);
  let isFirst = isFirstMessage(msg, siblings.value);
  const masked = hasMediaToMask(msg);

  let wrapper: HTMLDivElement;
  let avatar = (isChat && !msg.out && isLast) ? profileAvatar(senderPeer) : undefined;
  let reply = msg.reply_to_msg_id ? messageReply(msg.reply_to_msg_id, msg) : undefined;
  let title = (isChat && isFirst && !msg.out && !masked) ? messageTitle(senderPeer) : undefined;
  let textEl = msg.message ? div`.message__text${msg.out ? '.message__text-out' : ''}`(formattedMessage(msg)) : undefined;
  let mediaUpper = messageMediaUpper(msg);
  let mediaLower = messageMediaLower(msg);
  let bubbleContent: HTMLDivElement | undefined;

  const edited = text(msg.edit_date && !msg.edit_hide ? 'edited ' : '');
  const info: HTMLDivElement = div({ className: msg.out ? 'message__info-out' : 'message__info' },
    (msg.views && !msg.out) ? div`.message__views`(text(formatNumber(msg.views))) : nothing, // to do: update views
    (msg.post_author && !msg.out) ? div`.message__author`(text(`${msg.post_author}, `)) : nothing,
    edited,
    datetime({ timestamp: msg.date, date: false }),
  );

  let content: HTMLElement | undefined = messageMediaImmutable(msg);

  if (!content) {
    content = bubble({ media: masked, out: msg.out, isFirst, isLast, className: enhanceClassName(msg), setRef: (el) => bubbleContent = el },
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
    wrapper = div`.message__align`(
      avatar || nothing,
      content,
    ),
  );

  info.title = getMessageTooltipTitle(msg);
  if (textEl && !mediaLower) mount(textEl, info);
  else mount(content, info);

  /**
   * Position was updated inside scroll
   */
  useObservable(container, siblings, (next) => {
    const isLastNow = isLastMessage(msg, next);
    const isFirstNow = isFirstMessage(msg, next);

    // no changes
    if (isLastNow === isLast && isFirstNow === isFirst) return;

    // display or remove avatar
    if (isChat && !msg.out && isLast) {
      if (!avatar || !avatar.parentElement) mount(wrapper, avatar = profileAvatar(senderPeer), content);
    } else if (avatar) {
      unmount(avatar);
      avatar = undefined;
    }

    // display or remove title
    if (isChat && isFirst && !msg.out && !masked) {
      if ((!title || !title.parentElement) && bubbleContent) {
        mount(bubbleContent, title = messageTitle(senderPeer), reply || mediaUpper || textEl || mediaLower);
      }
    } else if (title) {
      unmount(title);
      title = undefined;
    }

    // update className
    if (bubbleContent && content) {
      content.className = bubbleClassName(
        enhanceClassName(msg),
        msg.out || false,
        hasMediaToMask(msg),
        isFirstNow,
        isLastNow,
      );
    }

    isFirst = isFirstNow;
    isLast = isLastNow;
  });

  /**
   * Update Contents Strategy
   */
  messageCache.useItemBehaviorSubject(container, id).subscribe((next: Message.message) => {
    if (!next) return;

    // message text
    if (next.message !== msg.message) {
      if (next.message && !textEl) textEl = div`.message__text${msg.out ? '.message__text-out' : ''}`();
      else if (textEl) unmountChildren(textEl);

      if (next.message && textEl) mount(textEl, formattedMessage(next));
      else if (textEl) {
        unmount(textEl);
        textEl = undefined;
      }

      if (textEl && bubbleContent && !textEl.parentElement) mount(bubbleContent, textEl, mediaLower);

      // remount info badge if necessary
      if (textEl && !mediaLower && info.parentElement !== textEl) mount(textEl, info);
      else if (content && info.parentElement !== content) mount(content, info);
    }

    // message reply
    if (next.reply_to_msg_id !== msg.reply_to_msg_id) {
      if (reply) unmount(reply);

      if (next.reply_to_msg_id) reply = messageReply(next.reply_to_msg_id, next);
      else reply = undefined;

      if (reply && bubbleContent) mount(bubbleContent, reply, mediaUpper || textEl || mediaLower);
    }

    // message edited
    if (next.edit_date !== msg.edit_date) {
      if (next.edit_hide) edited.textContent = '';
      else edited.textContent = 'edited, ';

      info.title = getMessageTooltipTitle(next);
    }

    if (hasMediaChanged(msg, next)) {
      // upper media remount
      if (mediaUpper) unmount(mediaUpper);

      mediaUpper = messageMediaUpper(next);

      if (mediaUpper && bubbleContent) mount(bubbleContent, mediaUpper, textEl);

      // lower media remount
      if (mediaLower) unmount(mediaLower);

      mediaLower = messageMediaLower(next);

      if (mediaLower && bubbleContent) mount(bubbleContent, mediaLower);
    }

    msg = next;
  });

  return container;
}
