import emojiPanel from 'components/media/emoji/panel';
import stickerPanel from 'components/media/sticker/panel';
import './input_stickmoji.scss';
import { animationFrameStart, listenOnce } from 'core/dom';
import { getInterface } from 'core/hooks';
import { Document } from 'mtproto-js';
import { tabsPanel } from 'components/ui';

type Props = {
  onSelectEmoji: (emoji: string) => void,
  onSelectSticker: (sticker: Document) => void,
};

export default function stickMojiPanel({ onSelectEmoji, onSelectSticker }: Props) {
  const emojis = emojiPanel(onSelectEmoji);
  const stickers = stickerPanel(onSelectSticker);
  const panels = [
    { key: 'emoji', title: 'Emoji', content: () => emojis },
    { key: 'stickers', title: 'Stickers', content: () => stickers },
  ];

  const container = tabsPanel({ className: 'stickmoji-panel', headerAlign: 'center' }, panels);

  listenOnce(container, 'transitionend', async () => {
    await animationFrameStart();
    getInterface(emojis).update();
    getInterface(stickers).update();
  });

  return container;
}
