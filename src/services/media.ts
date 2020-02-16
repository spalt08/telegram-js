import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { ClientError } from 'client/worker.types';
import { Document, Peer, StickerSet, MessagesFilter } from 'cache/types';
import { peerToInputPeer } from 'cache/accessors';
import { chatCache, messageCache, userCache } from 'cache';
import { peerToId } from 'helpers/api';
import MainService from './main';

/**
 * Singleton service class for handling media-related queries
 */
export default class MediaService {
  /** Recent Stickers */
  recentStickers = new BehaviorSubject<Document[]>([]);

  /** Stickers Packs */
  stickerSets = new BehaviorSubject<StickerSet[]>([]);

  mediaLoading: Record<string /* peerId */, Partial<Record<MessagesFilter['_'], boolean>>> = {};

  /** Hash values for sticker syc */
  stickerSetsHash = 0;
  recentStickersHash = 0;

  /** Attached files for sending */
  attachedFiles = new BehaviorSubject<FileList | undefined>(undefined);

  main: MainService;

  constructor(main: MainService) {
    this.main = main;
  }

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

  loadMedia(peer: Peer, filterType: MessagesFilter['_'], offsetMessageId = 0) {
    const peerId = peerToId(peer);
    if (!this.mediaLoading[peerId]) {
      this.mediaLoading[peerId] = {};
    }
    if (this.mediaLoading[peerId][filterType]) return;

    this.mediaLoading[peerId][filterType] = true;

    const chunk = 40;
    const filter = { _: filterType };
    const payload = {
      peer: peerToInputPeer(peer),
      q: '',
      filter,
      min_date: 0,
      max_date: 0,
      offset_id: offsetMessageId || 0,
      add_offset: 0,
      limit: chunk,
      max_id: 0,
      min_id: 0,
      hash: 0,
    };

    let index: typeof messageCache.indices.photoVideos;
    switch (filterType) {
      case 'inputMessagesFilterPhotoVideo':
        index = messageCache.indices.photoVideos;
        break;
      case 'inputMessagesFilterDocument':
        index = messageCache.indices.documents;
        break;
      case 'inputMessagesFilterUrl':
        index = messageCache.indices.links;
        break;
      default:
        throw Error('Unknown filter');
    }

    client.call('messages.search', payload, (_err, res) => {
      this.mediaLoading[peerId][filterType] = false;
      if (res && res._ !== 'messages.messagesNotModified') {
        userCache.put(res.users);
        chatCache.put(res.chats);
        index.putMediaMessages(peer, res.messages);
      }
    });
  }

  isMediaLoading(peer: Peer, filterType: MessagesFilter['_']) {
    return !!this.mediaLoading[peerToId(peer)]?.[filterType];
  }

  attachFiles = (files: FileList) => {
    this.attachedFiles.next(files);
    if (this.main.popup.value !== 'sendMedia') this.main.showPopup('sendMedia');
  };
}
