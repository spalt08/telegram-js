/* eslint-disable no-restricted-syntax */
import { Peer } from 'mtproto-js';
import { users } from './user';
import { chats } from './chat';
import { channels } from './channel';

export const peers: Peer[] = [];

for (const user of users) peers.push({ _: 'peerUser', user_id: user.id });
for (const chat of chats) peers.push({ _: 'peerChat', chat_id: chat.id });
for (const channel of channels) peers.push({ _: 'peerChannel', channel_id: channel.id });
