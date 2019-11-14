import { div, text } from 'core/html';
import { useMessage } from 'cache/hooks';

export default function dialogMessage(id: number) {
  const msg = useMessage(id);

  if (!msg) return div`.dialog__message`();

  let content = msg.message || '';

  if (msg.media) {
    if (msg.media._ === 'messageMediaPhoto') content = content ? `🖼${content}` : '🖼 Photo';
    if (msg.media._ === 'messageMediaGeo') content = '📍 Location';
    if (msg.media._ === 'messageMediaContact') content = '👤 Contact';
    if (msg.media._ === 'messageMediaDocument') content = 'Document';
    if (msg.media._ === 'messageMediaGeoLive') content = '📍 Live Location';
    if (msg.media._ === 'messageMediaPoll') content = '📊 Poll';
  }

  return (
    div`.dialog__message`(
      text(content),
    )
  );
}
