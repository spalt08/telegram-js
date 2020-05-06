/* eslint-disable no-param-reassign */
import { Chat } from 'mtproto-js';
import { mockChatPhoto } from './photo';

let chatIdCounter = 157854402;

function mockChat({
  creator = false,
  kicked = false,
  left = false,
  deactivated = true,
  title,
  photo,
  participants_count = 0,
  date = 1473175039,
  version = 8,
  migrated_to = undefined,
}: Partial<Chat.chat> & { title: string }): Chat {
  const id = chatIdCounter++;
  if (!photo) photo = mockChatPhoto(id);

  return {
    _: 'chat',
    creator,
    kicked,
    left,
    deactivated,
    id,
    title,
    photo,
    participants_count,
    date,
    version,
    migrated_to,
  };
}

export const chats = [
  mockChat({ title: 'YouTube Videos' }),
  mockChat({ title: 'Blog Articles' }),
];
