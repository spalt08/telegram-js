import { div, text, nothing, span } from 'core/html';
import { useInterface, hasInterface, getInterface, useOnMount } from 'core/hooks';
import { mount, unmount } from 'core/dom';
import { messageCache, dialogCache } from 'cache';
import { Peer, Message, Dialog } from 'mtproto-js';
import { formattedMessage, bubble, BubbleInterface, messageInfo, MessageInfoInterface } from 'components/ui';
import { profileAvatar, profileTitle } from 'components/profile';
import webpagePreview from 'components/media/webpage/preview';
import photoPreview from 'components/media/photo/preview';
import { getAttributeSticker, getAttributeVideo, getAttributeAnimated, getAttributeAudio } from 'helpers/files';
import stickerRenderer from 'components/media/sticker/sticker';
import documentFile from 'components/media/document/file';
import videoPreview from 'components/media/video/preview';
import videoRenderer from 'components/media/video/video';
import audio from 'components/media/audio/audio';
import poll from 'components/media/poll/poll';
import { messageToSenderPeer, peerToColorCode } from 'cache/accessors';
import { userIdToPeer, peerToId } from 'helpers/api';
import { isEmoji } from 'helpers/message';
import { main } from 'services';
import { todoAssertHasValue } from 'helpers/other';
import messageSerivce from './service';
import messageReply from './reply';
import replyMarkupRenderer from './reply_markup';

import './message.scss';

type MessageInterface = {
  from(): number,
  day(): number,
  update(): void,
  updateLayout(): void,
  getBorders(): { first: boolean, last: boolean },
  setBorders(first: boolean, last: boolean): void,
  id: string,
};

const now = new Date();
const timezoneOffset = now.getTimezoneOffset() * 60;

function messageText(msg: Message.message, info: Node) {
  if (msg.message) {
    return div`.message__text`(formattedMessage(msg), info);
  }
  return info;
}

