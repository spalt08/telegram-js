import client from 'client/client';
import { Update, PollResults, Peer } from 'mtproto-js';
import { peerToInputPeer } from 'cache/accessors';

type PollListener = (update: PollResults.pollResults, initial: boolean) => void;

export default class PollsService {
  private subscriptions = new Map<string, {lastUpdate?: PollResults.pollResults, listeners: Set<PollListener>}>();

  constructor() {
    client.updates.on('updateMessagePoll', this.processUpdate);
  }

  public subscribe(pollId: string, listener: PollListener) {
    let supscription = this.subscriptions.get(pollId);
    if (!supscription) {
      this.subscriptions.set(pollId, supscription = { listeners: new Set() });
    }
    supscription.listeners.add(listener);
    if (supscription.lastUpdate) {
      listener(supscription.lastUpdate, true);
    }
  }

  public unsubscribe(pollId: string, listener: PollListener) {
    const subscription = this.subscriptions.get(pollId);
    if (subscription) {
      subscription.listeners.delete(listener);
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
    const subscription = this.subscriptions.get(update.poll_id);
    if (subscription) {
      subscription.lastUpdate = update.results;
      subscription.listeners.forEach((listener) => listener(update.results, false));
    }
  };
}
