import client from 'client/client';
import { Update, PollResults } from 'mtproto-js';

type PollListener = (update: PollResults.pollResults) => void;

export default class PollsService {
  private subscriptions = new Map<string, {lastUpdate?: PollResults.pollResults, listeners: Set<PollListener>}>();

  constructor() {
    client.updates.on('updateMessagePoll', (update: Update.updateMessagePoll) => {
      const subscription = this.subscriptions.get(update.poll_id);
      if (subscription) {
        subscription.lastUpdate = update.results;
        subscription.listeners.forEach((listener) => listener(update.results));
      }
    });
  }

  public addListener(pollId: string, listener: PollListener) {
    let supscription = this.subscriptions.get(pollId);
    if (!supscription) {
      this.subscriptions.set(pollId, supscription = { listeners: new Set() });
    }
    supscription.listeners.add(listener);
    if (supscription.lastUpdate) {
      listener(supscription.lastUpdate);
    }
  }

  public removeListener(pollId: string, listener: PollListener) {
    const subscription = this.subscriptions.get(pollId);
    if (subscription) {
      subscription.listeners.delete(listener);
    }
  }
}
