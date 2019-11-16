import { list } from 'components/ui';
import { dialog as service } from 'services';
import dialog from './dialog/dialog';

export default function dialogs() {
  // fetch dialogs
  service.updateDialogs();

  // todo: Add loading placeholder
  // todo: Add offline status badge
  // todo: Hide archived dialogs
  // todo: Highlight the selected dialog

  return list({
    className: 'dialogs',
    items: service.dialogs,
    threshold: 400,
    batch: 20,
    renderer: (id: string) => dialog(id),
  });
}
