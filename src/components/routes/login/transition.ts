import Component from 'core/component';

type Props = {
  className?: string,
};

export default class LoginTransition extends Component<HTMLDivElement> {
  constructor({ className = '' }: Props) {
    super('div', { className });
  }
}
