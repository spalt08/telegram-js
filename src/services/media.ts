/* eslint-disable no-param-reassign */
import { BehaviorSubject, Observable } from 'rxjs';
import client from 'client/client';
import { Document, Peer, StickerSet, MessagesSavedGifs, StickerSetCovered, InputUser } from 'mtproto-js';
import { el } from 'core/dom';
import { stickerSetCache, userCache } from 'cache';
import { getAttributeAudio } from 'helpers/files';
import { stream } from 'client/media';
import { peerToInputUser } from 'cache/accessors';
import { TaskQueue } from 'client/workers/extensions/quene';
import { stickerSetToInput } from 'helpers/photo';
import type MainService from './main';
import makeMessageChunk from './message/message_chunk';
import { MessageFilterType } from './message/types';
import messageFilters from './message/message_filters';
import { userIdToPeer } from 'helpers/api';

export const enum MediaPlaybackStatus {
  NotStarted,
  Downloading,
  Playing,
  Stopped,
}

export type MediaPlaybackState = {
  downloadProgress: number,
  playProgress: number,
  status: MediaPlaybackStatus,
};

/**
 * Singleton service class for handling media-related queries
 */
export default class MediaService {
  /** Saved Gifs */
  savedGifsMap = new Map<string, Document.document>();
  savedGifsIds = new BehaviorSubject<string[]>([]);

  /** Hash values for sticker sync */
  #recentStickersHash = 0;
  #stickerSetLoadQueue: TaskQueue<StickerSet>;

  /** Sticker Search */
  isStickerSearching = new BehaviorSubject(false);
  searchStickerPending = '';
  featuredStickers: StickerSetCovered[] = [];
  foundStickers = new BehaviorSubject<string[]>([]);
  foundStickersMap = new Map<string, StickerSetCovered>();

  /** Gif Search */
  isGifSearching = new BehaviorSubject(false);
  searchGifPending?: string;
  searchGifCurrent?: string;
  searchGifNextOffset?: string;
  searchGifBot?: InputUser | undefined;
  foundGifs = new BehaviorSubject<string[]>([]);
  foundGifsMap = new Map<string, Document.document>();

  /** Attached files for sending */
  attachedFiles = new BehaviorSubject<FileList | undefined>(undefined);

  main: MainService;

  private currentAudioSource?: HTMLSourceElement;
  private currentAudio?: HTMLAudioElement;
  private docPlaying?: Document.document;
  private audioPlayingTimer: any;


