import { Message } from 'mtproto-js';
import { message, main } from 'services';
import { message as messageIcon } from 'components/icons';
import { useContextMenu } from 'components/global_context_menu';

export default function contextMenu(element: HTMLElement, msg: Message.message) {
  useContextMenu(element, [{
    icon: () => messageIcon(),
    label: 'Show Message',
    onClick: () => {
      if (main.isMobile) {
        main.closeSidebar();
      }
      message.selectPeer(msg.to_id, msg.id);
    },
  }]);
  return element;
}
