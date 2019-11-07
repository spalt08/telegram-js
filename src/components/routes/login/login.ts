import LoginTransition from './transition';
import loginWelcome from './login_welcome';
import loginCode from './login_code';
import './login.scss';

/**
 * Handler for route /login
 */
export default function login() {
  const controller = new LoginTransition({ className: 'login' }, [
    loginWelcome,
  ]);

  setTimeout(() => controller.translateRight(loginCode), 1000);
  setTimeout(() => controller.translateRight(loginWelcome), 2000);
  // setTimeout(() => controller.translateRight(loginCode), 3000);

  return controller.element;
}
