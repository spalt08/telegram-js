import { div } from 'core/html';
import { useObservable } from 'core/hooks';
import { auth, AuthStage } from 'services';
import LoginTransition from './transition';
import formWelcome from './forms/welcome';
import formCode from './forms/code';
import formProfile from './forms/profile';
import loading from './forms/loading';
import './login.scss';

/**
 * Handler for route /login
 */
export default function login() {
  const transitionController = new LoginTransition();
  let currentView: AuthStage | undefined;

  const element = div`.login`(
    transitionController.element,
  );

  // Manage transitions
  useObservable(element, auth.state, true, (view) => {
    const prevView = currentView;
    currentView = view;

    if (prevView === undefined) {
      transitionController.set(view === AuthStage.Authorized ? loading : formWelcome);
      return;
    }

    switch (view) {
      case AuthStage.Code:
        transitionController.translateRight(formCode);
        break;
      case AuthStage.Unauthorized:
        transitionController.translateLeft(formWelcome);
        break;
      case AuthStage.SignUp:
        transitionController.translateRight(formProfile);
        break;
      case AuthStage.Authorized:
        transitionController.translateRight(loading);
        break;
      default:
    }
  });

  return element;
}
