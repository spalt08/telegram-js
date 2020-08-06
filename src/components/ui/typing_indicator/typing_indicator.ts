import { span, text } from 'core/html';
import { Peer, SendMessageAction, User } from 'mtproto-js';
import { userTyping } from 'services';
import { unmountChildren, mount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { userCache } from 'cache';

function actionToString(action: SendMessageAction) {
  switch (action._) {
    case 'sendMessageTypingAction': return 'typing';
    case 'sendMessageRecordRoundAction':
    case 'sendMessageRecordVideoAction': return 'recording video';
    case 'sendMessageUploadRoundAction':
    case 'sendMessageUploadVideoAction': return 'uploading video';
    case 'sendMessageRecordAudioAction': return 'recording audio';
    case 'sendMessageUploadAudioAction': return 'uploading audio';
    case 'sendMessageUploadPhotoAction': return 'uploading photo';
    case 'sendMessageUploadDocumentAction': return 'uploading document';
    case 'sendMessageGeoLocationAction': return 'sharing location';
    default: return 'typing';
  }
}

export default function typingIndicator(peer: Peer, className: string, ...children: Node[]) {
  const childrenContainer = span(...children);
  const container = span`.typingIndicator${className}`(childrenContainer);

  const typings = userTyping.subscribe(peer);

  useObservable(container, typings, false, (actions) => {
    const activeUserIds = actions ? Object.keys(actions).map((id) => +id) : [];
    if (activeUserIds.length > 0) {
      unmountChildren(container);
      if (peer._ === 'peerUser') {
        mount(container, span`.typingIndicator__typing`(text(`${actionToString(actions[activeUserIds[0]])}...`)));
      } else if (activeUserIds.length === 1) {
        const user = (userCache.get(activeUserIds[0]) as User.user)?.first_name ?? 'Someone';
        mount(container, span`.typingIndicator__typing`(span(text(user)), text(` is ${actionToString(actions[activeUserIds[0]])}...`)));
      } else if (activeUserIds.length === 2) {
        const user1 = (userCache.get(activeUserIds[0]) as User.user)?.first_name ?? '';
        const user2 = (userCache.get(activeUserIds[1]) as User.user)?.first_name ?? '';
        mount(container, span`.typingIndicator__typing`(
          span(text(user1)),
          text(', '),
          span(text(user2)),
          text(' are typing...')));
      } else {
        mount(container, span`.typingIndicator__typing`(
          text(`${activeUserIds.length} users are typing...`)));
      }
    } else {
      unmountChildren(container);
      mount(container, childrenContainer);
    }
  });

  return container;
}
