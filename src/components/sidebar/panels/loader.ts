import { div } from 'core/html';
import { materialSpinner } from 'components/icons';
import './loader.scss';

export function panelLoader() {
  return div`.panelLoader`(materialSpinner());
}
