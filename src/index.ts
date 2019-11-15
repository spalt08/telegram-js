import './polyfills';
import * as routes from 'components/routes';
import { mount } from 'core/dom';
import { auth } from 'services';
import { Router, history } from './router';
import 'styles/global.scss';

// todo: check user login and redirect him
if (auth.state.value !== 'authorized' && history.state() !== 'sandbox') {
  history.push('/login');
} else if (history.state() === '/login') {
  history.push('/');
}

const router = new Router({
  '/': routes.home,
  '/login': routes.login,
  // '/sandbox': routes.sandbox,
  default: routes.login,
});

mount(document.body, router.element);

// todo: Check in IE 11 and add required polyfills
// todo: Fix SVGs in IE
// todo: Add loading screen
// todo: Fix the UI not responding when the backend is blocked (e.g. in Russia without a VPN)
