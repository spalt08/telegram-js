import { text, div } from 'core/html';
import { Document, StickerSet, MessagesStickerSet } from 'mtproto-js';
import { useInterface, getInterface, useOnMount } from 'core/hooks';
import client from 'client/client';
import { mount } from 'core/dom';
import { stickerSetToInput } from 'helpers/photo';
import stickerRenderer from './sticker';
import './set.scss';

/**
 * Sticker set
 */
export default function stickerSet(set: StickerSet, onClick?: (sticker: Document) => void) {
  let isRequested = false;

  const elements: ReturnType<typeof stickerRenderer>[] = [];
  const placeholders: HTMLElement[] = [];

  for (let i = 0; i < set.count; i += 1) placeholders.push(div`.sticker-set__item`());

  const container = (
    div`.sticker-set`(
      div`.sticker-set__title`(text(set.title)),
      div`.sticker-set__items`(
        ...placeholders,
      ),
    )
  );

  useOnMount(container, async () => {
    let result: MessagesStickerSet.messagesStickerSet;
    if (isRequested) return;
    isRequested = true;

    // fetch data
    try {
      result = await client.call('messages.getStickerSet', { stickerset: stickerSetToInput(set) });
    } catch (err) {
      throw new Error(`Unable to load sticker set: ${JSON.stringify(err)}`);
    }
    for (let i = 0; i < Math.min(result.documents.length, set.count); i += 1) {
      elements[i] = stickerRenderer(result.documents[i] as Document.document, { size: '100%', autoplay: false, playOnHover: true, onClick });
      mount(placeholders[i], elements[i]);
    }
  });

  return useInterface(container, {
    playAll() {
      for (let i = 0; i < elements.length; i++) getInterface(elements[i]).play();
    },
    pauseAll() {
      for (let i = 0; i < elements.length; i++) getInterface(elements[i]).pause();
    },
  });
}
