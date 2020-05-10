/* eslint-disable no-param-reassign */
import { MethodDeclMap, PollResults, PollAnswerVoters, MessageEntity } from 'mtproto-js';
import { users } from './user';
import { chats } from './chat';
import { mockDialogForPeers } from './dialog';
import { mockHistorySlice, mockHistorySearch } from './history';

type Callback<T extends keyof MethodDeclMap> = (err: any, result: MethodDeclMap[T]['res']) => void;

function timeout<T extends keyof MethodDeclMap>(delay: number, cb: Callback<T>, result: MethodDeclMap[T]['res']) {
  setTimeout(() => cb(null, result), delay);
}

function shuffle(a: any[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function callMock<T extends keyof MethodDeclMap>(method: T, params: MethodDeclMap[T]['req'],
  headers: Record<string, any>, cb: Callback<T>) {
  switch (method) {
    case 'auth.sendCode':
      timeout(100, cb, {
        _: 'auth.sentCode',
        type: { _: 'auth.sentCodeTypeApp' },
        phone_code_hash: 'hash',
      });
      break;

    case 'messages.getDialogs': {
      const { dialogs, messages } = mockDialogForPeers(shuffle([...users, ...chats]));

      timeout<T>(100, cb, {
        _: 'messages.dialogs',
        dialogs,
        messages,
        chats,
        users,
      });
      break;
    }

    case 'messages.getHistory': {
      const { peer, limit, offset_id } = params as MethodDeclMap['messages.getHistory']['req'];
      const { count, messages } = mockHistorySlice(limit, offset_id, peer);

      timeout<T>(100, cb, {
        _: 'messages.messagesSlice',
        messages,
        chats,
        users,
        count,
      });

      break;
    }

    case 'messages.readHistory':
      timeout<T>(100, cb, {
        _: 'messages.AffectedMessages',
        pts: 0,
        pts_count: 0,
      });
      break;

    case 'messages.sendVote': {
      const { options } = params as MethodDeclMap['messages.sendVote']['req'];
      const selectedOption = new Uint8Array(options[0])[0];
      const pollAnswerVoters1 = Math.round(Math.random() * 100);
      const pollAnswerVoters2 = Math.round(Math.random() * 100);
      const pollAnswerVoters3 = Math.round(Math.random() * 100);
      const result = {
        _: 'updates',
        updates: [
          {
            _: 'updateMessagePoll',
            poll_id: '1',
            results: {
              _: 'pollResults',
              results: [
                {
                  _: 'pollAnswerVoters',
                  chosen: selectedOption === 0,
                  correct: false,
                  option: new Int8Array([0]).buffer,
                  voters: pollAnswerVoters1,
                },
                {
                  _: 'pollAnswerVoters',
                  chosen: selectedOption === 1,
                  correct: true,
                  option: new Int8Array([1]).buffer,
                  voters: pollAnswerVoters2,
                },
                {
                  _: 'pollAnswerVoters',
                  chosen: selectedOption === 2,
                  correct: false,
                  option: new Int8Array([2]).buffer,
                  voters: pollAnswerVoters3,
                },
              ] as PollAnswerVoters[],
              total_voters: pollAnswerVoters1 + pollAnswerVoters2 + pollAnswerVoters3,
              recent_voters: [],
              solution: 'string',
              solution_entities: [] as MessageEntity[],
            } as PollResults,
          },
        ],
      };
      timeout<T>(1000, cb, result);
      break;
    }

    case 'messages.search': {
      const { peer, filter, limit, offset_id } = params as MethodDeclMap['messages.search']['req'];
      const { count, messages } = mockHistorySearch(limit, offset_id, filter, peer);

      timeout<T>(500, cb, {
        _: 'messages.messagesSlice',
        messages,
        chats,
        users,
        count,
      });
      break;
    }

    default:
      console.log('unmocked call', method, params);
      cb({ type: 'network', code: 100 }, undefined);
  }
}
