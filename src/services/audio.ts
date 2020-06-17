import { messageCache } from 'cache';
import { stream } from 'client/media';
import { el } from 'core/dom';
import { getMessageDocument, isSelf, messageToId, peerMessageToId, peerToId } from 'helpers/api';
import { getAttributeAudio } from 'helpers/files';
import { Document, Message, Peer } from 'mtproto-js';
import { BehaviorSubject, Observable } from 'rxjs';
import MediaService from './media';
import { MessageChunkService } from './message/message_chunk';
import { Direction } from './message/types';

export const enum MediaPlaybackStatus {
  Stopped,
  Playing,
}

export type MediaPlaybackState = {
  playProgress: number,
  duration: number,
  buffered?: TimeRanges,
  status: MediaPlaybackStatus,
};

export default class AudioService {
  #media: MediaService;
  #audioType?: string;
  #audioElement = el('audio');
  #audioPlayingTimer: any;
  #audioInfos: Record<string, BehaviorSubject<Readonly<MediaPlaybackState>>> = {};
  #audioChunkService: MessageChunkService | undefined;

  currentAudio = new BehaviorSubject<{ message: Message.message, doc: Document.document } | undefined>(undefined);
  hasNewer = new BehaviorSubject(false);
  hasOlder = new BehaviorSubject(false);
  playingNow = new BehaviorSubject(false);

  constructor(media: MediaService) {
    this.#media = media;
    this.#audioElement.onended = this.#onended;
  }

  private getPlaybackState(messageId: string) {
    let info = this.#audioInfos[messageId];
    if (!info) {
      info = new BehaviorSubject<MediaPlaybackState>({ playProgress: 0, duration: 0, status: MediaPlaybackStatus.Stopped });
      this.#audioInfos[messageId] = info;
    }
    return info;
  }

  audioInfo(message: Message.message): Observable<Readonly<MediaPlaybackState>> {
    return this.getPlaybackState(messageToId(message));
  }

