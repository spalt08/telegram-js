import { messageCache } from 'cache';
import * as icons from 'components/icons';
import { heading } from 'components/ui';
import { div, text } from 'core/html';
import { peerMessageToId } from 'helpers/api';
import { Peer } from 'mtproto-js';
import './poll_results.scss';
import pollResultOption from './poll_result_option';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

const decoder = new TextDecoder();

export default function pollResults({ onBack }: SidebarComponentProps, context: { peer: Peer, messageId: number }) {
  const messageId = peerMessageToId(context.peer, context.messageId);
  const message = messageCache.get(messageId);
  if (message?._ !== 'message' || message.media?._ !== 'messageMediaPoll') {
    throw new Error('message media must be of type "messageMediaPoll"');
  }

  const { poll } = message.media;

  const options = new Map(poll.answers.map((answer) => [
    decoder.decode(answer.option),
    pollResultOption(answer.option, answer.text, poll.quiz ?? false),
  ]));
  const content = div`.popup__content.pollResultsPopup`(
    div`pollResultsPopup__question`(text(poll.question)),
    div`pollResultsPopup__options`(...options.values()),
  );

  const rootEl = div`.pollResults`(
    heading({
      title: 'Results',
      buttons: [
        { icon: icons.close, position: 'left', onClick: () => onBack && onBack() },
      ],
    }),
    content,
  );

  return rootEl;
}
