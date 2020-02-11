import client from 'client/client';
import { User, UserFull } from 'cache/types';
import { userFullCache } from 'cache';

/**
 * Singleton service class for handling users
 */
export default class UserService {
  loadFullInfo(user: User) {
    const payload = {
      id: { _: 'inputUser', user_id: user.id, access_hash: user.access_hash },
    };
    client.call('users.getFullUser', payload, (err, userFull: UserFull) => {
      userFullCache.put(userFull);
    });
  }
}
