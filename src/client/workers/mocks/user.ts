/* eslint-disable no-param-reassign */
import { User } from 'mtproto-js';
import { mockUserPhoto } from './photo';

let userIdCounter = 1;

function mockUser({
  self = false,
  contact = true,
  mutual_contact = true,
  deleted = false,
  bot = false,
  bot_chat_history = false,
  bot_nochats = false,
  verified = false,
  restricted = false,
  min = false,
  bot_inline_geo = false,
  support = false,
  scam = false,
  first_name,
  last_name,
  phone = '79991112233',
  photo,
  status = {
    _: 'userStatusOffline',
    was_online: Math.round(Date.now() / 1000) - 200,
  },
  bot_info_version = 0,
  restriction_reason = [],
  bot_inline_placeholder = '',
  lang_code = '',
}: Partial<User.user> & { first_name: string, last_name: string }): User.user {
  const id = userIdCounter++;
  if (!photo) photo = mockUserPhoto(id);

  return {
    _: 'user',
    self,
    contact,
    mutual_contact,
    deleted,
    bot,
    bot_chat_history,
    bot_nochats,
    verified,
    restricted,
    min,
    bot_inline_geo,
    support,
    scam,
    id,
    access_hash: `userhash${id}`,
    first_name,
    last_name,
    username: first_name.toLowerCase() + last_name.toLowerCase(),
    phone,
    photo,
    status,
    bot_info_version,
    restriction_reason,
    bot_inline_placeholder,
    lang_code,
  };
}

export const me = mockUser({
  first_name: 'Todd',
  last_name: 'Andersen',
});

export const users = [
  me,
  mockUser({ first_name: 'Louisa', last_name: 'Monroe' }),
  mockUser({ first_name: 'Lewys', last_name: 'Dalton' }),
];
