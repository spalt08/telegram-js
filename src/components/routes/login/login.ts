/* eslint-disable @typescript-eslint/no-use-before-define */
import LoginTransition from './transition';
import loginWelcome from './login_welcome';
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
    return loginWelcome({
      onSubmit(phone: string, remember: boolean) {
        console.log('Phone submit', { phone, remember });
        controller.translateRight(makeLoginCode);
      },
    });
  }

  function makeLoginCode() {
    return loginCode();
  }

  return controller.element;
}
