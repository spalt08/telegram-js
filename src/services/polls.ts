import { messageCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import client, { fetchUpdates } from 'client/client';
import { peerMessageToId } from 'helpers/api';
import { Peer, Update } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';

export default class PollsService {
  public readonly timeDiff = new BehaviorSubject<number>(0);

  constructor() {
    client.updates.on('updateMessagePoll', this.processUpdateMessagePoll);
    client.updates.on('updateMessagePollVote', this.processUpdateMessagePollVote);

    // Telegram doesn't send poll update when poll is closed by timeout. Thus we have to setup a timer which triggers poll close.
    messageCache.changes.subscribe((changes) => {
      changes.forEach(([changeType, message, id]) => {
        if (changeType === 'add') {
          if (message?._ === 'message' && message?.media?._ === 'messageMediaPoll') {
            const now = Date.now();
            let timeout = 0;
            if (message.media.poll.close_period) {
              timeout = message.media.poll.close_period * 1000 - (now - message.date * 1000);
            } else if (message.media.poll.close_date) {
              timeout = message.media.poll.close_date * 1000 - Date.now();
            }
            if (timeout > 0) {
              // there might be difference between server and client system time, so we should take it into account when creating a timer.
              // todo: this hack won't work with persistent message cache.
              const timeDiff = (now - message.date * 1000);
              this.timeDiff.next(timeDiff);
              this.schedulePollClose(message.id, message.to_id, timeout + timeDiff);
            }
          }
        }
      });
    });
  }

  public async sendVote(peer: Peer, messageId: number, options: ArrayBuffer[]) {
    try {
      const updates = await client.call('messages.sendVote', {
        peer: peerToInputPeer(peer),
        msg_id: messageId,
        options,
      });

      fetchUpdates(updates);
    } catch (e) {
      console.warn('Faied to send vote', e);
    }
  }

  private schedulePollClose(messageId: number, peer: Peer, timeout: number) {
    setTimeout(() => {
      const latestMessage = messageCache.get(peerMessageToId(peer, messageId));
      if (latestMessage?._ === 'message' && latestMessage?.media?._ === 'messageMediaPoll') {
        if (latestMessage.media.poll.closed) {
          return;
        }
        client.call('messages.getPollResults', { peer: peerToInputPeer(peer), msg_id: messageId })
          .then((updates) => {
            if (updates._ === 'updates') {
              updates.updates.forEach((update: Update.updateMessagePoll) => this.processUpdateMessagePoll(update));
            }
          });
      }
    }, timeout);
  }

  private processUpdateMessagePoll = (update: Update.updateMessagePoll) => {
    messageCache.indices.polls.updatePoll(update);
  };

  private processUpdateMessagePollVote = (update: Update.updateMessagePollVote) => {
    console.error(update);
  };
}
