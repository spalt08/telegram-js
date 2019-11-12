import { div } from 'core/html';
import LoginTransition from './transition';
import loginWelcomeContainer from './welcome/welcome_сontainer';
import loginCodeContainer from './code/code_container';
import loginPasswordContainer from './login_password_container';
import './login.scss';

/**
 * Handler for route /login
 */
export default function login() {
  const transitionController = new LoginTransition();

  const welcome = loginWelcomeContainer({
    onCode(phone, phoneCodeHash) {
      transitionController.translateRight(() => makeLoginCode(phone, phoneCodeHash));
    },
    onRegister(phone) {
      console.log('register!', phone);
    },
  });

  function makeLoginCode(phone: string, hash: string) {
    return loginCodeContainer({
      phone,
      hash,
      onRedirectToPassword() {
        transitionController.translateRight(makeLoginPassword);
      },
      onReturnToPhone() {
        // todo: Translate left
        transitionController.translateRight(() => welcome);
      },
    });
  }

  function makeLoginPassword() {
    return loginPasswordContainer();
  }

  transitionController.set(makeLoginCode('123', '2123'));

  return div`.login`(
    transitionController.element,
  );
}
