import { div, text, nothing } from 'core/html';
import { useInterface, hasInterface, getInterface, useOnMount } from 'core/hooks';
import { mount, unmount } from 'core/dom';
import { messageCache, dialogCache } from 'cache';
import { Peer, Message, Dialog } from 'cache/types';
import { formattedMessage } from 'components/ui';
import client from 'client/client';
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
import { main } from 'services';
import { todoAssertHasValue } from 'helpers/other';
import messageSerivce from './service';
import messageReply from './reply';
import messageDate from './date';
import './message.scss';
import replyMarkupRenderer from './reply_markup';

type MessageInterface = {
  from(): number,
  day(): number,
  update(): void,
  updateLayout(): void,
  id: string,
};

const now = new Date();
const timezoneOffset = now.getTimezoneOffset() * 60;

// message renderer
const renderMessage = (msg: Message.message, peer: Peer) => {
  const date = messageDate(msg);
  const reply = msg.reply_to_msg_id ? messageReply(msg.reply_to_msg_id, peer, msg) : nothing;
  let title: Node = nothing;

  if (peer._ !== 'peerUser') {
    const senderPeer = messageToSenderPeer(msg);
    title = div`.message__title${`color-${peerToColorCode(senderPeer)}`}`(profileTitle(senderPeer));
  }

  // regular message
  if (!msg.media || msg.media._ === 'messageMediaEmpty') {
    // Display only emoji
    if (msg.message.length <= 6 && isEmoji(msg.message)) {
      return (
        div`.message__bubble.as-emoji.only-sticker`(
          reply,
          div`.message__emoji${`e${msg.message.length / 2}`}`(text(msg.message)),
          date,
        )
      );
    }

    // regular
    return (
      div`.message__bubble`(
        title,
        reply,
        div`.message__text`(formattedMessage(msg)),
        date,
      )
    );
  }

  // with webpage
  if (msg.media._ === 'messageMediaWebPage') {
    const type = msg.media.webpage._ === 'webPage' ? msg.media.webpage.type : '';
    const extraClass = (type === 'video' || type === 'photo') ? 'with-webpage-media' : 'with-webpage';

    return (
      div`.message__bubble${extraClass}`(
        title,
        reply,
        div`.message__text`(formattedMessage(msg)),
        msg.media.webpage._ === 'webPage' ? div`.message__media-padded`(webpagePreview(msg.media.webpage)) : nothing,
        date,
      )
    );
  }

  // with photo
  if (msg.media._ === 'messageMediaPhoto' && msg.media.photo?._ === 'photo') {
    const extraClass = msg.message ? 'with-photo' : 'only-photo';
    const popupPeer = peer._ === 'peerChannel' ? peer : userIdToPeer(todoAssertHasValue(msg.from_id));
    const photoEl = photoPreview(msg.media.photo, popupPeer, msg, {
      fit: 'contain', width: 320, height: 320, minHeight: 60, minWidth: msg.message ? 320 : undefined });
    const messageEl = msg.message ? div`.message__text`(formattedMessage(msg)) : nothing;

    return (
      div`.message__bubble${extraClass}`(
        reply,
        photoEl || nothing,
        messageEl,
        date,
      )
    );
  }

  // with sticker
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document' && getAttributeSticker(msg.media.document)) {
    const attr = getAttributeSticker(msg.media.document);

    return (
      div`.message__bubble.only-sticker`(
        reply,
        stickerRenderer(msg.media.document, { size: '200px', autoplay: true, onClick: () => attr && main.showPopup('stickerSet', attr.stickerset) }),
        date,
      )
    );
  }

  // with video gif
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document' && getAttributeAnimated(msg.media.document)) {
    const extraClass = msg.message ? 'with-photo' : 'only-photo with-video';
    const video = videoRenderer(msg.media.document, {
      fit: 'contain', width: 320, height: 320, minHeight: 60, minWidth: msg.message ? 320 : undefined });
    const messageEl = msg.message ? div`.message__text`(formattedMessage(msg)) : nothing;

    return (
      div`.message__bubble${extraClass}`(
        reply,
        video,
        messageEl,
        date,
      )
    );
  }

  // with video
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document' && getAttributeVideo(msg.media.document)) {
    const extraClass = msg.message ? 'with-photo' : 'only-photo';
    const previewEl = videoPreview(msg.media.document, {
      fit: 'contain', width: 320, height: 320, minHeight: 60, minWidth: msg.message ? 320 : undefined });
    const messageEl = msg.message ? div`.message__text`(formattedMessage(msg)) : nothing;

    return (
      div`.message__bubble${extraClass}`(
        reply,
        previewEl || nothing,
        messageEl,
        date,
      )
    );
  }

  // with audio
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document' && getAttributeAudio(msg.media.document)) {
    const previewEl = audio(msg.media.document);

    return (
      div`.message__bubble`(
        reply,
        div`.message__media-padded`(previewEl),
        date,
      )
    );
  }

  // with document
  if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document') {
    const messageEl = msg.message ? div`.message__text`(formattedMessage(msg)) : nothing;

    return (
      div`.message__bubble`(
        reply,
        div`.message__media-padded`(documentFile(msg.media.document)),
        messageEl,
        date,
      )
    );
  }

  // console.log(msg.media);

  // fallback
  return (
    div`.message__bubble`(
      title,
      reply,
      div`.message__text.fallback`(
        text('This type of message is not implemented yet'),
      ),
    )
  );
};

