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

export function messageMediaImmutable(msg: Message.message): Node | undefined {
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

      return undefined;
    }

    default:
      return undefined;
  }
}

export function messageMediaUpper(msg: Message.message): Node | undefined {
  if (!msg.media) return undefined;

  switch (msg.media._) {
    case 'messageMediaEmpty':
    case 'messageMediaWebPage':
      return undefined;

    case 'messageMediaPhoto': {
      if (!msg.media.photo || msg.media.photo._ === 'photoEmpty') return undefined;

      return (
        photoPreview(msg.media.photo, messageToSenderPeer(msg), msg, {
          fit: 'contain',
          width: 320,
          height: 320,
          minHeight: 60,
          minWidth: msg.message ? 320 : undefined,
          className: msg.out ? 'message__photo-out' : 'message__photo',
        })
      ) || undefined;
    }

    case 'messageMediaDocument': {
      if (!msg.media.document || msg.media.document._ === 'documentEmpty') return undefined;
      const { document } = msg.media;

      // video gif
      const gifAttr = getAttributeAnimated(document);
      if (gifAttr) {
        return videoRenderer(document, {
          fit: 'contain',
          width: 320,
          height: 320,
          minHeight: 60,
          minWidth: msg.message ? 320 : undefined,
          className: msg.out ? 'message__photo-out' : 'message__photo',
        });
      }

      const videoAttr = getAttributeVideo(document);
      if (videoAttr) {
        return videoPreview(document, {
          fit: 'contain',
          width: 320,
          height: 320,
          minHeight: 60,
          minWidth: msg.message ? 320 : undefined,
          className: msg.out ? 'message__photo-out' : 'message__photo',
        }, messageToSenderPeer(msg), msg);
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

export function enhanceClassName(msg: Message.message): string {
  if (!msg.media || msg.media._ === 'messageMediaEmpty') return '';

  if (msg.media._ === 'messageMediaDocument') {
    const { document } = msg.media;

    if (document && document._ === 'document' && getAttributeSticker(document)) return 'message__sticker';
  }

  return '';
}

export function hasMediaToMask(msg: Message.message): boolean {
  const { media } = msg;

  if (media && media._ === 'messageMediaPhoto') return true;
  if (media && media._ === 'messageMediaDocument' && media.document && getAttributeVideo(media.document!)) return true;

  return false;
}
