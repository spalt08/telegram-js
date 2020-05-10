import client from 'client/client';
import { Update, PollResults, Peer } from 'mtproto-js';
import { peerToInputPeer } from 'cache/accessors';
import { messageCache } from 'cache';
import { peerMessageToId } from 'helpers/api';

type PollListener = (update: PollResults.pollResults, initial: boolean) => void;

export default class PollsService {
  private subscriptions = new Map<string, Set<PollListener>>();
  private pollMessages = new Map<string, { peer: Peer, messageId: number }[]>();

  constructor() {
    client.updates.on('updateMessagePoll', this.processUpdate);
  }

  private getMediaPoll(peer: Peer, messageId: number) {
    const message = messageCache.get(peerMessageToId(peer, messageId));
    if (message?._ === 'message' && message.media?._ === 'messageMediaPoll') {
      return message.media;
    }
    return undefined;
  }

  public subscribe(peer: Peer, messageId: number, listener: PollListener) {
    const mediaPoll = this.getMediaPoll(peer, messageId);
    if (!mediaPoll) return () => { };
    let pollMessages = this.pollMessages.get(mediaPoll.poll.id);
    if (!pollMessages) {
      this.pollMessages.set(mediaPoll.poll.id, pollMessages = []);
    }
    pollMessages.push({ peer, messageId });
    let supscriptionSet = this.subscriptions.get(mediaPoll.poll.id);
    if (!supscriptionSet) {
      this.subscriptions.set(mediaPoll.poll.id, supscriptionSet = new Set());
    }
    supscriptionSet.add(listener);
    return () => this.unsubscribe(peer, messageId, listener);
  }

  private unsubscribe(peer: Peer, messageId: number, listener: PollListener) {
    const mediaPoll = this.getMediaPoll(peer, messageId);
    if (!mediaPoll) return;
    const subscriptionSet = this.subscriptions.get(mediaPoll.poll.id);
    if (subscriptionSet) {
      subscriptionSet.delete(listener);
    }
  }

  public async sendVote(peer: Peer, messageId: number, options: ArrayBuffer[]) {
    const updates = await client.call('messages.sendVote', {
      peer: peerToInputPeer(peer),
      msg_id: messageId,
      options,
    });
    if (updates._ === 'updates') {
      updates.updates.forEach((update: Update) => {
        if (update._ === 'updateMessagePoll') {
          this.processUpdate(update);
        }
      });
    }
  }

  private processUpdate = (update: Update.updateMessagePoll) => {
    const messages = this.pollMessages.get(update.poll_id);
    if (messages) {
      messages.forEach((messageId) => {
        const id = peerMessageToId(messageId.peer, messageId.messageId);
        const message = messageCache.get(id);
        if (message?._ === 'message' && message.media?._ === 'messageMediaPoll') {
          const updatedMedia = {
            ...message.media,
            results: update.results,
          };
          if (update.poll) {
            updatedMedia.poll = update.poll;
          }
          const updatedMessage = {
            media: updatedMedia,
          };
          messageCache.change(id, updatedMessage);
        }
      });
    }
    const subscriptionSet = this.subscriptions.get(update.poll_id);
    if (subscriptionSet) {
      subscriptionSet.forEach((listener) => listener(update.results, false));
    }
  };
}
