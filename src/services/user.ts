import { InputUser, Update } from 'mtproto-js';
import client from 'client/client';
import { userCache } from 'cache';
import AuthService from './auth';


export default class UsersService {
  #authService: AuthService;

  #loadingUserIds = new Set<number>();

  constructor(authService: AuthService) {
    this.#authService = authService;

    client.updates.on('updateUserStatus', (update: Update.updateUserStatus) => {
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

  async loadMissingUsers(inputUsers: InputUser[]) {
    const idsToLoad = new Set<number>();
    const inputUsersToLoad: InputUser[] = [];

    inputUsers.forEach(async (inputUser) => {
      if (inputUser._ === 'inputUserEmpty') {
        return;
      }

      const userId = inputUser._ === 'inputUserSelf' ? this.#authService.userID : inputUser.user_id;
      if (userCache.has(userId) || this.#loadingUserIds.has(userId) || idsToLoad.has(userId)) {
        return;
      }

      idsToLoad.add(userId);
      inputUsersToLoad.push(inputUser);
    });

    if (!inputUsersToLoad.length) {
      return;
    }

    try {
      idsToLoad.forEach((id) => this.#loadingUserIds.add(id));
      const users = await client.call('users.getUsers', { id: inputUsersToLoad });
      userCache.put(users);
    } finally {
      idsToLoad.forEach((id) => this.#loadingUserIds.delete(id));
    }
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
        if (process.env.NODE_ENV !== 'production') {
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
