import { list } from 'components/ui';
import { dialog as service } from 'services';
import dialog from './dialog/dialog';

export default function dialogs() {
  // fetch dialogs
  service.getDialogs();

  return list({
    className: 'dialogs',
    items: service.sequence,
    renderer: (id: string) => dialog(id),
  });
}
