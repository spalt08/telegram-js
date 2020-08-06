import { Message, MessagesFilter } from 'mtproto-js';
import { MessageHistoryIndex } from 'cache/fastStorages/indices/messageHistory';

export const enum Direction {
  Older,
  Newer,
  Around,
}

export type MessageFilterType = 'photoVideo' | 'document' | 'link' | 'voice' | 'music';

export interface MessageFilterData {
  apiFilter: MessagesFilter;
  cacheIndex: MessageHistoryIndex;
  runtimeFilter: (message: Readonly<Message>) => boolean;
}
