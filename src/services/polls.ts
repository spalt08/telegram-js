import client from 'client/client';
import { Update, Peer } from 'mtproto-js';
import { peerToInputPeer } from 'cache/accessors';
import { messageCache, userCache, chatCache } from 'cache';

export default class PollsService {
  constructor() {
    client.updates.on('updateMessagePoll', this.processUpdate);
  }

  public async sendVote(peer: Peer, messageId: number, options: ArrayBuffer[]) {
    const updates = await client.call('messages.sendVote', {
      peer: peerToInputPeer(peer),
      msg_id: messageId,
      options,
    });
    if (updates._ === 'updates') {
      userCache.put(updates.users);
      chatCache.put(updates.chats);
      updates.updates.forEach((update: Update) => {
        if (update._ === 'updateMessagePoll') {
          this.processUpdate(update);
        }
      });
    }
  }

  private processUpdate = (update: Update.updateMessagePoll) => {
    messageCache.indices.polls.updatePoll(update);
  };
}