// message renderer
const renderMessage = (msg: Message.message, peer: Peer): { message: Node, info: Node } => {
  const out = msg.out ?? false;
  const info = messageInfo({ className: 'message__info', status: 'read' }, msg);
  const hasReply = !!msg.reply_to_msg_id;
  const hasMessage = !!msg.message;
  const reply = hasReply ? messageReply(msg.reply_to_msg_id!, peer, msg) : nothing;
  let title: Node = nothing;

  if (peer._ !== 'peerUser') {
    const senderPeer = messageToSenderPeer(msg);
    title = div`.message__title${`color-${peerToColorCode(senderPeer)}`}`(profileTitle(senderPeer));
  }

  // regular message
  if (!msg.media || msg.media._ === 'messageMediaEmpty') {
    // Display only emoji
    if (msg.message.length <= 6 && isEmoji(msg.message)) {
      return {
        message: div`.as-emoji.only-sticker`(
          reply,
          div`.message__emoji${`e${msg.message.length / 2}`}`(text(msg.message)),
          info,
        ),
        info,
      };
    }

    // regular
    return {
      message: bubble(
        { out },
        title,
        reply,
        messageText(msg, info),
      ),
      info,
    };
  }

  // with webpage
  if (msg.media._ === 'messageMediaWebPage' && msg.media.webpage._ !== 'webPageEmpty') {
    const type = msg.media.webpage._ === 'webPage' ? msg.media.webpage.type : '';
    const extraClass = (type === 'video' || type === 'photo') ? 'with-webpage-media' : 'with-webpage';

    return {
      message: bubble(
        { out, className: extraClass },
        title,
        reply,
        div`.message__text`(formattedMessage(msg), info),
        msg.media.webpage._ === 'webPage' ? div`.message__media-padded`(webpagePreview(msg.media.webpage)) : nothing,
      ),
      info,
    };
  }

  // with photo
  if (msg.media._ === 'messageMediaPhoto' && msg.media.photo?._ === 'photo') {
    const extraClass = msg.message ? 'with-photo' : 'only-photo';
    const popupPeer = peer._ === 'peerChannel' ? peer : userIdToPeer(todoAssertHasValue(msg.from_id));
    const photoEl = photoPreview(msg.media.photo, popupPeer, msg, {
      fit: 'contain', width: 320, height: 320, minHeight: 60, minWidth: msg.message ? 320 : undefined,
    });
    if (!hasMessage && photoEl instanceof Element) photoEl.classList.add('raw');

    return {
      message: bubble(
        { out, className: extraClass, masked: !hasMessage, onlyMedia: !hasReply && !hasMessage },
        reply,
        photoEl || nothing,
        messageText(msg, info),
      ),
      info,
    };
  }

  // with sticker
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document' && getAttributeSticker(msg.media.document)) {
    const attr = getAttributeSticker(msg.media.document);

    return {
      message: div`.only-sticker`(
        reply,
        stickerRenderer(msg.media.document, { size: '200px', autoplay: true, onClick: () => attr && main.showPopup('stickerSet', attr.stickerset) }),
        info,
      ),
      info,
    };
  }

  // with video gif
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document' && getAttributeAnimated(msg.media.document)) {
    const extraClass = msg.message ? 'with-photo' : 'only-photo with-video';
    const video = videoRenderer(msg.media.document, {
      fit: 'contain', width: 320, height: 320, minHeight: 60, minWidth: msg.message ? 320 : undefined,
    });
    if (!hasMessage && video instanceof Element) video.classList.add('raw');

    return {
      message: bubble(
        { out, className: extraClass, masked: !hasMessage, onlyMedia: !hasReply && !hasMessage },
        reply,
        video,
        messageText(msg, info),
      ),
      info,
    };
  }

  // with video
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document' && getAttributeVideo(msg.media.document)) {
    const extraClass = hasMessage ? 'with-photo' : 'only-photo';
    const previewEl = videoPreview(msg.media.document, {
      fit: 'contain', width: 320, height: 320, minHeight: 60, minWidth: msg.message ? 320 : undefined
    }, peer, msg);
    if (!hasMessage && previewEl instanceof Element) previewEl.classList.add('raw');

    return {
      message: bubble(
        { out, className: extraClass, masked: !hasMessage, onlyMedia: !hasReply && !hasMessage },
        reply,
        previewEl || nothing,
        messageText(msg, info),
      ),
      info,
    };
  }

  // with audio
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document' && getAttributeAudio(msg.media.document)) {
    const extraClass = hasMessage ? 'with-audio' : 'only-audio';
    const previewEl = audio(msg.media.document);

    return {
      message: bubble(
        { out, className: extraClass },
        reply,
        div`.message__media-padded`(previewEl),
        messageText(msg, info),
      ),
      info,
    };
  }

  // with document
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document') {
    const extraClass = hasMessage ? 'with-document' : 'only-document';
    return {
      message: bubble(
        { out, className: extraClass },
        reply,
        div`.message__media-padded`(documentFile(msg.media.document)),
        messageText(msg, info),
      ),
      info,
    };
  }

  // with poll
  if (msg.media._ === 'messageMediaPoll') {
    const extraClass = hasMessage ? 'with-poll' : 'only-poll';
    return {
      message: bubble(
        { out, className: extraClass },
        reply,
        div`.message__text`(
          poll(msg.media.poll, msg.media.results, info),
        ),
      ),
      info,
    };
  }

  console.log(msg);

  // fallback
  return {
    message: bubble(
      { out, className: 'not-implemented' },
      title,
      reply,
      div`.message__text`(
        span`.fallback`(text('This type of message is not implemented yet')),
        info,
      ),
    ),
    info,
  };
};

