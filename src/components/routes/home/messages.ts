import { div } from 'core/html';
import { message as service } from 'services';
import message from 'components/message/message';
import { list } from 'components/ui';
import header from './header/header';

export default function messages() {
  // todo: Add loading placeholder

  return (
    div`.messages`(
      header(),
      list({
        className: 'messages__history',
        items: service.history,
        reversed: true,
        threshold: 800,
        batch: 30,
        renderer: (id: number) => message(id, service.activePeer.value!),
      }),
    )
  );
}
