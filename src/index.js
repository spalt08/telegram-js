// @flow

import * as routes from 'components/routes';
import { Router } from './router';
import { mount } from 'core/dom';
import 'styles/global.scss';

const router = new Router({
  '/login': routes.login,
  default: routes.login,
});

window.onload = () => document.body && mount(document.body, router);
