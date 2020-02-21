import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
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
  recentStickers = new BehaviorSubject<Document.document[]>([]);

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
  async loadStickerSets() {
    try {
      const result = await client.callAsync('messages.getAllStickers', { hash: this.stickerSetsHash });
      // sticker packs not changed
      if (result._ === 'messages.allStickersNotModified') return;

      // save stickers
      if (result._ === 'messages.allStickers') {
        this.stickerSetsHash = result.hash;
        this.stickerSets.next(result.sets);
      }
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }
  }

  /**
   * Load recent sticker sets
   * Ref: https://core.telegram.org/method/messages.getRecentStickers
   */
  async loadRecentStickers() {
    try {
      const result = await client.callAsync('messages.getRecentStickers', { hash: this.recentStickersHash });

      // update recent stickers
      if (result._ === 'messages.recentStickers') {
        this.recentStickersHash = result.hash;
        this.recentStickers.next(result.stickers as Document.document[]);
      }
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }
  }

  async loadMedia(peer: Peer, filterType: MessagesFilter['_'], offsetMessageId = 0) {
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

    try {
      const res = await client.callAsync('messages.search', payload);
      this.mediaLoading[peerId][filterType] = false;
      if (res && res._ !== 'messages.messagesNotModified') {
        userCache.put(res.users);
        chatCache.put(res.chats);
        index.putMediaMessages(peer, res.messages);
      }
    } catch (err) {
      // todo: handle the error
    }
  }

  isMediaLoading(peer: Peer, filterType: MessagesFilter['_']) {
    return !!this.mediaLoading[peerToId(peer)]?.[filterType];
  }

  attachFiles = (files: FileList) => {
    this.attachedFiles.next(files);
    if (this.main.popup.value !== 'sendMedia') this.main.showPopup('sendMedia');
  };
}
