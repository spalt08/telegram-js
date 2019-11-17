import './polyfills';
import * as routes from 'components/routes';
import { mount, unmount } from 'core/dom';
import { auth } from 'services';
import { Router, history } from './router';
import 'styles/global.scss';
import 'styles/app_loading.scss';

const loadingPlaceholder = document.querySelector('.appLoading');
if (loadingPlaceholder) {
  unmount(loadingPlaceholder);
}

// todo: check user login and redirect him
if (auth.state.value !== 'authorized' && history.state() !== 'sandbox') {
  history.push('/login');
} else {
  history.push('/');
}

const router = new Router({
  '/': routes.home,
  '/login': routes.login,
  default: routes.login,
});

mount(document.body, router.element);

// todo: Check in IE 11 and add required polyfills
// todo: Fix SVGs in IE
// todo: Check that the app works from a subdirectory
