import { div, text, nothing, span } from 'core/html';
import { useInterface, hasInterface, getInterface, useOnMount } from 'core/hooks';
import { mount, unmount } from 'core/dom';
import { messageCache, dialogCache } from 'cache';
import { Peer, Message, Dialog } from 'mtproto-js';
import { formattedMessage, bubble, messageInfo, MessageInfoInterface } from 'components/ui';
import { profileAvatar, profileTitle } from 'components/profile';
import webpagePreview from 'components/media/webpage/preview';
import photoPreview from 'components/media/photo/preview';
import { getAttributeSticker, getAttributeVideo, getAttributeAnimated, getAttributeAudio } from 'helpers/files';
import stickerRenderer from 'components/media/sticker/sticker';
import documentFile from 'components/media/document/file';
import videoPreview from 'components/media/video/preview';
import videoRenderer from 'components/media/video/video';
import audio from 'components/media/audio/audio';
import { messageToSenderPeer, peerToColorCode } from 'cache/accessors';
import { userIdToPeer, peerToId } from 'helpers/api';
import { isEmoji } from 'helpers/message';
import { main, message as service } from 'services';
import { todoAssertHasValue } from 'helpers/other';
import { useContextMenu } from 'components/global_context_menu';
import * as icons from 'components/icons';
import messageSerivce from './service';
import messageReply from './reply';
import replyMarkupRenderer from './reply_markup';
import './message.scss';

type MessageInterface = {
  from(): number,
  update(): void,
  updateLayout(): void,
  getBorders(): { first: boolean, last: boolean },
  setBorders(first: boolean, last: boolean): void,
  id: string,
};

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
        { out, className: extraClass, media: true },
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
        { out, className: extraClass, media: true },
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
      fit: 'contain', width: 320, height: 320, minHeight: 60, minWidth: msg.message ? 320 : undefined }, peer, msg);
    if (!hasMessage && previewEl instanceof Element) previewEl.classList.add('raw');

    return {
      message: bubble(
        { out, className: extraClass, media: true },
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

  // console.log(msg.media);

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
  const container = div`.message`();
  const subject = messageCache.useItemBehaviorSubject(container, id);

  if (peer._ !== 'peerUser') container.classList.add('chat');

  let aligner: HTMLElement | undefined;
  let renderedMessage: Node | undefined;
  let renderedInfo: Node | undefined;
  let profilePicture: Node | undefined;
  let replyMarkup: Node | undefined;

  // previous message before update
  let cached: Message | undefined;

  // listen cache changes for auto rerendering
  subject.subscribe((msg: Message | undefined) => {
    if (!msg) return;

    // shouldn't rerender service and empty message
    if (!msg || msg._ !== 'message') {
      if (msg._ === 'messageService') mount(container, messageSerivce(peer, msg));
      cached = msg;
      return;
    }

    if (msg.out) container.classList.add('out');

    // first render for common message
    if (!aligner) {
      aligner = div`.message__align`();
      mount(container, aligner);
    }

    // re-rendering
    if (!renderedMessage || !cached || (cached._ === 'message' && msg.message !== cached.message)) {
      if (renderedMessage) unmount(renderedMessage);

      const rm = renderMessage(msg, peer);

      renderedMessage = rm.message;
      renderedInfo = rm.info;

      useContextMenu(renderedMessage, [
        { icon: icons.reply, label: 'Reply', onClick: () => service.setMessageForReply(id) },
      ]);

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

      mount(aligner, renderedMessage);

      if (onUpdateHeight) onUpdateHeight(id);
    }

    // render reply markup
    if (msg.reply_markup && !replyMarkup) {
      replyMarkup = replyMarkupRenderer(msg.reply_markup);
      mount(aligner, replyMarkup);

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
    container.classList.toggle('first', first);
    container.classList.toggle('last', last);
    if (hasInterface<any>(renderedMessage)) {
      getInterface(renderedMessage).updateBorders(first, last);
    }
  };

  // update meta elemens (message avatar for chats) depends on classList
  const updateLayout = () => {
    // remove picture
    if (profilePicture && !isLast) {
      unmount(profilePicture);
      profilePicture = undefined;
    }

    // display picture
    if (aligner && container.classList.contains('chat') && isLast && !container.classList.contains('out')
      && !profilePicture && cached && cached._ !== 'messageEmpty') {
      const senderPeer = messageToSenderPeer(cached);
      profilePicture = div`.message__profile`(profileAvatar(senderPeer));
      mount(aligner, profilePicture, aligner.firstChild || undefined);
    }
  };

  // update classList for first, last
  const update = (recursive: boolean = false) => {
    const nextEl = container.nextElementSibling;
    const prevEl = container.previousElementSibling;

    // check next message meta
    if (nextEl && hasInterface<MessageInterface>(nextEl)) {
      const next = getInterface(nextEl);

      if (cached && cached._ !== 'messageEmpty' && next.from() === cached.from_id) {
        setBorders(isFirst, false);
        getInterface(nextEl).setBorders(false, getInterface(nextEl).getBorders().last);
      } else {
        getInterface(nextEl).setBorders(true, getInterface(nextEl).getBorders().last);
        setBorders(isFirst, true);
      }
    } else {
      setBorders(isFirst, true);
    }

    if (!prevEl) {
      setBorders(true, isLast);
    }

    // update previous
    if (recursive && prevEl && hasInterface<MessageInterface>(prevEl)) getInterface(prevEl).update();

    updateLayout();
  };

  // useOnMount(container, () => update(true));

  return useInterface(container, {
    from: () => cached && cached._ !== 'messageEmpty' ? cached.from_id : 0,
    updateLayout,
    update,
    id,
    getBorders,
    setBorders,
  });
}
