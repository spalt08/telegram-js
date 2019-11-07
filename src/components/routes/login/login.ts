import LoginTransition from './transition';
import loginWelcome from './login_welcome';
import loginCode from './login_code';
import './login.scss';

export default function login() {
  const controller = new LoginTransition({ className: 'login' }, [
    loginWelcome,
  ]);

  // setTimeout(() => controller.transitRight(loginCode), 1000);
  // setTimeout(() => controller.transitRight(loginWelcome), 2000);
  // setTimeout(() => controller.transitRight(loginCode), 3000);

  return controller.element;
}
