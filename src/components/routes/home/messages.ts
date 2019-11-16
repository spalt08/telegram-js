import { div } from 'core/html';
import { message as service } from 'services';
import message from 'components/message/message';
import { list } from 'components/ui';

export default function messages() {
  // todo: Add loading placeholder

  return (
    div`.messages`(
      list({
        className: 'messages__history',
        items: service.history,
        threshold: 1000,
        batch: 100,
        renderer: (id: number) => message(id, service.activePeer.value!),
      }),
    )
  );
}
