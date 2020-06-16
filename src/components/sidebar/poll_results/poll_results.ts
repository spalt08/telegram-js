import { messageCache } from 'cache';
import * as icons from 'components/icons';
import { heading } from 'components/ui';
import { mount, unmount } from 'core/dom';
import { getInterface, useMaybeObservable } from 'core/hooks';
import { div, text } from 'core/html';
import { MaybeObservable } from 'core/types';
import { messageToId, peerMessageToId } from 'helpers/api';
import { isPollMessage } from 'helpers/message';
import { Message, Peer, Poll } from 'mtproto-js';
import './poll_results.scss';
import pollResultOption from './poll_result_option';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

const decoder = new TextDecoder();

function pollResultsContent(peer: Peer, messageId: number) {
  const message = messageCache.get(peerMessageToId(peer, messageId));
  if (!isPollMessage(message)) {
    throw new Error('message media must be of type "messageMediaPoll"');
  }

  const poll = message.media.poll as Required<Poll>;
  const optionsMap = new Map(poll.answers.map((answer) => {
    const optionKey = decoder.decode(answer.option);
    return [optionKey, pollResultOption(message, answer.option)];
  }));
  const rootEl = div`.pollResults__content`(
    div`.pollResults__question`(text(poll.question)),
    div`.pollResults__options`(...optionsMap.values()),
  );

  const updateOptions = (msg?: Message) => {
    if (msg?._ === 'message' && msg.media?._ === 'messageMediaPoll' && msg.media.results.results) {
      const totalVoters = msg.media.results.total_voters ?? 0;
      msg.media.results.results.forEach((pollResult) => {
        const option = optionsMap.get(decoder.decode(pollResult.option));
        if (option) {
          getInterface(option).updateVotersCount(pollResult.voters, totalVoters);
        }
      });
    }
  };

  messageCache.useWatchItem(rootEl, messageToId(message), (msg) => {
    updateOptions(msg);
  });

  return rootEl;
}

export default function pollResults({ onBack }: SidebarComponentProps, context: MaybeObservable<{ peer: Peer, messageId: number }>) {
  const rootEl = div`.pollResults`(
    heading({
      title: 'Results',
      buttons: [
        { icon: icons.close, position: 'left', onClick: () => onBack && onBack() },
      ],
    }),
  );

  let content: Element | undefined;
  useMaybeObservable(rootEl, context, true, (newContext) => {
    if (content) {
      unmount(content);
    }
    content = pollResultsContent(newContext.peer, newContext.messageId);
    mount(rootEl, content);
  });

  return rootEl;
}
