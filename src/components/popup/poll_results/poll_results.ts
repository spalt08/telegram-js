import { Poll, Peer, Message, MessageUserVote } from 'mtproto-js';
import { peerToInputPeer } from 'cache/accessors';
import { div, text } from 'core/html';
import { listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import client from 'client/client';
import { userCache, messageCache } from 'cache';
import { peerMessageToId } from 'helpers/api';
import popupCommon from '../popup_common';
import pollResultOption from './poll_result_option';

import './poll_results.scss';

export type PollResultsContext = {
  peer: Peer,
  message: Message.message,
  poll: Poll,
};

const decoder = new TextDecoder();

export default function pollResultsPopup({ peer, message, poll }: PollResultsContext) {
  // const loader = materialSpinner({ className: 'pollResultsPopup__loading' });
  const close = div`.popup__close`();
  const options = new Map(poll.answers.map((answer) => [
    decoder.decode(answer.option),
    pollResultOption(answer.option, answer.text, poll.quiz ?? false),
  ]));
  const content = div`.popup__content.pollResultsPopup`(
    div`pollResultsPopup__question`(text(poll.question)),
    div`pollResultsPopup__options`(...options.values()),
    // loader,
  );
  const container = popupCommon(
    div`.popup__header`(
      div`.popup__title`(text(poll.quiz ? 'Quiz Results' : 'Poll Results')),
      close,
    ),
    content,
  );

  listen(close, 'click', getInterface(container).remove);

  const updateOptions = (msg?: Message) => {
    if (msg?._ === 'message' && msg.media?._ === 'messageMediaPoll' && msg.media.results.results) {
      const totalVoters = msg.media.results.total_voters ?? 0;
      msg.media.results.results.forEach((pollResult) => {
        const option = options.get(decoder.decode(pollResult.option));
        if (option) {
          getInterface(option).setVoters(pollResult.voters, totalVoters);
        }
      });
    }
  };

  messageCache.watchItem(peerMessageToId(peer, message.id), (msg) => {
    updateOptions(msg);
  });

  updateOptions(message);

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
    options.forEach((option, key) => {
      if (!selectedOption || key === selectedOption) {
        const voted = votedOptions.has(key);
        getInterface(option).setVoter(vote.user_id, voted);
      }
    });
  };

  async function loadData() {
    for (let index = 0; index < poll.answers.length; index++) {
      const answer = poll.answers[index];
      const request = {
        peer: peerToInputPeer(peer),
        id: message.id,
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

  return container;
}
