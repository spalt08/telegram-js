import { BehaviorSubject, Observable } from 'rxjs';
import client from 'client/client';
import { Document, Peer, StickerSet, MessagesFilter, MessagesAllStickers, MessagesRecentStickers, MessagesMessages } from 'cache/types';
import { peerToInputPeer } from 'cache/accessors';
import { chatCache, messageCache, userCache } from 'cache';
import { peerToId } from 'helpers/api';
import { getDocumentLocation, getAttributeAudio } from 'helpers/files';
import media from 'client/media';
import MainService from './main';

export enum AudioPlaybackStatus {
  NotStarted,
  Downloading,
  Playing,
  Stopped,
}

export type AudioPlaybackState = {
  downloadProgress: number,
  playProgress: number,
  status: AudioPlaybackStatus,
};

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

  private audio: Map<string, HTMLAudioElement> = new Map();
  private audioPlaying?: HTMLAudioElement;
  private docPlaying?: Document.document;
  private audioPlayingTimer: any;

  constructor(main: MainService) {
    this.main = main;
  }

  /**
   * Load installed sticker sets
   * Ref: https://core.telegram.org/method/messages.getAllStickers
   */
  async loadStickerSets() {
    let result: MessagesAllStickers;
    try {
      result = await client.callAsync('messages.getAllStickers', { hash: this.stickerSetsHash });
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
      result = await client.callAsync('messages.getRecentStickers', { hash: this.recentStickersHash });
    } catch (err) {
      throw new Error(JSON.stringify(err));
    }
    // update recent stickers
    if (result._ === 'messages.recentStickers') {
      this.recentStickersHash = result.hash;
      this.recentStickers.next(result.stickers as Document.document[]);
    }
  }

  async loadMedia(peer: Peer, filterType: MessagesFilter['_'], offsetMessageId = 0) {
    const peerId = peerToId(peer);
    if (!this.mediaLoading[peerId]) {
      this.mediaLoading[peerId] = {};
    }
    if (this.mediaLoading[peerId][filterType]) return;

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

    this.mediaLoading[peerId][filterType] = true;

    let res: MessagesMessages | undefined;
    try {
      res = await client.callAsync('messages.search', payload);
    } catch (err) {
      // todo: handle the error
    } finally {
      this.mediaLoading[peerId][filterType] = false;
    }
    if (res && res._ !== 'messages.messagesNotModified') {
      userCache.put(res.users);
      chatCache.put(res.chats);
      index.putMediaMessages(peer, res.messages);
    }
  }

  isMediaLoading(peer: Peer, filterType: MessagesFilter['_']) {
    return !!this.mediaLoading[peerToId(peer)]?.[filterType];
  }

  attachFiles = (files: FileList) => {
    this.attachedFiles.next(files);
    if (this.main.popup.value !== 'sendMedia') this.main.showPopup('sendMedia');
  };

  private audioInfos: Record<string, BehaviorSubject<AudioPlaybackState>> = {};

  private getPlaybackState(doc: Document.document) {
    let info = this.audioInfos[doc.file_reference];
    if (!info) {
      info = new BehaviorSubject<AudioPlaybackState>({ downloadProgress: 0, playProgress: 0, status: AudioPlaybackStatus.NotStarted });
      this.audioInfos[doc.file_reference] = info;
    }
    return info;
  }

  audioInfo(doc: Document.document): Observable<Readonly<AudioPlaybackState>> {
    return this.getPlaybackState(doc);
  }

  play(doc: Document.document, audio: HTMLAudioElement) {
    if (this.docPlaying) {
      this.stopAudio(this.docPlaying);
    }
    const audioAttribute = getAttributeAudio(doc)!;

    this.audioPlaying = audio;
    this.docPlaying = doc;
    // eslint-disable-next-line no-param-reassign
    audio.currentTime = 0;
    audio.play();
    this.getPlaybackState(doc).next({ downloadProgress: 1, playProgress: 0, status: AudioPlaybackStatus.Playing });
    this.audioPlayingTimer = setInterval(() => {
      const progress = audio.currentTime / audioAttribute.duration;
      if (audio.ended) {
        this.getPlaybackState(doc).next({ downloadProgress: 1, playProgress: 0, status: AudioPlaybackStatus.Stopped });
        clearInterval(this.audioPlayingTimer);
      } else {
        this.getPlaybackState(doc).next({ downloadProgress: 1, playProgress: progress, status: AudioPlaybackStatus.Playing });
      }
    }, Math.min(1000, audioAttribute.duration * 10));
  }

  stopAudio(doc: Document.document) {
    if (this.audioPlaying && doc.file_reference === this.docPlaying?.file_reference) {
      clearInterval(this.audioPlayingTimer);
      this.audioPlaying.pause();
      this.getPlaybackState(this.docPlaying!).next({ downloadProgress: 0, playProgress: 0, status: AudioPlaybackStatus.Stopped });
      delete this.audioPlaying;
      delete this.docPlaying;
    }
  }

  playAudio(doc: Document.document) {
    const location = getDocumentLocation(doc);
    let state = this.getPlaybackState(doc);
    if (state.value.status === AudioPlaybackStatus.NotStarted) {
      this.getPlaybackState(doc).next({ ...state.value, downloadProgress: 0, status: AudioPlaybackStatus.Downloading });
    }
    media.download(location, { size: doc.size }, (url) => {
      const cachedAudio = this.audio.get(doc.file_reference);
      if (cachedAudio) {
        this.play(doc, cachedAudio);
        return;
      }
      const currentAudio = new Audio(url);
      this.audio.set(doc.file_reference, currentAudio);
      this.play(doc, currentAudio);
    }, (progress) => {
      state = this.getPlaybackState(doc);
      this.getPlaybackState(doc).next({ ...state.value, downloadProgress: progress / doc.size });
    });
  }
}
