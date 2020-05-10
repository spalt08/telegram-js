import { Message, Update, PollResults } from 'mtproto-js';
import { messageToId } from 'helpers/api';
import Collection from '../collection';

export default function pollsIndex(collection: Collection<Message, any>) {
  const pollMessageIds = new Map<string, Set<string>>();
  collection.changes.subscribe((collectionChanges) => {
    collectionChanges.forEach(([action, item]) => {
      if (item._ !== 'message' || item.media?._ !== 'messageMediaPoll') {
        return;
      }
      switch (action) {
        case 'add': {
          let messages = pollMessageIds.get(item.media.poll.id);
          if (!messages) {
            pollMessageIds.set(item.media.poll.id, messages = new Set());
          }
          messages.add(messageToId(item));
          break;
        }
        case 'remove': {
          const messages = pollMessageIds.get(item.media.poll.id);
          if (messages) {
            messages.delete(messageToId(item));
          }
          break;
        }
        default:
      }
    },
    );
  });

  const expandMinUpdateResults = (prevResults: PollResults, newResults: PollResults) => {
    if (!newResults.min) {
      return newResults;
    }
    const result: PollResults = { ...prevResults, ...newResults };
    if (prevResults.results && newResults.results) {
      const results = result.results = [...newResults.results.map((r) => ({ ...r }))];
      const decoder = new TextDecoder();
      const prevResultOptions = new Map(prevResults.results.map((r) => [decoder.decode(r.option), r]));
      results.forEach((option) => {
        const prevOptions = prevResultOptions.get(decoder.decode(option.option));
        if (prevOptions) {
          // eslint-disable-next-line no-param-reassign
          option.correct = prevOptions.correct;
          // eslint-disable-next-line no-param-reassign
          option.chosen = prevOptions.chosen;
        }
      });
    }
    return result;
  };

  return {
    updatePoll(update: Update.updateMessagePoll) {
      const messageIds = pollMessageIds.get(update.poll_id);
      if (messageIds) {
        messageIds.forEach((messageId) => {
          const message = collection.get(messageId);
          if (message?._ === 'message' && message.media?._ === 'messageMediaPoll') {
            const expandedResults = expandMinUpdateResults(message.media.results, update.results);
            const updatedMedia = {
              ...message.media,
              results: expandedResults,
            };
            if (update.poll) {
              updatedMedia.poll = update.poll;
            }
            const updatedMessage = {
              media: updatedMedia,
            };
            collection.change(messageId, updatedMessage);
          }
        });
      }
    },
  };
}
