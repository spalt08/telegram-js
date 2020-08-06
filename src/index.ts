import { withContextMenu } from 'components/global_context_menu';
import popup from 'components/popup/popup';
import { mount, unmount } from 'core/dom';
import 'styles/global.scss';
import './helpers/handlePromiseRejections';
import './polyfills';
import { router } from './router';

const loadingPlaceholder = document.querySelector('.appLoading');
if (loadingPlaceholder) {
  unmount(loadingPlaceholder);
}

mount(document.body, router.element);
mount(document.body, popup());
withContextMenu(document.body);

// disable ios zooming
document.addEventListener('gesturestart', (event: Event) => {
  event.preventDefault();
});
