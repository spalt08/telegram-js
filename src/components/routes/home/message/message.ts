import { div, text } from 'core/html';
import { svgCodeToComponent } from 'core/factory';
import { useMessage } from 'cache/hooks';
import { auth } from 'services';
import corner from './message-corner.svg?raw';
import cornerShadow from './message-corner-shadow.svg?raw';
import './message.scss';

const cornerSvg = svgCodeToComponent(corner);
const cornerShadowSvg = svgCodeToComponent(cornerShadow);

export default function message(id: number) {
  const msg = useMessage(id);

  if (!msg) return div();

  return (
    div`.message${msg.from_id === auth.userID ? 'out' : ''}`(
      div`.message__wrapper`(
        div`.message__content`(
          div`.message__text`(
            text(msg.message || ''),
          ),
        ),
      ),
      cornerSvg({ className: 'message__corner' }),
      cornerShadowSvg({ className: 'message__corner-shadow' }),
    )
  );
}
