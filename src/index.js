// @flow

import * as routes from 'components/routes';
import { Router } from './router';

const router = new Router({
  '/login': routes.login,
  default: routes.login,
});

router.mount(document.body);
