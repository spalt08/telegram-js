import { Document, StickerSet } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import Collection from '../collection';

export default function stickerSetStickersIndex(collection: Collection<StickerSet, any>) {
  const setToStickers = new Map<string, Document.document[]>();
  const setReadyState = new Map<string, BehaviorSubject<boolean>>();

  function readySubject(setId: string) {
    let readyState = setReadyState.get(setId);
    if (!readyState) setReadyState.set(setId, readyState = new BehaviorSubject(false));
    return readyState;
  }

  function putStickers(setId: string, stickers: Document.document[]) {
    const set = collection.get(setId);

    if (set && set.count !== stickers.length) collection.put({ ...set, count: stickers.length });

    setToStickers.set(setId, stickers);
    readySubject(setId).next(true);
  }

  function getStickers(setId: string) {
    return setToStickers.get(setId) || [];
  }

  return {
    readySubject,
    putStickers,
    getStickers,
    getFirst: (setId: string): Document.document | undefined => getStickers(setId)[0],
  };
}
