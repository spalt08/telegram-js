import { div } from 'core/html';
import { sectionSpinner } from 'components/ui';
import '../login.scss';

export default function loading() {
  return (
    div`.login__loader`(
      sectionSpinner({ className: 'login__loader_spin' }),
    )
  );
}
