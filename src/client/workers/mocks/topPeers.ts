import { ContactsTopPeers, User } from 'mtproto-js';

export function mockTopUsers(users: User.user[]): ContactsTopPeers.contactsTopPeers {
  return {
    _: 'contacts.topPeers',
    chats: [],
    users,
    categories: [
      {
        _: 'topPeerCategoryPeers',
        category: { _: 'topPeerCategoryCorrespondents' },
        count: users.length,
        peers: users.map((user, index) => ({
          _: 'topPeer',
          peer: { _: 'peerUser', user_id: user.id },
          rating: 100 / (index + 1),
        })),
      },
    ],
  };
}
