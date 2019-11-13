import { div } from 'core/html';
import { getInterface, useObservable } from 'core/hooks';
import { auth } from 'services';
import LoginTransition from '../transition';
import codeBasic from './code_basic';
import code2fa from './code_2fa';
import monkey from './monkey';
import '../login.scss';

/**
 * Layout for entering SMS code for sign in and 2fa with transitions
 */
export default function formCode() {
  const transitioner = new LoginTransition();

  const monkeyEl = monkey();

  const basic = codeBasic({
    onFocus(val) {
      getInterface(monkeyEl).lookAtCode(val);
    },
    onBlur(val) {
      getInterface(monkeyEl).idleCode(val);
    },
    onChange(val) {
      getInterface(monkeyEl).followCode(val);
    },
  });

  const c2fa = code2fa({
    onHideToggle(val) {
      if (val === true) getInterface(monkeyEl).unpeek();
      else getInterface(monkeyEl).peek();
    },
  });

  const element = (
    div`.login__form`(
      monkeyEl,
      transitioner.element,
    )
  );

  // Manage transitions
  useObservable(element, auth.state, (view) => {
    if (view === '2fa') {
      transitioner.translateRight(() => c2fa);
      getInterface(monkeyEl).closeEyes();
    }

    if (view === 'code') transitioner.set(() => basic);
  });

  return element;
}
