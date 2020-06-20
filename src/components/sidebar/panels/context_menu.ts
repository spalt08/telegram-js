import { Message } from 'mtproto-js';
import { message, main } from 'services';
import { eye1 } from 'components/icons';
import { useContextMenu } from 'components/global_context_menu';

export default function contextMenu(element: HTMLElement, msg: Message.message) {
  useContextMenu(element, [{
    icon: () => eye1(),
    label: 'Go To Message',
    onClick: () => {
      if (main.isMobile) {
        main.closeSidebar();
      }
      message.selectPeer(msg.to_id, msg.id);
    },
  }]);
  return element;
}
