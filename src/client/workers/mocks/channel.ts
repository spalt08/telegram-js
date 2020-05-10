/* eslint-disable no-param-reassign */
import { Chat } from 'mtproto-js';
import { mockChatPhoto } from './photo';

let chatIdCounter = 157854402;

function mockChannel({
  creator = false,
  left = false,
  broadcast = true,
  verified = true,
  megagroup = false,
  restricted = false,
  min = true,
  scam = false,
  has_link = false,
  has_geo = false,
  slowmode_enabled = false,
  username,
  title,
  photo,
  date = 1473175039,
  version = 0,
  restriction_reason = undefined,
  admin_rights = undefined,
  banned_rights = undefined,
  default_banned_rights = undefined,
  participants_count = 0,
}: Partial<Chat.channel> & { title: string }): Chat.channel {
  const id = chatIdCounter++;
  if (!photo) photo = mockChatPhoto(id);

  return {
    _: 'channel',
    creator,
    left,
    broadcast,
    verified,
    megagroup,
    restricted,
    min,
    scam,
    has_link,
    has_geo,
    slowmode_enabled,
    id,
    access_hash: `channelhash${id}`,
    title: title || `Channel #${id}`,
    username: username || `channel${id}`,
    photo,
    participants_count,
    date,
    version,
    restriction_reason,
    admin_rights,
    banned_rights,
    default_banned_rights,
  };
}

export const channels = [
  mockChannel({ title: 'Weather Channel' }),
];
