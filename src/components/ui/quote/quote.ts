import { div, text } from 'core/html';
import './quote.scss';

type Props = {
  className?: string,
};

export default function quote(title: string | Node, content: string | Node, props: Props = {}) {
  return (
    div`.quote${props.className}`(
      div`.quote__title`(typeof title === 'string' ? text(title) : title),
      div`.quote__message`(typeof content === 'string' ? text(content) : content),
    )
  );
}
