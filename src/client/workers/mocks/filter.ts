import { DialogFilter } from 'mtproto-js';
import { LoremIpsum } from 'lorem-ipsum';
import { capitalizeFirstLetter } from 'helpers/data';

const lorem = new LoremIpsum();

export function mockFilter({
  contacts = Math.random() < 0.5,
  non_contacts = Math.random() < 0.5,
  groups = Math.random() < 0.5,
  broadcasts = Math.random() < 0.5,
  bots = Math.random() < 0.5,
  exclude_muted = Math.random() < 0.5,
  exclude_read = Math.random() < 0.5,
  exclude_archived = Math.random() < 0.5,
  id = Math.random() * 1e8 | 0,
  title = capitalizeFirstLetter(lorem.generateWords(1)),
  emoticon,
  pinned_peers = [],
  include_peers = [],
  exclude_peers = [],
}: Partial<DialogFilter.dialogFilter> = {}): DialogFilter.dialogFilter {
  return {
    _: 'dialogFilter',
    contacts,
    non_contacts,
    groups,
    broadcasts,
    bots,
    exclude_muted,
    exclude_read,
    exclude_archived,
    id,
    title,
    emoticon,
    pinned_peers,
    include_peers,
    exclude_peers,
  };
}

export function mockFilters(minCount: number, maxCount: number, props?: Partial<DialogFilter.dialogFilter>) {
  return Array.from({ length: minCount + Math.random() * maxCount | 0 }).map(() => mockFilter(props));
}
