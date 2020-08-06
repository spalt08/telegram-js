import { InputChannel } from 'mtproto-js';
import client from 'client/client';
import { chatCache } from 'cache';

export default class ChatsService {
  #loadingChatIds = new Set<number>();

  #loadingChannelIds = new Set<number>();

  async loadMissingChats(ids: number[]) {
    const idsToLoad = new Set<number>();

    ids.forEach(async (id) => {
      if (chatCache.has(id) || this.#loadingChatIds.has(id) || idsToLoad.has(id)) {
        return;
      }

      idsToLoad.add(id);
    });

    if (!idsToLoad.size) {
      return;
    }

    try {
      idsToLoad.forEach((id) => this.#loadingChatIds.add(id));
      const chats = await client.call('messages.getChats', { id: [...idsToLoad] });
      chatCache.put(chats.chats);
    } finally {
      idsToLoad.forEach((id) => this.#loadingChatIds.delete(id));
    }
  }

  async loadMissingChannels(inputChannels: InputChannel[]) {
    const idsToLoad = new Set<number>();
    const inputChannelsToLoad: InputChannel[] = [];

    inputChannels.forEach(async (inputChannel) => {
      if (inputChannel._ === 'inputChannelEmpty') {
        return;
      }

      const channelId = inputChannel.channel_id;
      if (chatCache.has(channelId) || this.#loadingChannelIds.has(channelId) || idsToLoad.has(channelId)) {
        return;
      }

      idsToLoad.add(channelId);
      inputChannelsToLoad.push(inputChannel);
    });

    if (!inputChannelsToLoad.length) {
      return;
    }

    try {
      idsToLoad.forEach((id) => this.#loadingChannelIds.add(id));
      const channels = await client.call('channels.getChannels', { id: inputChannelsToLoad });
      chatCache.put(channels.chats);
    } finally {
      idsToLoad.forEach((id) => this.#loadingChannelIds.delete(id));
    }
  }
}
