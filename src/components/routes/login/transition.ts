import { Component } from 'core/dom';

type Props = {
  className?: string,
};

export default class LoginTransition extends Component<HTMLDivElement> {
  constructor({ className = '' }: Props) {
    super('div', { className });
  }
}
