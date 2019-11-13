import { div, text, img } from 'core/html';
import { svgCodeToComponent } from 'core/factory';
import corner from './message-corner.svg?raw';
import cornerShadow from './message-corner-shadow.svg?raw';
import './message.scss';

// eslint-disable-next-line
const cornerSvg = /*#__PURE__*/svgCodeToComponent(corner);
// eslint-disable-next-line
const cornerShadowSvg = /*#__PURE__*/svgCodeToComponent(cornerShadow);

export default function message({ msg = 'Message', out = true, image = '', }: any) {
  return (
    div`.message${out ? 'out' : ''}`(
      div`.message__wrapper`(
        div`.message__content`(
          div`.message__text`(
            text(msg),
          ),
        ),
      ),
      cornerSvg({ className: 'message__corner' }),
      cornerShadowSvg({ className: 'message__corner-shadow' }),
    )
  );
}
