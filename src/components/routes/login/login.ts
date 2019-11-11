/* eslint-disable @typescript-eslint/no-use-before-define */
import LoginTransition from './transition';
import loginWelcomeContainer from './login_welcome_container';
import loginCodeContainer from './login_code_container';
import loginPasswordContainer from './login_password_container';
import './login.scss';

/**
 * Handler for route /login
 */
export default function login() {
  // Not removed from memory to not reset the inputs
  const loginWelcomeElement = makeLoginWelcome();

  const controller = new LoginTransition({ className: 'login' }, [
    () => loginWelcomeElement,
  ]);

  function makeLoginWelcome() {
    return loginWelcomeContainer({
      onRedirectToCode(phone) {
        controller.translateRight(() => makeLoginCode(phone));
      },
    });
  }

  function makeLoginCode(phone: string) {
    return loginCodeContainer({
      phone,
      onRedirectToPassword() {
        controller.translateRight(makeLoginPassword);
      },
      onReturnToPhone() {
        // todo: Translate left
        controller.translateRight(() => loginWelcomeElement);
      },
    });
  }

  function makeLoginPassword() {
    return loginPasswordContainer();
  }

  return controller.element;
}
