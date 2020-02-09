import { div, input } from 'core/html';
import { mount, listen } from 'core/dom';
import { smile } from 'components/icons';
import stickMojiPanel from './input_stickmoji';
import './input.scss';

export default function messageInput() {
  const element = div`.msginput`();
  const emojiIcon = div`.msginput__emoji`(smile());
  const stickmojiPanelEl = stickMojiPanel();

  const container = div`.msginput__container`(
    div`.msginput__bubble_wrap`(
      stickmojiPanelEl,
      div`.msginput__bubble`(
        emojiIcon,
        input({ placeholder: 'Message', disabled: true }),
        div`.msginput__icon_attach`(),
      ),
    ),
    div`.msginput__btn`(),
  );

  let closeTimer: number | undefined;
  const closeDelay = 300;

  const openPanel = () => {
    if (closeTimer) clearTimeout(closeTimer);
    stickmojiPanelEl.classList.add('opened');
    emojiIcon.classList.add('active');
  };

  const closePanel = () => {
    stickmojiPanelEl.classList.remove('opened');
    emojiIcon.classList.remove('active');
  };

  const closePanelDelayed = () => {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(closePanel as TimerHandler, closeDelay);
  };

  listen(emojiIcon, 'mouseenter', openPanel);
  listen(emojiIcon, 'mouseleave', closePanelDelayed);
  listen(stickmojiPanelEl, 'mouseenter', openPanel);
  listen(stickmojiPanelEl, 'mouseleave', closePanelDelayed);

  mount(element, container);
  container.classList.remove('hidden');

  return element;
}
