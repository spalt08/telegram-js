import * as routes from 'components/routes';
import { mount } from 'core/dom';
import { Router } from './router';
import 'styles/global.scss';

const router = new Router({
  '/login': routes.login,
  default: routes.login,
});

window.addEventListener('load', () => {
  mount(document.body, router);
});