  play(message: Message.message, position?: number) {
    this.#fetchTrackList(message);
    if (this.#audioChunkService) {
      this.hasOlder.next(!!this.#audioChunkService.getOlderId(message.id));
      this.hasNewer.next(!!this.#audioChunkService.getNewerId(message.id));
    }

    const msgId = messageToId(message);
    if (this.currentAudio.value && messageToId(this.currentAudio.value.message) === msgId) {
      this.#seekAndPlay(position);
      return;
    }

    const doc = getMessageDocument(message);
    if (doc?._ === 'document') {
      if (this.currentAudio.value) {
        const audioAttribute = getAttributeAudio(this.currentAudio.value.doc)!;
        this.#pause(audioAttribute.voice ?? false);
      }

      const state = this.getPlaybackState(msgId);
      state.next({ ...state.value, status: MediaPlaybackStatus.Playing });
      this.currentAudio.next({ message, doc });
      this.#play(stream(doc), position);
    }
  }

  stop() {
    this.#pause(true);
  }

  pause() {
    this.#pause(false);
  }

  resume() {
    if (this.currentAudio.value) {
      this.play(this.currentAudio.value.message);
    }
  }

  playNewer() {
    if (!this.currentAudio.value) {
      return;
    }
    const msg = this.currentAudio.value.message;
    const msgId = msg.id;
    const nextId = this.#audioChunkService!.getNewerId(msgId);
    if (nextId) {
      const nextMessage = messageCache.get(peerMessageToId(this.#peerFromMessage(msg), nextId));
      if (nextMessage?._ === 'message') {
        this.play(nextMessage);
      }
    }
  }

  playOlder() {
    if (!this.currentAudio.value) {
      return;
    }
    const msg = this.currentAudio.value.message;
    const msgId = msg.id;
    const nextId = this.#audioChunkService!.getOlderId(msgId);
    if (nextId) {
      const nextMessage = messageCache.get(peerMessageToId(this.#peerFromMessage(msg), nextId));
      if (nextMessage?._ === 'message') {
        this.play(nextMessage);
      }
    }
  }

  #play = (url: string, position?: number) => {
    this.#audioElement.src = url;
    this.#audioElement.load();
    this.#seekAndPlay(position);
  };

  #pause = (reset: boolean) => {
    if (this.currentAudio.value) {
      clearInterval(this.#audioPlayingTimer);
      this.#audioElement.pause();
      this.playingNow.next(false);
      const state = this.getPlaybackState(messageToId(this.currentAudio.value.message));
      state.next({
        ...state.value,
        buffered: undefined,
        playProgress: reset ? 0 : state.value.playProgress,
        status: MediaPlaybackStatus.Stopped,
      });
    }
  };

  #seekAndPlay = (position?: number) => {
    if (!this.currentAudio.value) {
      return;
    }

    const audioEl = this.#audioElement;
    const state = this.getPlaybackState(messageToId(this.currentAudio.value.message));
    const audioAttribute = getAttributeAudio(this.currentAudio.value.doc)!;

    const pos = position !== undefined ? position : state.value.playProgress;
    audioEl.currentTime = pos * audioAttribute.duration;

    if (!audioEl.paused) {
      return;
    }

    audioEl.play();
    const { buffered, duration } = audioEl;
    state.next({ playProgress: pos, duration, buffered, status: MediaPlaybackStatus.Playing });
    this.#audioPlayingTimer = setInterval(() => {
      const progress = Math.min(1, audioEl.currentTime / audioAttribute.duration);
      state.next({
        playProgress: progress,
        buffered: audioEl.buffered,
        duration: audioAttribute.duration,
        status: MediaPlaybackStatus.Playing,
      });
    }, Math.min(100, audioAttribute.duration * 10));
  };

  #onended = () => {
    if (!this.currentAudio.value) {
      return;
    }

    this.playingNow.next(false);
    clearInterval(this.#audioPlayingTimer);
    const state = this.getPlaybackState(messageToId(this.currentAudio.value.message));
    state.next({
      ...state.value,
      playProgress: 0,
      buffered: undefined,
      status: MediaPlaybackStatus.Stopped,
    });

    if (this.hasNewer.value) {
      this.playNewer();
    } else {
      this.currentAudio.next(undefined);
    }
  };

  #fetchTrackList = (message: Message.message) => {
    const audioType = this.#getAudioType(message);
    if (!this.currentAudio.value || this.#peerId(message) !== this.#peerId(this.currentAudio.value.message) || this.#audioType !== audioType) {
      if (this.#audioChunkService) {
        this.#audioChunkService.destroy();
      }
      this.#audioType = audioType;
      const chunkService = this.#media.getMediaMessagesChunk(this.#peerFromMessage(message), audioType, message.id);
      this.#audioChunkService = chunkService;
      chunkService.history.subscribe((chunk) => {
        this.hasOlder.next(!!chunkService.getOlderId(message.id));
        this.hasNewer.next(!!chunkService.getNewerId(message.id));
        const idx = chunk.ids.indexOf(message.id);
        if (idx < 3 && !chunk.oldestReached) {
          chunkService.loadMore(Direction.Older);
        }
        if (idx >= chunk.ids.length - 3 && !chunk.newestReached) {
          chunkService.loadMore(Direction.Newer);
        }
      });
    }
  };

  #peerFromMessage = (message: Message.message): Peer => {
    if (isSelf(message.to_id)) {
      return { _: 'peerUser', user_id: message.from_id! };
    }
    return message.to_id;
  };

  #getAudioType = (message: Message.message) => {
    const doc = getMessageDocument(message);
    if (doc?._ !== 'document') {
      throw new Error('Message must contain document.');
    }
    const audioAttribute = getAttributeAudio(doc)!;
    return audioAttribute.voice ? 'voice' : 'music';
  };

  #peerId = (message: Message.message) => peerToId(this.#peerFromMessage(message));
}
