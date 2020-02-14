import { Message, User } from 'cache/types';
import client from 'client/client';
import { messageSenderToInputUser } from 'cache/accessors';
import { userCache } from '../cache';

export default class UsersService {
  constructor() {
    client.updates.on('updateUserStatus', (update: any) => {
      const user = userCache.get(update.user_id);
      if (user) {
        userCache.put({ ...user, status: update.status });
      }
    });
  }

  loadMessageSenders(messages: Message[], onResult: (users: Array<User | undefined>) => void) {
    if (!messages.length) {
      onResult([]);
      return;
    }

    const parameters = {
      id: messages.map(messageSenderToInputUser),
    };

    client.call('users.getUsers', parameters, (err, data?: User[]) => {
      if (err) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to get users', {
            request: parameters,
            error: err,
          });
        }
      }
      onResult((data || []).map((user) => (user as any)._ === 'userEmpty' ? undefined : user));
    });
  }

  loadMissingMessageSenders(messages: Message[], onComplete: () => void) {
    const messagesWithMissingSender = messages.filter((message) => (
      message._ !== 'messageEmpty'
      && message.from_id
      && !userCache.has(message.from_id)
    ));

    this.loadMessageSenders(messagesWithMissingSender, (users) => {
      userCache.put(users.filter((user): user is User => !!user));
      onComplete();
    });
  }
}
