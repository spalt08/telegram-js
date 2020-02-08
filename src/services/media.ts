import { BehaviorSubject } from 'rxjs';
import client, { ClientError } from 'client/client';
import { Document } from 'cache/types';

/**
 * Singleton service class for handling media-related queries
 */
export default class MediaService {
  /** Recent Stickers */
  recentStickers = new BehaviorSubject<Document[]>([]);

  /** Stickers Packs */
  stickerSets = new BehaviorSubject([]);

  /** Hash values for sticker syc */
  stickerSetsHash = 0;
  recentStickersHash = 0;

  /**
   * Load installed sticker sets
   * Ref: https://core.telegram.org/method/messages.getAllStickers
   */
  loadStickerSets(): void {
    client.call('messages.getAllStickers', { hash: this.stickerSetsHash }, (err: ClientError, result: any) => {
      if (err || !result) throw new Error(JSON.stringify(err));

      // sticker packs not changed
      if (result._ === 'messages.allStickersNotModified') return;

      // save stickers
      if (result._ === 'messages.allStickers') {
        this.stickerSetsHash = result.hash;
        this.stickerSets.next(result.sets);
      }
    });
  }

  /**
   * Load recent sticker sets
   * Ref: https://core.telegram.org/method/messages.getRecentStickers
   */
  loadRecentStickers(): void {
    client.call('messages.getRecentStickers', { hash: this.recentStickersHash }, (err: ClientError, result: any) => {
      if (err || !result) throw new Error(JSON.stringify(err));

      // update recent stickers
      if (result._ === 'messages.recentStickers') {
        this.recentStickersHash = result.hash;
        this.recentStickers.next(result.stickers);
      }
    });
  }
}
