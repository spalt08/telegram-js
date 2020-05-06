import { Poll, PollResults } from 'mtproto-js';
import { div, text } from 'core/html';
import { mount } from 'core/dom';

export default function poll(pollData: Poll.poll, results: PollResults.pollResults) {
  const element = div`.poll`(
    div`.poll-question`(text(pollData.question)),
  );
  pollData.answers.forEach((a) => mount(element, text(a.text)));

  return element;
}
