import { ripple } from 'components/ui';
import { getInterface } from 'core/hooks';
import { div, nothing, text } from 'core/html';
import popupCommon from '../popup_common';
import './confirmation.scss';

type Props = {
  body: string | Node;
  title?: string;
  buttons: Node[];
};

type ConfirmationProps = {
  body: string | Node;
  title?: string;
  confirmCallback: () => void;
};

type AlertProps = {
  body: string | Node;
  title?: string;
  callback?: () => void;
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

function basePopup({ body, title, buttons }: Props) {
  return popupCommon(
    div`.confirmation`(
      title ? div`.confirmation__title`(text(title)) : nothing,
      div`.confirmation__body`(typeof body === 'string' ? text(body) : body),
      div`.confirmation__buttons`(...buttons),
    ),
  );
}

export function confirmationPopup({ confirmCallback, ...props }: ConfirmationProps) {
  const popup = basePopup({
    ...props,
    buttons: [
      button('Cancel', () => getInterface(popup).remove()),
      button('OK', () => { getInterface(popup).remove(); confirmCallback(); }),
    ],
  });

  return popup;
}

export function alertPopup({ callback, ...props }: AlertProps) {
  const popup = basePopup({
    ...props,
    buttons: [
      // eslint-disable-next-line no-unused-expressions
      button('OK', () => { getInterface(popup).remove(); callback?.(); }),
    ],
  });

  return popup;
}