export default function message(id: string, peer: Peer, onUpdateHeight?: (id: string) => void) {
  const element = div`.message`();
  const subject = messageCache.useItemBehaviorSubject(element, id);

  let container: HTMLElement | undefined;
  let aligner: HTMLElement | undefined;
  let wrapper: HTMLElement | undefined;
  let bubble: HTMLElement | undefined;
  // let dayLabel: HTMLElement | undefined;
  let profilePicture: HTMLElement | undefined;
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

    if (msg && msg._ !== 'messageEmpty' && msg.from_id === client.getUserID()) {
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

      // if unread
      const dialog = dialogCache.get(peerToId(peer));
      if (dialog?._ === 'dialog' && dialog.read_outbox_max_id < msg.id) {
        element.classList.add('unread');

        const unsubscribe = dialogCache.watchItem(peerToId(peer), (nextDialog: Dialog) => {
          if (nextDialog._ === 'dialog' && nextDialog.read_outbox_max_id >= msg.id) {
            element.classList.remove('unread');
            unsubscribe();
          }
        });
      }
    }

    // re-rendering
    if (!bubble || !cached || (cached._ === 'message' && msg.message !== cached.message)) {
      if (bubble) unmount(bubble);

      bubble = renderMessage(msg, peer);
      mount(wrapper, bubble);

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

  // update meta elemens (day label, message avatar for chats) depends on classList
  const updateLayout = () => {
    // // remove daylabel
    // if (dayLabel && !element.classList.contains('day')) {
    //   unmount(dayLabel);
    //   dayLabel = undefined;

    //   if (onUpdateHeight) onUpdateHeight(id);
    // }

    // // display daylabel
    // if (element.classList.contains('day') && !dayLabel) {
    //   const mdate = new Date(cached && cached._ !== 'messageEmpty' ? cached.date * 1000 : 0);
    //   const label = mdate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    //   dayLabel = div`.message-day`(div`.message-day__label`(text(label)));
    //   mount(element, dayLabel, container);

    //   if (onUpdateHeight) onUpdateHeight(id);
    // }

    // remove picture
    if (profilePicture && !element.classList.contains('last')) {
      unmount(profilePicture);
      profilePicture = undefined;
    }

    // display picture
    if (aligner && element.classList.contains('chat') && element.classList.contains('last') && !element.classList.contains('out')
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
        element.classList.remove('last');
        if (nextEl.classList.contains('first')) {
          nextEl.classList.remove('first');
        }
      } else {
        if (!nextEl.classList.contains('first')) nextEl.classList.add('first');
        if (!element.classList.contains('last')) element.classList.add('last');
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
      element.classList.add('last');
    }

    if (!prevEl) {
      if (!element.classList.contains('first')) element.classList.add('first');
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
  });
}
