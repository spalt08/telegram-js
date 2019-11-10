/* eslint-disable @typescript-eslint/no-use-before-define */
import LoginTransition from './transition';
import loginWelcomeContainer from './login_welcome_container';
import loginCodeContainer from './login_code_container';
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
      onReturnToPhone() {
        // todo: Translate left
        controller.translateRight(() => loginWelcomeElement);
      },
    });
  }

  return controller.element;
}
