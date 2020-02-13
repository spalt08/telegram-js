import { div, text, nothing } from 'core/html';
import { useObservable, useInterface, hasInterface, getInterface, useOnMount } from 'core/hooks';
import { mount, unmount, unmountChildren } from 'core/dom';
import { messageCache, chatCache } from 'cache';
import { Peer, Message, MessageCommon, MessageService, MessageEmpty } from 'cache/types';
import { formattedMessage } from 'components/ui';
import client from 'client/client';
import { profileAvatar, profileTitle } from 'components/profile';
import webpagePreview from 'components/media/webpage/preview';
import photoPreview from 'components/media/photo/preview';
import { getAttributeSticker, getAttributeVideo } from 'helpers/files';
import stickerRenderer from 'components/media/sticker/sticker';
import documentFile from 'components/media/document/file';
import { idToColorCode } from 'cache/accessors';
import { userIdToPeer, peerToId } from 'helpers/api';
import messageSerivce from './service';
import messageReply from './reply';
import messageDate from './date';
import './message.scss';
import videoPreview from 'components/media/video/preview';

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
const renderMessage = (msg: MessageCommon, peer: Peer) => {
  const channel = peer._ === 'peerChannel' ? chatCache.get(peer.channel_id) : undefined;

  const date = messageDate(msg);
  const reply = msg.reply_to_msg_id ? messageReply(msg.reply_to_msg_id, peer) : nothing;
  const title = channel && channel._ === 'channel' && channel.megagroup === false
    ? div`.message__title${`color-${idToColorCode(channel.id)}`}`(profileTitle(peer))
    : div`.message__title${`color-${idToColorCode(msg.from_id)}`}`(profileTitle(userIdToPeer(msg.from_id)));

  // regular message
  if (!msg.media || msg.media._ === 'messageMediaEmpty') {
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
  if (msg.media._ === 'messageMediaPhoto') {
    const extraClass = msg.message ? 'with-photo' : 'only-photo';
    const popupPeer = peer._ === 'peerChannel' ? peer : userIdToPeer(msg.from_id);
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
  if (msg.media._ === 'messageMediaDocument' && getAttributeSticker(msg.media.document)) {
    return (
      div`.message__bubble.only-sticker`(
        reply,
        stickerRenderer(msg.media.document, { size: '200px', autoplay: true }),
        date,
      )
    );
  }

  // with video
  if (msg.media._ === 'messageMediaDocument' && getAttributeVideo(msg.media.document)) {
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

  // with document
  if (msg.media._ === 'messageMediaDocument') {
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

  console.log(msg.media);

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
  let bubble: HTMLElement | undefined;
  let dayLabel: HTMLElement | undefined;
  let profilePicture: HTMLElement | undefined;

  // previous message before update
  let cached: MessageCommon | MessageService | MessageEmpty | undefined;

  // utc day number
  const day = () => Math.ceil(((cached && cached._ !== 'messageEmpty' ? cached.date : 0) - timezoneOffset) / 3600 / 24);

  // listen cache changes for auto rerendering
  useObservable(element, subject, (msg: Message | undefined) => {
    // first render
    if (!container) {
      if (!msg) return;
      if (msg._ === 'messageEmpty') container = div`.message__empty`();
      if (msg._ === 'messageService') container = messageSerivce(msg);
      else container = div`.message__container`();

      if (peer._ !== 'peerUser') element.classList.add('chat');

      mount(element, container);
    }

    // shouldn't rerender service and empty message
    if (!msg || msg._ !== 'message') {
      cached = msg;
      return;
    }

    // first render for common message
    if (!aligner) {
      aligner = div`.message__align`();
      mount(container, aligner);

      if (msg.from_id === client.getUserID()) element.classList.add('out');
    }

    // re-rendering
    if (!bubble || !cached || (cached._ === 'message' && msg.message !== cached.message)) {
      if (bubble) unmount(bubble);

      bubble = renderMessage(msg, peer);
      mount(aligner, bubble);

      if (onUpdateHeight) onUpdateHeight(id);
    }

    cached = msg;
  });

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
    if (profilePicture && !element.classList.contains('last')) {
      unmount(profilePicture);
      profilePicture = undefined;
    }

    // display picture
    if (aligner && element.classList.contains('chat') && element.classList.contains('last') && !element.classList.contains('out')
    && !profilePicture && cached && cached._ !== 'messageEmpty') {
      const channel = peer._ === 'peerChannel' ? chatCache.get(peer.channel_id) : undefined;
      profilePicture = channel && channel._ === 'channel' && channel.megagroup === false
        ? div`.message__profile`(profileAvatar(peer))
        : div`.message__profile`(profileAvatar(userIdToPeer(cached.from_id)));
      mount(aligner, profilePicture, bubble);
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
