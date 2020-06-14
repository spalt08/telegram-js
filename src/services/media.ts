import { BehaviorSubject, Observable } from 'rxjs';
import client from 'client/client';
import { Document, Peer, StickerSet, MessagesFilter, MessagesAllStickers, MessagesRecentStickers } from 'mtproto-js';
import { el } from 'core/dom';
import { messageCache } from 'cache';
import { getDocumentLocation, getAttributeAudio } from 'helpers/files';
import { stream } from 'client/media';
import type MainService from './main';
import { MessageHistoryIndex } from '../cache/fastStorages/indices/messageHistory';
import makeMessageChunk from './message/message_chunk';

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

export type MediaMessageType = 'photoVideo' | 'document' | 'link' | 'voice' | 'music';

/**
 * Singleton service class for handling media-related queries
 */
export default class MediaService {
  /** Recent Stickers */
  recentStickers = new BehaviorSubject<Document.document[]>([]);

  /** Stickers Packs */
  stickerSets = new BehaviorSubject<StickerSet[]>([]);

  /** Hash values for sticker syc */
  stickerSetsHash = 0;
  recentStickersHash = 0;

  /** Attached files for sending */
  attachedFiles = new BehaviorSubject<FileList | undefined>(undefined);

  private currentAudioSource?: HTMLSourceElement;
  private currentAudio?: HTMLAudioElement;
  private docPlaying?: Document.document;
  private audioPlayingTimer: any;

  constructor(private main: MainService) {}

  /**
   * Load installed sticker sets
   * Ref: https://core.telegram.org/method/messages.getAllStickers
   */
  async loadStickerSets() {
    let result: MessagesAllStickers;
    try {
      result = await client.call('messages.getAllStickers', { hash: this.stickerSetsHash });
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }
    // sticker packs not changed
    if (result._ === 'messages.allStickersNotModified') return;

    // save stickers
    if (result._ === 'messages.allStickers') {
      this.stickerSetsHash = result.hash;
      this.stickerSets.next(result.sets);
    }
  }

  /**
   * Load recent sticker sets
   * Ref: https://core.telegram.org/method/messages.getRecentStickers
   */
  async loadRecentStickers() {
    let result: MessagesRecentStickers;
    try {
      result = await client.call('messages.getRecentStickers', { hash: this.recentStickersHash });
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }
    // update recent stickers
    if (result._ === 'messages.recentStickers') {
      this.recentStickersHash = result.hash;
      this.recentStickers.next(result.stickers as Document.document[]);
    }
  }

  /**
   * Makes an object that loads, caches and provides history for specific media messages.
   *
   * Don't forget to call destroy() when you don't need the object anymore.
   *
   * Set messageId to Infinity to get the chunk of the newest messages.
   */
  getMediaMessagesChunk(peer: Peer, type: MediaMessageType, messageId = Infinity) {
    let cacheIndex: MessageHistoryIndex;
    let filter: MessagesFilter;

    switch (type) {
      case 'photoVideo':
        cacheIndex = messageCache.indices.photoVideosHistory;
        filter = { _: 'inputMessagesFilterPhotoVideo' };
        break;
      case 'document':
        cacheIndex = messageCache.indices.documentsHistory;
        filter = { _: 'inputMessagesFilterDocument' };
        break;
      case 'link':
        cacheIndex = messageCache.indices.linksHistory;
        filter = { _: 'inputMessagesFilterUrl' };
        break;
      case 'voice':
        cacheIndex = messageCache.indices.voiceHistory;
        filter = { _: 'inputMessagesFilterVoice' };
        break;
      case 'music':
        cacheIndex = messageCache.indices.musicHistory;
        filter = { _: 'inputMessagesFilterMusic' };
        break;
      default:
        throw new TypeError(`Unknown type "${type}"`);
    }

    return makeMessageChunk(peer, messageId, cacheIndex, filter);
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

  downloadAudio(doc: Document.document) {
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
