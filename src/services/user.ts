import client from 'client/client';
import { userCache } from '../cache';

export default class UsersService {
  constructor() {
    client.updates.on('updateUserStatus', (update) => {
      const user = userCache.get(update.user_id);
      if (user && user._ !== 'userEmpty') {
        userCache.put({ ...user, status: update.status });
      }
    });

    // The client pushes it before pushing messages
    client.updates.on('user', (user) => {
      // It may have a broken access_hash (like the `chat` push) so it shouldn't replace an existing user
      // todo: Check it
      if (!userCache.has(user.id)) {
        userCache.put(user);
      }
    });
  }

  /*
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
   */
}
