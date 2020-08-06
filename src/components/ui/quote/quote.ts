import { div, text, nothing } from 'core/html';
import './quote.scss';

export default function quote(title: string | Node, content: string | Node, extra: Node = nothing) {
  return (
    div`.quote`(
      extra,
      div`.quote__content`(
        div`.quote__title`(typeof title === 'string' ? text(title) : title),
        div`.quote__message`(typeof content === 'string' ? text(content) : content),
      ),
    )
  );
}
