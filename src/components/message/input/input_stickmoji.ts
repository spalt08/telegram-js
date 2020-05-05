import emojiPanel from 'components/media/emoji/panel';
import stickerPanel from 'components/media/sticker/panel';
import './input_stickmoji.scss';
import { animationFrameStart, listenOnce } from 'core/dom';
import { getInterface, hasInterface } from 'core/hooks';
import { Document } from 'mtproto-js';
import { tabsPanel } from 'components/ui';

type Props = {
  onSelectEmoji: (emoji: string) => void,
  onSelectSticker: (sticker: Document) => void,
};

export default function stickMojiPanel({ onSelectEmoji, onSelectSticker }: Props) {
  const panels = {
    Emoji: emojiPanel(onSelectEmoji),
    Stickers: stickerPanel(onSelectSticker),
  } as Record<string, HTMLElement>;

  const container = tabsPanel({ className: 'stickmoji-panel', headerAlign: 'center' }, panels);


  listenOnce(container, 'transitionend', async () => {
    await animationFrameStart();
    const keys = Object.keys(panels);
    for (let i = 0; i < keys.length; i++) {
      const panel = panels[keys[i]];
      if (hasInterface<{ update:() => void }>(panel)) getInterface(panel).update();
    }
  });

  return container;
}
