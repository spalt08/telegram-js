import { list } from 'components/ui';
import { dialog as service } from 'services';
import dialog from './dialog/dialog';

export default function dialogs() {
  // fetch dialogs
  service.updateDialogs();

  // todo: Add loading placeholder
  // todo: Add offline status badge
  // todo: Hide archived dialogs

  return list({
    className: 'dialogs',
    items: service.dialogs,
    threshold: 300,
    batch: 10,
    renderer: (id: string) => dialog(id),
  });
}