import { chatCache, messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import client from 'client/client';
import { Peer, Update } from 'mtproto-js';

export default class PollsService {
  constructor() {
    client.updates.on('updateMessagePoll', this.processUpdateMessagePoll);
    client.updates.on('updateMessagePollVote', this.processUpdateMessagePollVote);

    // Telegram doesn't send poll update when poll is closed by timeout. Thus we have to setup a timer which triggers poll close.
    messageCache.changes.subscribe((changes) => {
      changes.forEach(([changeType, message, id]) => {
        if (changeType === 'add') {
          if (message?._ === 'message' && message?.media?._ === 'messageMediaPoll') {
            let timeout = 0;
            if (message.media.poll.close_period) {
              timeout = message.media.poll.close_period * 1000 - (Date.now() - message.date * 1000);
            } else if (message.media.poll.close_date) {
              timeout = message.media.poll.close_date * 1000 - Date.now();
            }
            if (timeout > 0) {
              this.schedulePollClose(id, timeout);
            }
          }
        }
      });
    });
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
          this.processUpdateMessagePoll(update);
        }
      });
    }
  }

  private schedulePollClose(messageId: string, timeout: number) {
    setTimeout(() => {
      const latestMessage = messageCache.get(messageId);
      if (latestMessage?._ === 'message' && latestMessage?.media?._ === 'messageMediaPoll') {
        if (latestMessage.media.poll.closed) {
          return;
        }
        const { media, media: { poll } } = latestMessage;
        const closedPollMessage = {
          ...latestMessage,
          media: {
            ...media,
            poll: {
              ...poll,
              closed: true,
            },
          },
        };
        messageCache.change(messageId, closedPollMessage);
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
