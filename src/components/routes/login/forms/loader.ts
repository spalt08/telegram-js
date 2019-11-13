import { div } from 'core/html';
import { materialSpinner } from 'components/icons';
import '../login.scss';

export default function loading() {
  return (
    div`.login__loader`(
      materialSpinner({ class: 'login__loader_spin' }),
    )
  );
}
