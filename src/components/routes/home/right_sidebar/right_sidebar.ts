import { div } from 'core/html';
import './right_sidebar.scss';
import infoPanel from './panels/info_panel';

export default function rightSidebar() {
  return (
    div`.right_sidebar`(infoPanel())
  );
}
