import { MessageService } from 'cache/types';
import { div, strong, text } from 'core/html';
import { useUser } from 'cache/hooks';

export default function serviceMessage(msg: MessageService) {

  if (msg.action._ === 'messageActionChatCreate') {
    const user = useUser(msg.from_id);

    return (
      div`.msgsvc`(
        strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
        text(' created the group '),
        strong(text(msg.action.title)),
      )
    );
  }

  if (msg.action._ === 'messageActionChatEditPhoto') {
    const user = useUser(msg.from_id);

    return (
      div`.msgsvc`(
        strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
        text(' updated group photo'),
      )
      // todo display photo
    );
  }

  console.log(msg);

  // todo null element
  return text('');
}
