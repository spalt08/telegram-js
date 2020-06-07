import { messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import client from 'client/client';
import * as icons from 'components/icons';
import { heading } from 'components/ui';
import { getInterface } from 'core/hooks';
import { div, text } from 'core/html';
import { messageToId, peerMessageToId } from 'helpers/api';
import { Message, MessageUserVote, Peer, Poll } from 'mtproto-js';
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

  const poll = message.media.poll as Required<Poll>;
  const optionsMap = new Map(poll.answers.map((answer) => {
    const optionKey = decoder.decode(answer.option);
    return [ optionKey, pollResultOption(answer.text, poll.quiz) ];
  }));
  const rootEl = div`.pollResults`(
    heading({
      title: 'Results',
      buttons: [
        { icon: icons.close, position: 'left', onClick: () => onBack && onBack() },
      ],
    }),
    div`.pollResults__content`(
      div`.pollResults__question`(text(poll.question)),
      div`.pollResults__options`(...optionsMap.values()),
    ),
  );

  const updateOptions = (msg?: Message) => {
    if (msg?._ === 'message' && msg.media?._ === 'messageMediaPoll' && msg.media.results.results) {
      const totalVoters = msg.media.results.total_voters ?? 0;
      msg.media.results.results.forEach((pollResult) => {
        const option = optionsMap.get(decoder.decode(pollResult.option));
        if (option) {
          getInterface(option).setVoters(pollResult.voters, totalVoters);
        }
      });
    }
  };

  messageCache.useItemBehaviorSubject(rootEl, messageToId(message)).subscribe((msg) => {
    updateOptions(msg);
  });
  
  const updateVote = (vote: MessageUserVote, selectedOption?: string) => {
    const votedOptions = new Set<string>();
    switch (vote._) {
      case 'messageUserVote':
        votedOptions.add(decoder.decode(vote.option));
        break;
      case 'messageUserVoteMultiple':
        vote.options.forEach((option) => votedOptions.add(decoder.decode(option)));
        break;
      case 'messageUserVoteInputOption':
        votedOptions.add(selectedOption!);
        break;
      default:
    }
    optionsMap.forEach((option, key) => {
      if (!selectedOption || key === selectedOption) {
        const voted = votedOptions.has(key);
        getInterface(option).setVoter(vote.user_id, voted);
      }
    });
  };

  // todo: fetch all votes. Now we only get first 50 voters per answer.
  async function loadData() {
    for (let index = 0; index < poll.answers.length; index++) {
      const answer = poll.answers[index];
      const request = {
        peer: peerToInputPeer(context.peer),
        id: message!.id,
        limit: 50,
        option: answer.option,
      };
      // eslint-disable-next-line no-await-in-loop
      const pollVotes = await client.call('messages.getPollVotes', request);
      userCache.put(pollVotes.users);
      pollVotes.votes.forEach((vote) => {
        updateVote(vote, decoder.decode(answer.option));
      });
    }
  }

  loadData();

  return rootEl;
}
