/* eslint-disable no-param-reassign */
import { Message } from 'mtproto-js';
import { div, text } from 'core/html';
import photoPreview from 'components/media/photo/preview';
import { messageToSenderPeer } from 'cache/accessors';
import { getAttributeSticker, getAttributeAnimated, getAttributeAudio, getAttributeVideo } from 'helpers/files';
import stickerRenderer from 'components/media/sticker/sticker';
import { main } from 'services';
import videoRenderer from 'components/media/video/video';
import audio from 'components/media/audio/audio';
import documentFile from 'components/media/document/file';
import poll from 'components/media/poll/poll';
import webpagePreview from 'components/media/webpage/preview';
import videoPreview from 'components/media/video/preview';
import { isEmoji } from 'helpers/message';
import { PhotoOptions } from 'helpers/other';

export function messageMediaImmutable(msg: Message.message): HTMLElement | undefined {
  if (!msg.media) return undefined;

  switch (msg.media._) {
    case 'messageMediaDocument': {
      if (!msg.media.document || msg.media.document._ === 'documentEmpty') return undefined;
      const { document } = msg.media;

      // sticker
      const stickerAttr = getAttributeSticker(document);
      if (stickerAttr) {
        return div({ className: msg.out ? 'message__sticker-out' : 'message__sticker' },
          stickerRenderer(
            msg.media.document,
            {
              size: '200px',
              autoplay: true,
              onClick: () => stickerAttr && main.showPopup('stickerSet', stickerAttr.stickerset),
            },
          ),
        );
      }

      // round video
      const videoAttr = getAttributeVideo(document);
      if (videoAttr && videoAttr.round_message) {
        return div({ className: msg.out ? 'message__video-round-out' : 'message__video-round' },
          videoRenderer(document, {
            fit: 'contain',
            width: 200,
            height: 200,
            className: 'video__round',
          }, undefined, true),
        );
      }

      return undefined;
    }

    default:
      return undefined;
  }
}

export function messageMediaUpper(msg: Message.message): Node | undefined {
  if (!msg.media) return undefined;

  const { window } = main;
  const size = window.width < 700 ? Math.round(window.width * 0.75) : 320;
  const options: PhotoOptions = {
    fit: 'contain',
    width: size,
    height: size,
    minHeight: 60,
    minWidth: msg.message ? size : undefined,
    className: msg.out ? 'message__photo-out' : 'message__photo',
  };

  switch (msg.media._) {
    case 'messageMediaEmpty':
    case 'messageMediaWebPage':
      return undefined;

    case 'messageMediaPhoto': {
      if (!msg.media.photo || msg.media.photo._ === 'photoEmpty') return undefined;

      return (
        photoPreview(msg.media.photo, options, msg)
      ) || undefined;
    }

    case 'messageMediaDocument': {
      if (!msg.media.document || msg.media.document._ === 'documentEmpty') return undefined;
      const { document } = msg.media;

      // video gif
      const gifAttr = getAttributeAnimated(document);
      if (gifAttr) {
        return videoRenderer(document, options);
      }

      const videoAttr = getAttributeVideo(document);
      if (videoAttr && !videoAttr.round_message) {
        return videoPreview(document, options, messageToSenderPeer(msg), msg);
      }

      // audio
      const audioAttr = getAttributeAudio(document);
      if (audioAttr) {
        return audio(document);
      }

      // file attachment
      return documentFile(document, undefined, msg.out ? 'message__attachment-out' : 'message__attachment');
    }

    case 'messageMediaPoll': {
      return poll(msg.to_id, msg, div()); // to do: remove info & peer
    }

    // fallback
    default:
  }

  return div`.message__fallback`(
    text('This type of message media is unsupported'),
  );
}

export function messageMediaLower(msg: Message.message): Node | undefined {
  if (!msg.media) return undefined;

  switch (msg.media._) {
    case 'messageMediaWebPage': {
      const { webpage } = msg.media;

      if (webpage._ === 'webPage') {
        return webpagePreview(webpage, msg.out ? 'message__webpage-out' : 'message__webpage');
      }

      // todo: handle pending webpages
      return undefined;
    }

    case 'messageMediaEmpty':
    default:
      return undefined;
  }
}

export function enhanceClassName(msg: Message.message, textEl: HTMLElement | undefined): string {
  // Display only emoji
  if (msg.message.length <= 6 && isEmoji(msg.message) && (!msg.media || msg.media._ === 'messageMediaEmpty')) {
    if (textEl) textEl.className = `message__emoji-text${msg.message.length / 2}`;
    return `message__emoji${msg.out ? '-out' : ''}`;
  }

  if (textEl && textEl.className.indexOf('message__emoji-text') === 0) textEl.className = 'message__text';

  return '';
}

export function hasMediaToMask(msg: Message.message): boolean {
  const { media } = msg;

  if (media && media._ === 'messageMediaPhoto') return true;
  if (media && media._ === 'messageMediaDocument' && media.document && getAttributeVideo(media.document!)) return true;

  return false;
}

export function hasMediaChanged(left: Message.message, right: Message.message): boolean {
  const from = left.media;
  const next = right.media;

  // media added or removed
  if ((!from && next) || (!next && from)) return true;
  if (!from || !next) return false;

  // media type changed
  if (from._ !== next._) return true;

  // todo: media type hasn't changed
  return false;
}
