import './polyfills';
import { mount, unmount } from 'core/dom';
import popup from 'components/popup/popup';
import { router } from './router';
import 'styles/global.scss';

const loadingPlaceholder = document.querySelector('.appLoading');
if (loadingPlaceholder) {
  unmount(loadingPlaceholder);
}

mount(document.body, router.element);
mount(document.body, popup());
