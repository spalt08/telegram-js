import { list } from 'components/ui';
import { dialog as service } from 'services';
import dialog from './dialog/dialog';

export default function dialogs() {
  // fetch dialogs
  service.updateDialogs();

  return list({
    className: 'dialogs',
    items: service.dialogs,
    threshold: 800,
    batch: 10,
    renderer: (id: string) => dialog(id),
  });
}