export default function message(id: string, peer: Peer, onUpdateHeight?: (id: string) => void) {
  const element = div`.message`();
  const subject = messageCache.useItemBehaviorSubject(element, id);

  let container: Node | undefined;
  let aligner: HTMLElement | undefined;
  let wrapper: Node | undefined;
  let renderedMessage: Node | undefined;
  let renderedInfo: Node | undefined;
  let dayLabel: Node | undefined;
  let profilePicture: Node | undefined;
  let replyMarkup: Node | undefined;

  // previous message before update
  let cached: Message | undefined;

  // utc day number
  const day = () => Math.ceil(((cached && cached._ !== 'messageEmpty' ? cached.date : 0) - timezoneOffset) / 3600 / 24);

  // listen cache changes for auto rerendering
  subject.subscribe((msg: Message | undefined) => {
    // first render
    if (!container) {
      if (!msg) return;
      if (msg._ === 'messageEmpty') container = div`.message__empty`();
      if (msg._ === 'messageService') container = messageSerivce(peer, msg);
      else container = div`.message__container`();

      if (peer._ !== 'peerUser') element.classList.add('chat');

      mount(element, container);
    }

    if (msg && msg._ !== 'messageEmpty' && msg.out) {
      element.classList.add('out');
    }

    // shouldn't rerender service and empty message
    if (!msg || msg._ !== 'message') {
      cached = msg;
      return;
    }

    // first render for common message
    if (!aligner || !wrapper) {
      wrapper = div`.message__wrap`();
      aligner = div`.message__align`(wrapper);
      mount(container, aligner);
    }

    // re-rendering
    if (!renderedMessage || !cached || (cached._ === 'message' && msg.message !== cached.message)) {
      if (renderedMessage) unmount(renderedMessage);

      const rm = renderMessage(msg, peer);

      renderedMessage = rm.message;
      renderedInfo = rm.info;

      // if unread
      const dialog = dialogCache.get(peerToId(peer));
      if (dialog?._ === 'dialog' && dialog.read_outbox_max_id < msg.id) {
        if (hasInterface<MessageInfoInterface>(renderedInfo)) {
          getInterface(renderedInfo).updateStatus('unread');

          const unsubscribe = dialogCache.watchItem(peerToId(peer), (nextDialog: Dialog) => {
            if (nextDialog._ === 'dialog' && nextDialog.read_outbox_max_id >= msg.id) {
              if (hasInterface<MessageInfoInterface>(renderedInfo)) {
                getInterface(renderedInfo).updateStatus('read');
              }
              unsubscribe();
            }
          });
        }
      }

      mount(wrapper, renderedMessage);

      if (onUpdateHeight) onUpdateHeight(id);
    }

    // render reply markup
    if (msg.reply_markup && !replyMarkup) {
      replyMarkup = replyMarkupRenderer(msg.reply_markup);
      mount(wrapper, replyMarkup);

      if (msg.reply_markup._ === 'replyKeyboardMarkup' || msg.reply_markup._ === 'replyInlineMarkup') {
        aligner.classList.add('with-reply-markup');
        aligner.classList.add(`rm-rows-${msg.reply_markup.rows.length}`);
      }
    }

    cached = msg;
  });

  let isFirst = false;
  let isLast = false;

  const getBorders = () => ({ first: isFirst, last: isLast });

  const setBorders = (first: boolean, last: boolean) => {
    isFirst = first;
    isLast = last;
    element.classList.toggle('first', first);
    element.classList.toggle('last', last);
    if (hasInterface<BubbleInterface>(renderedMessage)) {
      getInterface(renderedMessage).updateBorders(first, last);
    }
  };

  // update meta elemens (day label, message avatar for chats) depends on classList
  const updateLayout = () => {
    // remove daylabel
    if (dayLabel && !element.classList.contains('day')) {
      unmount(dayLabel);
      dayLabel = undefined;

      if (onUpdateHeight) onUpdateHeight(id);
    }

    // display daylabel
    if (element.classList.contains('day') && !dayLabel) {
      const mdate = new Date(cached && cached._ !== 'messageEmpty' ? cached.date * 1000 : 0);
      const label = mdate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

      dayLabel = div`.message-day`(div`.message-day__label`(text(label)));
      mount(element, dayLabel, container);

      if (onUpdateHeight) onUpdateHeight(id);
    }

    // remove picture
    if (profilePicture && !isLast) {
      unmount(profilePicture);
      profilePicture = undefined;
    }

    // display picture
    if (aligner && element.classList.contains('chat') && isLast && !element.classList.contains('out')
      && !profilePicture && cached && cached._ !== 'messageEmpty') {
      const senderPeer = messageToSenderPeer(cached);
      profilePicture = div`.message__profile`(profileAvatar(senderPeer));
      mount(aligner, profilePicture, wrapper);
    }
  };

  // update classList for daylabel, first, last
  const update = (recursive: boolean = false) => {
    const nextEl = element.nextElementSibling;
    const prevEl = element.previousElementSibling;

    // check next message meta
    if (nextEl && hasInterface<MessageInterface>(nextEl)) {
      const next = getInterface(nextEl);

      if (cached && cached._ !== 'messageEmpty' && next.from() === cached.from_id && next.day() === day()) {
        setBorders(isFirst, false);
        getInterface(nextEl).setBorders(false, getInterface(nextEl).getBorders().last);
      } else {
        getInterface(nextEl).setBorders(true, getInterface(nextEl).getBorders().last);
        setBorders(isFirst, true);
      }

      if (next.day() === day()) {
        if (nextEl.classList.contains('day')) {
          nextEl.classList.remove('day');
          if (recursive) next.updateLayout();
        }
      } else if (!nextEl.classList.contains('day')) {
        nextEl.classList.add('day');
        if (recursive) next.updateLayout();
      }
    } else {
      setBorders(isFirst, true);
    }

    if (!prevEl) {
      setBorders(true, isLast);
      if (!element.classList.contains('day')) {
        element.classList.add('day');
      }
    }

    // update previous
    if (recursive && prevEl && hasInterface<MessageInterface>(prevEl)) getInterface(prevEl).update();

    updateLayout();
  };

  useOnMount(element, () => update(true));

  return useInterface(element, {
    from: () => cached && cached._ !== 'messageEmpty' ? cached.from_id : 0,
    updateLayout,
    day,
    update,
    id,
    getBorders,
    setBorders,
  });
}
