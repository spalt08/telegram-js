import { Peer, Update, SendMessageAction } from 'cache/types';
import { Subject, Observable, empty, BehaviorSubject } from 'rxjs';
import client from 'client/client';

type TypingState = {
  pendingActions: Record<number, SendMessageAction>,
  cancellationTokens: Record<number, ReturnType<typeof setTimeout>>,
  subject: Subject<Record<number, SendMessageAction>>,
};

export default class UserTyping {
  actionStates: Record<string, TypingState> = {};

  constructor() {
    client.updates.on('updateUserTyping', (update) => {
      this.notifyPeer(`user_${update.user_id}`, update);
    });

    client.updates.on('updateChatUserTyping', (update) => {
      this.notifyPeer(`chat_${update.chat_id}`, update);
    });
  }

  subscribe(peer: Peer): Observable<Record<number, SendMessageAction>> {
    switch (peer._) {
      case 'peerUser':
        return this.ensureState(`user_${peer.user_id}`).subject;
      case 'peerChat':
        return this.ensureState(`chat_${peer.chat_id}`).subject;
      case 'peerChannel':
        return this.ensureState(`chat_${peer.channel_id}`).subject;
      default:
        return empty();
    }
  }

  private notifyPeer(peerId: string, typing: Update.updateUserTyping | Update.updateChatUserTyping) {
    const state = this.ensureState(peerId);
    if (typing.action._ === 'sendMessageCancelAction') {
      delete state.pendingActions[typing.user_id];
      clearTimeout(state.cancellationTokens[typing.user_id]);
    } else {
      state.pendingActions[typing.user_id] = typing.action;
      state.cancellationTokens[typing.user_id] = setTimeout(() => {
        this.notifyPeer(peerId, { _: 'updateUserTyping', user_id: typing.user_id, action: { _: 'sendMessageCancelAction' } });
      }, 6000);
    }
    state.subject.next(state.pendingActions);
  }

  private ensureState(peerId: string) {
    let state = this.actionStates[peerId];
    if (!state) {
      this.actionStates[peerId] = state = { subject: new BehaviorSubject({}), pendingActions: [], cancellationTokens: [] };
    }
    return state;
  }
}
