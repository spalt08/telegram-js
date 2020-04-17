import { Message, MessageMedia } from 'client/schema';
import { div, text } from 'core/html';
import { formatNumber } from 'helpers/other';
import { WithInterfaceHook, useInterface } from 'core/hooks';
import { getAttributeVideo, getAttributeSticker } from 'helpers/files';
import { isEmoji } from 'helpers/message';
import datetime from '../datetime/datetime';

import './message_info.scss';

type ReadStatus =
  | 'sending'
  | 'unread'
  | 'read'
  | 'error';

interface Props {
  className?: string,
  status: ReadStatus,
}

function isMedia(media: MessageMedia): boolean {
  switch (media._) {
    case 'messageMediaPhoto':
    case 'messageMediaGeo':
    case 'messageMediaGeoLive':
      return true;
    case 'messageMediaDocument':
      return media.document && media.document._ !== 'documentEmpty'
        ? !!(getAttributeVideo(media.document) || getAttributeSticker(media.document))
        : false;
    default:
      return false;
  }
}

export default function messageInfo({ className, status }: Props, message: Message.message) {
  const children: Node[] = [];
  if (message.views && !message.out) {
    children.push(div`.messageInfo_views`(text(formatNumber(message.views)), div`.messageInfo__eye`()));
  }
  if (message.post_author && !message.out) {
    children.push(div`.messageInfo_author`(text(message.post_author)));
    children.push(text(', '));
  }
  if (message.edit_date && !message.edit_hide) {
    children.push(text('edited '));
  }
  children.push(datetime({ timestamp: message.date, date: false }));
  if (message.out) {
    children.push(div`.messageInfo__status`());
  }
  const element = div`.messageInfo${className}`(...children);

  if (message.edit_date && !message.edit_hide) {
    element.title = `${new Date(message.date * 1000).toLocaleString()}\nEdited: ${new Date(message.edit_date * 1000).toLocaleString()}`;
  } else {
    element.title = new Date(message.date * 1000).toLocaleString();
  }

  const media = message.media && isMedia(message.media);
  const onlyMedia = (!message.message && media)
    || (!message.media && message.message.length <= 6 && isEmoji(message.message))
    || (!message.message && message.media && media);
  element.classList.toggle('-only-media', onlyMedia);
  element.classList.toggle('-out', message.out);

  let currentStatus: ReadStatus = status;
  if (message.out) {
    element.classList.add(`-${status}`);
  }

  return useInterface(element, {
    updateStatus: (newStatus: ReadStatus) => {
      if (message.out && currentStatus !== newStatus) {
        element.classList.remove(`-${currentStatus}`);
        element.classList.add(`-${newStatus}`);
        currentStatus = newStatus;
      }
    },
  });
}

export type MessageInfoInterface = ReturnType<typeof messageInfo> extends WithInterfaceHook<infer I> ? I : never;
