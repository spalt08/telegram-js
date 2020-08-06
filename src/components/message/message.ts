import { messageCache, dialogCache } from 'cache';
import { messageToSenderPeer, peerToColorCode } from 'cache/accessors';
import { profileAvatar, profileTitle } from 'components/profile';
import { bubble, bubbleClassName, datetime, formattedMessage } from 'components/ui';
import { listen, mount, unmount, unmountChildren } from 'core/dom';
import { getInterface, useObservable } from 'core/hooks';
import { div, nothing, text } from 'core/html';
import { getDayOffset, getMessageTooltipTitle } from 'helpers/message';
import { formatNumber } from 'helpers/other';
import { Message, Peer } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { click, message as service } from 'services';
import { peerToDialogId } from 'helpers/api';
import { useContextMenu } from 'components/global_context_menu';
import * as icons from 'components/icons';
import './message.scss';
import { enhanceClassName, hasMediaChanged, hasMediaToMask, messageMediaImmutable, messageMediaLower, messageMediaUpper } from './message_media';
import messageReply from './reply';
import replyMarkupRenderer from './reply_markup';
import messageService from './service';

export type MessageSibling = undefined | {
  id: string;
  day: string;
  from?: number;
};

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

function createAvatar(msg: Message.message, peer: Peer) {
  const avatar = profileAvatar(peer);
  listen(avatar, 'click', () => click.urlClickHandler(`internal:user-id//${msg.from_id}`));
  return avatar;
}

export default function message(id: string, siblings: BehaviorSubject<[MessageSibling, MessageSibling]>, unreadMark?: boolean) {
  const cached = messageCache.get(id);

  if (!cached) return div();

  switch (cached._) {
    case 'messageEmpty':
      return div();

    case 'messageService':
      return messageService(cached);

    default:
  }

  let msg = cached;
  const senderPeer = messageToSenderPeer(msg);
  const isChat = msg.to_id._ !== 'peerUser';
  let isLast = isLastMessage(msg, siblings.value);
  let isFirst = isFirstMessage(msg, siblings.value);
  const masked = hasMediaToMask(msg);

  let wrapper: HTMLDivElement;
  let avatar = isChat && !msg.out && isLast ? createAvatar(msg, senderPeer) : undefined;
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

  if (msg.out) {
    const dialogId = peerToDialogId(msg.to_id);
    const dialog = dialogCache.get(dialogId);
    if (dialog && dialog._ === 'dialog' && dialog.read_outbox_max_id < msg.id) {
      info.classList.add('-unread');

      const subject = dialogCache.useItemBehaviorSubject(info, dialogId);
      const subscription = subject.subscribe((nextDialog) => {
        if (nextDialog && nextDialog._ === 'dialog' && nextDialog.read_outbox_max_id >= msg.id) {
          info.classList.remove('-unread');
          subscription.unsubscribe();
        }
      });
    }
  }

  let replyMarkup: ReturnType<typeof replyMarkupRenderer> | undefined;
  let replyHeight = 0;
  if (msg.reply_markup) {
    replyMarkup = replyMarkupRenderer(msg, msg.out ? 'message__reply-markup-out' : 'message__reply-markup');
    replyHeight = getInterface(replyMarkup).height + 4;
  }

  let content = messageMediaImmutable(msg);

  if (!content) {
    content = bubble(
      {
        media: masked,
        out: msg.out,
        isFirst,
        isLast,
        className: enhanceClassName(msg, textEl),
        setRef: (el) => bubbleContent = el,
      },
      title || nothing,
      reply || nothing,
      mediaUpper || nothing,
      textEl || nothing,
      mediaLower || nothing,
    );
    if (replyMarkup) {
      mount(content, replyMarkup);
    }
  } else if (reply) {
    mount(content, reply, content.firstChild || undefined);
  }

  const container = div(
    { className: msg.out ? `message-out${isLast ? ' message-out-last' : ''}` : `message${isChat ? '-chat' : ''}${isLast ? '-last' : ''}` },
    unreadMark ? div`.message__unread-mark`(text('Unread Messages')) : nothing,
    wrapper = div`.message__align`(
      avatar || nothing,
      content,
    ),
  );

  if (replyHeight > 0) {
    wrapper.style.marginBottom = `${replyHeight}px`;
  }

  info.title = getMessageTooltipTitle(msg);
  if (textEl && !mediaLower) mount(textEl, info);
  else mount(content, info);

  useContextMenu(container, [
    { icon: icons.reply, label: 'Reply', onClick: () => service.setMessageForReply(id) },
  ]);
  /**
   * Position was updated inside scroll
   */
  useObservable(container, siblings, true, (next) => {
    const isLastNow = isLastMessage(msg, next);
    const isFirstNow = isFirstMessage(msg, next);

    // no changes
    if (isLastNow === isLast && isFirstNow === isFirst) return;

    // display or remove avatar
    if (isChat && !msg.out && isLast) {
      if (!avatar || !avatar.parentElement) mount(wrapper, avatar = createAvatar(msg, senderPeer), content);
    } else if (avatar) {
      unmount(avatar);
      avatar = undefined;
    }

    // display or remove title
    if (isChat && isFirstNow && !msg.out && !masked) {
      if ((!title || !title.parentElement) && bubbleContent) {
        mount(bubbleContent, title = messageTitle(senderPeer), reply || mediaUpper || textEl || mediaLower);
      }
    } else if (title) {
      unmount(title);
      title = undefined;
    }

    // display or remove avatar
    if (isChat && isLastNow && !msg.out) {
      if (!avatar || !avatar.parentElement) mount(wrapper, avatar = createAvatar(msg, senderPeer), content);
    } else if (avatar) {
      unmount(avatar);
      avatar = undefined;
    }

    // update className
    if (bubbleContent && content) {
      content.className = bubbleClassName(
        enhanceClassName(msg, textEl),
        msg.out || false,
        hasMediaToMask(msg),
        isFirstNow,
        isLastNow,
      );
    }

    const newclass = msg.out ? `message-out${isLastNow ? ' message-out-last' : ''}` : `message${isChat ? '-chat' : ''}${isLastNow ? '-last' : ''}`;
    if (container.className !== newclass) {
      container.className = newclass;
    }

    isFirst = isFirstNow;
    isLast = isLastNow;
  });

  /**
   * Update Contents Strategy
   */
  messageCache.useWatchItem(container, id, (next: Message.message) => {
    if (msg === next) return;
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

    if (next.reply_markup) {
      if (replyMarkup) unmount(replyMarkup);
      replyMarkup = replyMarkupRenderer(next, next.out ? 'message__reply-markup-out' : 'message__reply-markup');
      replyHeight = getInterface(replyMarkup).height + 2;

      if (replyMarkup && content) {
        mount(content, replyMarkup);
      }
      wrapper.style.marginBottom = `${replyHeight}px`;
    } else {
      if (replyMarkup) unmount(replyMarkup);
      wrapper.style.removeProperty('margin-bottom');
    }

    // update className
    if (bubbleContent && content) {
      content.className = bubbleClassName(
        enhanceClassName(next, textEl),
        msg.out || false,
        hasMediaToMask(msg),
        isFirst,
        isLast,
      );
    }

    msg = next;
  });

  return container;
}