  constructor(main: MainService) {
    this.main = main;

    this.#stickerSetLoadQueue = new TaskQueue<StickerSet>({
      process: async (set, complete) => {
        if (stickerSetCache.indices.stickers.getStickers(set.id).length > 0) {
          complete();
          return;
        }

        // don't overload thread with requests
        try {
          const result = await client.call('messages.getStickerSet', { stickerset: stickerSetToInput(set) });
          stickerSetCache.indices.stickers.putStickers(set.id, result.documents as Document.document[]);
          complete();
        } catch (err) {
          throw new Error(`Unable to load sticker set: ${JSON.stringify(err)}`);
        }
      },
    });
  }

  /**
   * Load saved gifs
   * Ref: https://core.telegram.org/method/messages.getAllStickers
   */
  async loadSavedGis() {
    let result: MessagesSavedGifs;
    try {
      result = await client.call('messages.getSavedGifs', { hash: 0 });
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }

    // save gifs
    if (result._ === 'messages.savedGifs') {
      const ids: string[] = [];

      for (let i = 0; i < result.gifs.length; i++) {
        const doc = result.gifs[i];
        if (doc._ === 'document') {
          this.savedGifsMap.set(doc.id, doc);
          ids.push(doc.id);
        }
      }
      this.savedGifsIds.next(ids);
    }
  }

  /**
   * Load recent sticker sets
   * Ref: https://core.telegram.org/method/messages.getRecentStickers
   */
  async loadSavedStickers() {
    // load recent
    try {
      const result = await client.call('messages.getRecentStickers', { hash: this.#recentStickersHash });

      // update recent stickers cache
      if (result._ === 'messages.recentStickers') {
        this.#recentStickersHash = result.hash;
        stickerSetCache.put({
          _: 'stickerSet',
          id: 'recent',
          access_hash: '',
          title: 'Recent',
          short_name: 'recent',
          count: result.stickers.length,
          hash: 0,
          installed_date: 0xFFFFFFF,
        });
        stickerSetCache.indices.stickers.putStickers('recent', result.stickers as Document.document[]);
      }
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }

    // load saved
    try {
      const result = await client.call('messages.getAllStickers', { hash: 0 });
      if (result._ === 'messages.allStickers') {
        stickerSetCache.put(result.sets);
      }
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }
  }

  async loadStickerSet(setId: string) {
    const set = stickerSetCache.get(setId);
    const count = stickerSetCache.indices.stickers.getStickers(setId).length;

    if (!set || count > 0) return;

    this.#stickerSetLoadQueue.register(set);
  }

  setFoundStickers(found: StickerSetCovered[]) {
    this.foundStickersMap.clear();
    const ids = new Array(found.length);

    for (let i = 0; i < found.length; i++) {
      const { id } = found[i].set;
      this.foundStickersMap.set(id, found[i]);
      ids[i] = id;
    }

    stickerSetCache.put(found.map((item) => item.set));

    this.foundStickers.next(ids);
  }

  async searchStickerSets(q: string) {
    if (this.isStickerSearching.value) {
      this.searchStickerPending = q;
      return;
    }

    this.isStickerSearching.next(true);

    try {
      const result = await client.call('messages.searchStickerSets', { hash: 0, q });
      if (result._ === 'messages.foundStickerSets') this.setFoundStickers(result.sets);
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }

    this.isStickerSearching.next(false);

    if (this.searchStickerPending) {
      this.searchStickerSets(this.searchStickerPending);
      this.searchStickerPending = '';
    }
  }

  async loadFeaturedStickers() {
    if (this.featuredStickers.length > 0) {
      this.setFoundStickers(this.featuredStickers);
      return;
    }

    if (this.isStickerSearching.value) return;

    this.isStickerSearching.next(true);

    try {
      const result = await client.call('messages.getFeaturedStickers', { hash: 0 });
      if (result._ === 'messages.featuredStickers') {
        this.featuredStickers = result.sets;
        this.setFoundStickers(result.sets);
      }
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }

    this.isStickerSearching.next(false);
  }

  async searchGifsRequest(query: string, offset: string, ids: string[]) {
    if (!this.searchGifBot) {
      const { peer, users } = await client.call('contacts.resolveUsername', { username: 'gif' });
      userCache.put(users);
      this.searchGifBot = peerToInputUser(peer as Peer.peerUser);
    }

    try {
      const { results, next_offset } = await client.call('messages.getInlineBotResults', {
        bot: this.searchGifBot,
        peer: { _: 'inputPeerEmpty' },
        query,
        offset,
      });

      results.forEach((result) => {
        if (result._ === 'botInlineMediaResult' && result.document) {
          ids.push(result.document.id);
          this.foundGifsMap.set(result.document.id, result.document as Document.document);
        }
      });

      return next_offset;
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }
  }

  async searchGifs(query: string) {
    if (this.isGifSearching.value) {
      this.searchGifPending = query;
      return;
    }

    this.isGifSearching.next(true);

    const ids: string[] = [];
    this.searchGifNextOffset = await this.searchGifsRequest(query, '', ids);
    this.searchGifCurrent = query;
    this.foundGifs.next(ids);
    this.isGifSearching.next(false);

    if (this.searchGifPending) {
      this.searchGifs(this.searchGifPending);
      this.searchGifPending = undefined;
    }
  }

  async searchGifsMore() {
    if (!this.searchGifNextOffset || this.searchGifCurrent === undefined) return;
    if (this.isGifSearching.value) return;

    const ids = this.foundGifs.value.slice(0);

    this.isGifSearching.next(true);
    this.searchGifNextOffset = await this.searchGifsRequest(this.searchGifCurrent, this.searchGifNextOffset, ids);
    this.foundGifs.next(ids);
    this.isGifSearching.next(false);

    if (this.searchGifPending) {
      this.searchGifs(this.searchGifPending);
      this.searchGifPending = undefined;
    }
  }

  async addStickerSet(set: StickerSet) {
    stickerSetCache.change(set.id, { installed_date: Math.floor(Date.now() / 1000) });
    await client.call('messages.installStickerSet', { stickerset: stickerSetToInput(set), archived: false });
  }

  async removeStickerSet(set: StickerSet) {
    stickerSetCache.change(set.id, { installed_date: undefined });
    await client.call('messages.uninstallStickerSet', { stickerset: stickerSetToInput(set) });
  }

  /**
   * Makes an object that loads, caches and provides history for specific media messages.
   *
   * Don't forget to call destroy() when you don't need the object anymore.
   *
   * Set messageId to Infinity to get the chunk of the newest messages.
   */
  getMediaMessagesChunk(peer: Peer, type: MessageFilterType, messageId: Exclude<number, 0> = Infinity) {
    const { cacheIndex, apiFilter } = messageFilters[type];
    return makeMessageChunk(peer, messageId, cacheIndex, apiFilter);
  }

  attachFiles = (files: FileList) => {
    this.attachedFiles.next(files);
    if (this.main.popup.value !== 'sendMedia') this.main.showPopup('sendMedia');
  };

  private audioInfos: Record<string, BehaviorSubject<Readonly<MediaPlaybackState>>> = {};

  private getPlaybackState(doc: Document.document) {
    let info = this.audioInfos[doc.id];
    if (!info) {
      info = new BehaviorSubject<MediaPlaybackState>({ downloadProgress: 0, playProgress: 0, status: MediaPlaybackStatus.NotStarted });
      this.audioInfos[doc.id] = info;
    }
    return info;
  }

  audioInfo(doc: Document.document): Observable<Readonly<MediaPlaybackState>> {
    return this.getPlaybackState(doc);
  }

  play(doc: Document.document, url: string, position?: number) {
    const audioAttribute = getAttributeAudio(doc)!;

    const time = position !== undefined ? position * audioAttribute.duration : 0;
    if (this.docPlaying) {
      if (this.docPlaying.id === doc.id) {
        this.currentAudio!.currentTime = time;
        return;
      }
      const currentAudioAttribute = getAttributeAudio(this.docPlaying)!;
      if (currentAudioAttribute.voice) {
        this.stopAudio(this.docPlaying);
      } else {
        this.pauseAudio(this.docPlaying);
      }
    }

    this.currentAudioSource!.src = url;
    this.docPlaying = doc;
    this.currentAudio!.load();
    this.currentAudio!.currentTime = time;
    this.currentAudio!.play();
    this.getPlaybackState(doc).next({ downloadProgress: 1, playProgress: position ?? 0, status: MediaPlaybackStatus.Playing });
    this.audioPlayingTimer = setInterval(() => {
      const progress = Math.min(1, this.currentAudio!.currentTime / audioAttribute.duration);
      if (this.currentAudio!.ended) {
        this.getPlaybackState(doc).next({ downloadProgress: 1, playProgress: 0, status: MediaPlaybackStatus.Stopped });
        clearInterval(this.audioPlayingTimer);
        delete this.docPlaying;
      } else {
        this.getPlaybackState(doc).next({ downloadProgress: 1, playProgress: progress, status: MediaPlaybackStatus.Playing });
      }
    }, Math.min(100, audioAttribute.duration * 10));
  }

  stopAudio(doc: Document.document) {
    if (this.currentAudio && doc.id === this.docPlaying?.id) {
      clearInterval(this.audioPlayingTimer);
      this.currentAudio.pause();
      this.getPlaybackState(this.docPlaying!).next({ downloadProgress: 0, playProgress: 0, status: MediaPlaybackStatus.Stopped });
      delete this.docPlaying;
    }
  }

  pauseAudio(doc: Document.document) {
    if (this.currentAudio && doc.id === this.docPlaying?.id) {
      clearInterval(this.audioPlayingTimer);
      this.currentAudio.pause();
      const state = this.getPlaybackState(doc);
      state.next({ ...state.value, status: MediaPlaybackStatus.Stopped });
      delete this.docPlaying;
    }
  }

  resumeAudio(doc: Document.document) {
    const state = this.getPlaybackState(doc);
    this.playAudio(doc, state.value.playProgress);
  }

  playAudio(doc: Document.document, position?: number) {
    if (!this.currentAudio) {
      this.currentAudioSource = el('source');
      this.currentAudio = el('audio', undefined, [this.currentAudioSource]);
    }

    const state = this.getPlaybackState(doc);
    if (state.value.status === MediaPlaybackStatus.NotStarted) {
      state.next({ ...state.value, status: MediaPlaybackStatus.Playing });
    }

    this.play(
      doc,
      stream(doc),
      position,
    );
    // }, (progress) => {
    //   state = this.getPlaybackState(doc);
    //   this.getPlaybackState(doc).next({ ...state.value, downloadProgress: progress / doc.size });
    // });
  }

  downloadAudio(_doc: Document.document) {
    // const location = getDocumentLocation(doc);
    // let state = this.getPlaybackState(doc);
    // state.next({ downloadProgress: 0, playProgress: 0, status: MediaPlaybackStatus.Downloading });
    // download(location, { size: doc.size }, () => {
    //   state.next({ downloadProgress: 1, playProgress: 0, status: MediaPlaybackStatus.Stopped });
    // }, (progress) => {
    //   console.log(progress, doc.size);
    //   state = this.getPlaybackState(doc);
    //   this.getPlaybackState(doc).next({ ...state.value, downloadProgress: progress / doc.size });
    // });
  }
}
