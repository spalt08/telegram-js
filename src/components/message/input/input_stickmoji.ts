import { div, text } from 'core/html';
import emojiPanel from 'components/media/emoji/panel';
import stickerPanel from 'components/media/sticker/panel';
import './input_stickmoji.scss';
import { listen, getAttribute, mount, listenOnce, unmount } from 'core/dom';

export default function stickMojiPanel() {
  const tabs = [
    div`.stickmoji-panel__tab`({ 'data-index': '0' }, text('Emoji')),
    div`.stickmoji-panel__tab`({ 'data-index': '1' }, text('Stickers')),
  ];

  const panels = [
    emojiPanel(),
    stickerPanel(),
  ];

  let selected = 0;
  let isLocked = false;

  tabs[selected].classList.add('active');

  const content = div`.stickmoji-panel__content`(
    panels[selected],
  );

  const clickHandler = (event: MouseEvent) => {
    if (!event.currentTarget) return;
    if (isLocked) return;

    const next = +getAttribute(event.currentTarget as HTMLElement, 'data-index');

    if (selected === next) return;

    isLocked = true;

    const removingEl = panels[selected];

    let direction = 'left';
    if (next < selected) direction = 'right';

    tabs[selected].classList.remove('active');
    tabs[next].classList.add('active');
    panels[next].classList.add(`appearing-${direction}`);

    removingEl.classList.add(`removing-${direction}`);

    listenOnce(removingEl, 'transitionend', () => {
      removingEl.classList.remove(`removing-${direction}`);
      unmount(removingEl);
      panels[selected].classList.remove(`appearing-${direction}`);
      isLocked = false;
    });

    selected = next;

    mount(content, panels[selected]);
  };

  for (let i = 0; i < tabs.length; i += 1) listen(tabs[i], 'click', clickHandler);

  return (
    div`.stickmoji-panel`(
      div`.stickmoji-panel__tabs`(
        ...tabs,
      ),
      content,
    )
  );
}
