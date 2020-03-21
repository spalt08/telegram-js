import { div, text } from 'core/html';
import './search_result.scss';

interface Props extends Record<string, any> {
  className?: string;
}

// todo: Implement the mock
export default function search_result({ className = '', ...props }: Props = {}) {
  return (
    div`.globalSearchResult ${className}`(
      props,
      text(
        // eslint-disable-next-line prefer-template
        Math.random()
        + ' Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras ac massa egestas, interdum tellus ut, congue urna. Donec tincidunt metus'
        + ' sed vehicula varius. Cras congue iaculis libero, sit amet tincidunt justo blandit nec. Cras aliquet, dolor vitae luctus accumsan, arcu'
        + ' metus venenatis ante, ac pretium risus purus eget quam. Pellentesque vitae mollis arcu. Vivamus eget dignissim nisl. Nam sodales dolor'
        + ' nibh, non feugiat neque consequat quis. Morbi et urna libero.',
      ),
    )
  );
}
