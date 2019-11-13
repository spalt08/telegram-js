import { div } from 'core/html';
import { useObservable } from 'core/hooks';
import { auth } from 'services';
import LoginTransition from './transition';
import formWelcome from './forms/welcome';
import formCode from './forms/code';
import formProfile from './forms/profile';
import loader from './forms/loader';
import './login.scss';

/**
 * Handler for route /login
 */
export default function login() {
  const transitionController = new LoginTransition();
  let currentView = '';

  const element = div`.login`(
    transitionController.element,
  );

  // Manage transitions
  useObservable(element, auth.state, (view) => {
    const prevView = currentView;
    currentView = view;

    if (prevView === '') {
      transitionController.set(view === 'authorized' ? loader : formWelcome);
      return;
    }

    if (view === 'code') {
      transitionController.translateRight(formCode);
      return;
    }

    if (view === 'unauthorized') {
      transitionController.translateLeft(formWelcome);
    }

    if (view === 'signup') {
      transitionController.translateRight(formProfile);
    }

    if (view === 'authorized') {
      transitionController.translateRight(loader);
    }
  });

  return element;
}
