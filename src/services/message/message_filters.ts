import { messageCache } from 'cache';
import { getMessageDocument } from 'helpers/api';
import { getAttributeAudio, getAttributeSticker, getAttributeVideo } from 'helpers/files';
import { MessageFilterType, MessageFilterData } from './types';

const messageFilters: Record<MessageFilterType, MessageFilterData> = {
  photoVideo: {
    cacheIndex: messageCache.indices.photoVideosHistory,
    apiFilter: { _: 'inputMessagesFilterPhotoVideo' },
    runtimeFilter(message) {
      if (message._ !== 'message') return false;
      if (message.media?._ === 'messageMediaPhoto') return true;
      const document = getMessageDocument(message);
      return !!(document && getAttributeVideo(document));
    },
  },

  document: {
    cacheIndex: messageCache.indices.documentsHistory,
    apiFilter: { _: 'inputMessagesFilterDocument' },
    runtimeFilter(message) {
      const document = getMessageDocument(message);
      if (!document) return false;
      if (getAttributeAudio(document)) return false;
      if (getAttributeSticker(document)) return false;
      if (getAttributeVideo(document)) return false;
      return true;
    },
  },

  link: {
    cacheIndex: messageCache.indices.linksHistory,
    apiFilter: { _: 'inputMessagesFilterUrl' },
    runtimeFilter(message) {
      if (message._ !== 'message') return false;
      return message.media?._ === 'messageMediaWebPage';
    },
  },

  voice: {
    cacheIndex: messageCache.indices.voiceHistory,
    apiFilter: { _: 'inputMessagesFilterVoice' },
    runtimeFilter(message) {
      const document = getMessageDocument(message);
      if (!document) return false;
      const audio = getAttributeAudio(document);
      return !!audio?.voice;
    },
  },

  music: {
    cacheIndex: messageCache.indices.musicHistory,
    apiFilter: { _: 'inputMessagesFilterMusic' },
    runtimeFilter(message) {
      const document = getMessageDocument(message);
      if (!document) return false;
      const audio = getAttributeAudio(document);
      return !!audio && !audio.voice;
    },
  },
};

export default messageFilters;
