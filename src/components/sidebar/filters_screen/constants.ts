import { DialogFilter } from 'mtproto-js';
import * as icons from 'components/icons';

export const typesToInclude = ['contacts', 'non_contacts', 'groups', 'broadcasts', 'bots'] as const;
export const typesToExclude = ['exclude_read', 'exclude_archived', 'exclude_muted'] as const;

export const typesInfos = {
  contacts: [icons.user, 'Contacts'] as const,
  non_contacts: [icons.noncontacts, 'Non-Contacts'] as const,
  groups: [icons.group, 'Groups'] as const,
  broadcasts: [icons.channel, 'Channels'] as const,
  bots: [icons.bots, 'Bots'] as const,
  exclude_muted: [icons.mute, 'Muted'] as const,
  exclude_archived: [icons.archive, 'Archived'] as const,
  exclude_read: [icons.readchats, 'Read'] as const,
};

export type PeersType = keyof DialogFilter;
