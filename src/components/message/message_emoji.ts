import { div, text } from 'core/html';
import { datetime } from 'components/ui';
import './message_emoji.scss';

export default function emojiMessage(message: string, timestamp: number) {
  return (
    div`.emoji`(
      div`.emoji__content${`e${message.length / 2}`}`(text(message)),
      div`.message__date`(
        datetime({ timestamp, date: false }),
      ),
    )
  );
}
