import * as routes from 'components/routes';
import { mount } from 'core/dom';
import { Router } from './router';
import 'styles/global.scss';

const router = new Router({
  '/login': routes.login,
  default: routes.login,
});

window.addEventListener('load', () => {
  mount(document.body, router.element);
});

// todo: Check in IE 11 and add required polyfills
