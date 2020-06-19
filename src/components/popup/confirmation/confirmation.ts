import { ripple } from 'components/ui';
import { getInterface } from 'core/hooks';
import { div, nothing, text } from 'core/html';
import popupCommon from '../popup_common';
import './confirmation.scss';

type Props = {
  body: string | Node;
  title?: string;
  confirmCallback: () => void;
};

function button(caption: string, onClick: () => void) {
  return ripple({}, [
    div`.confirmation__button`(
      {
        onClick: () => setTimeout(onClick, 100),
      },
      text(caption),
    ),
  ]);
}

export default function confirmationPopup({ body, title, confirmCallback }: Props) {
  const popup = popupCommon(
    div`.confirmation`(
      title ? div`.confirmation__title`(text(title)) : nothing,
      div`.confirmation__body`(typeof body === 'string' ? text(body) : body),
      div`.confirmation__buttons`(
        button('Cancel', () => getInterface(popup).remove()),
        button('OK', () => { getInterface(popup).remove(); confirmCallback(); }),
      ),
    ),
  );

  return popup;
}
