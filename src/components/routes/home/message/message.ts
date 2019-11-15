import { div, text } from 'core/html';
import { svgCodeToComponent } from 'core/factory';
import { messageCache } from 'cache';
import { auth } from 'services';
import corner from './message-corner.svg?raw';
import cornerShadow from './message-corner-shadow.svg?raw';
import './message.scss';

const cornerSvg = svgCodeToComponent(corner);
const cornerShadowSvg = svgCodeToComponent(cornerShadow);

export default function message(id: number) {
  const messageText = text('');

  const element = (
    div`.message`(
      div`.message__wrapper`(
        div`.message__content`(
          div`.message__text`(
            messageText,
          ),
        ),
      ),
      cornerSvg({ className: 'message__corner' }),
      cornerShadowSvg({ className: 'message__corner-shadow' }),
    )
  );

  messageCache.useWatchItem(element, id, true, (msg) => {
    element.classList[msg && msg.from_id === auth.userID ? 'add' : 'remove']('out');
    messageText.textContent = (msg && msg.message) || '';
  });

  return element;
}
