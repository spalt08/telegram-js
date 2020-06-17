import { User, Chat } from 'mtproto-js';
import Collection from '../collection';

export default function usernameIndex(collection: Collection<User | Chat, any, number>) {
  const usernames = new Map<string, User.user | Chat.channel>();
  collection.changes.subscribe((collectionChanges) => {
    collectionChanges.forEach(([action, item]) => {
      if ((item._ !== 'user' && item._ !== 'channel') || !item.username) {
        return;
      }
      switch (action) {
        case 'add':
        case 'update': {
          usernames.set(item.username, item);
          break;
        }
        case 'remove': {
          usernames.delete(item.username);
          break;
        }
        default:
      }
    },
    );
  });

  return {
    findByUsername(username: string) {
      return usernames.get(username);
    },
  };
}
