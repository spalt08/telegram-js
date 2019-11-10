/* eslint-disable @typescript-eslint/no-use-before-define */
import LoginTransition from './transition';
import loginWelcomeContainer from './login_welcome_container';
import loginCode from './login_code';
import './login.scss';

/**
 * Handler for route /login
 */
export default function login() {
  const controller = new LoginTransition({ className: 'login' }, [
    makeLoginWelcome,
  ]);

  function makeLoginWelcome() {
    return loginWelcomeContainer(() => {
      controller.translateRight(makeLoginCode);
    });
  }

  function makeLoginCode() {
    return loginCode();
  }

  return controller.element;
}
