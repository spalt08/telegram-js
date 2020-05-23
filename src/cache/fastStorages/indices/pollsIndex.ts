import { messageToId } from 'helpers/api';
import { Message, PollResults, Update } from 'mtproto-js';
import Collection from '../collection';

const decoder = new TextDecoder();

export default function pollsIndex(collection: Collection<Message, any>) {
  const pollMessageIds = new Map<string, Set<string>>();
  collection.changes.subscribe((collectionChanges) => {
    collectionChanges.forEach(([action, item]) => {
      if (item._ !== 'message' || item.media?._ !== 'messageMediaPoll') {
        return;
      }
      switch (action) {
        case 'add': {
          let messageIds = pollMessageIds.get(item.media.poll.id);
          if (!messageIds) {
            pollMessageIds.set(item.media.poll.id, messageIds = new Set());
          }
          messageIds.add(messageToId(item));
          break;
        }
        case 'remove': {
          const messageIds = pollMessageIds.get(item.media.poll.id);
          if (messageIds) {
            messageIds.delete(messageToId(item));
            if (messageIds.size === 0) {
              pollMessageIds.delete(item.media.poll.id);
            }
          }
          break;
        }
        default:
      }
    },
    );
  });

  const applyMinPollResults = (prevPollResults: PollResults, newPollResults: PollResults) => {
    if (!newPollResults.min) {
      return newPollResults;
    }
    const pollResults: PollResults = { ...prevPollResults, ...newPollResults };
    if (prevPollResults.results && newPollResults.results) {
      const results = pollResults.results = newPollResults.results.map((r) => ({ ...r }));
      const prevResultOptions = new Map(prevPollResults.results.map((r) => [decoder.decode(r.option), r]));
      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const prevResults = prevResultOptions.get(decoder.decode(result.option));
        if (prevResults) {
          result.correct = prevResults.correct;
          result.chosen = prevResults.chosen;
        }
      }
    }
    return pollResults;
  };

  return {
    updatePoll(update: Update.updateMessagePoll) {
      const messageIds = pollMessageIds.get(update.poll_id);
      if (messageIds) {
        messageIds.forEach((messageId) => {
          const message = collection.get(messageId);
          if (message?._ === 'message' && message.media?._ === 'messageMediaPoll') {
            const updatedResults = applyMinPollResults(message.media.results, update.results);
            const updatedMedia = {
              ...message.media,
              results: updatedResults,
            };
            if (update.poll) {
              updatedMedia.poll = update.poll;
            }
            const updatedMessage = {
              ...message,
              media: updatedMedia,
            };
            collection.change(messageId, updatedMessage);
          }
        });
      }
    },
  };
}
