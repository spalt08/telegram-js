import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { text } from 'core/html';
import { userCache, chatCache } from 'cache';
import { Peer } from 'cache/types';
import { auth } from 'services';

const unknownTitle = 'Unknown';

export default function profileTitle(peer: Peer, isForDialogList = false) {
  const textNode = text(unknownTitle);
  let nameObservable: Observable<string> | undefined;

  switch (peer._) {
    case 'peerUser':
      nameObservable = userCache.useItemBehaviorSubject(textNode, peer.user_id)
        .pipe(map((user) => {
          if (!user) {
            return unknownTitle;
          }
          if (user.id === auth.userID && isForDialogList) {
            return 'Saved Messages';
          }
          return `${user.first_name} ${user.last_name}`;
        }));
      break;

    case 'peerChat':
      nameObservable = chatCache.useItemBehaviorSubject(textNode, peer.chat_id)
        .pipe(map((chat) => chat ? chat.title : unknownTitle));
      break;

    case 'peerChannel':
      nameObservable = chatCache.useItemBehaviorSubject(textNode, peer.channel_id)
        .pipe(map((chat) => chat ? chat.title : unknownTitle));
      break;

    default:
  }

  if (nameObservable) {
    nameObservable.subscribe((name) => {
      textNode.textContent = name;
    });
  }

  return textNode;
}
