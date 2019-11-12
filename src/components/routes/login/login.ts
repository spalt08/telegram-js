import { div } from 'core/html';
import { auth } from 'services';
import LoginTransition from './transition';
import formWelcome from './forms/welcome';
import formCode from './forms/code';
import './login.scss';

/**
 * Handler for route /login
 */
export default function login() {
  const transitionController = new LoginTransition();
  let currentView = '';

  const views: Record<string, () => HTMLElement> = {
    unathorized: formWelcome,
    code: formCode,
  };


  // Manage transitions
  auth.state.subscribe((view: string) => {
    const prevView = currentView;
    currentView = view;

    if (prevView === '') {
      transitionController.set(views[view] || formWelcome);
      return;
    }

    if (view === 'code') {
      transitionController.translateRight(views[view]);
      return;
    }

    if (view === 'unathorized') {
      transitionController.translateLeft(views[view]);
      return;
    }

    transitionController.translateRight(views[view]);
  });

  return div`.login`(
    transitionController.element,
  );
}
