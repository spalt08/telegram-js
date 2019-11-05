// @flow

import Component from 'core/component';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { TextInput } from 'components/ui';
import './select_autocomplete.scss';

type Props = {
  onChange?: (value: string) => any;
  label?: string,
};

class SelectAutoComplete extends Component<HTMLDivElement> {
  input: HTMLDivElement;

  options: HTMLDivElement;

  constructor({ label = '' }: Props) {
    super();

    this.ref = div`.select`(
      this.input = TextInput({ label, onFocus: this.handleFocus, onBlur: this.handleBlur }),
    )();
  }

  handleFocus = () => {
    this.options = div`.select__options`(
      div`.select__option`('Russian Federation'),
      div`.select__option`('Russian Federation'),
      div`.select__option`('Russian Federation'),
      div`.select__option`('Russian Federation'),
      div`.select__option`('Russian Federation'),
      div`.select__option`('Russian Federation'),
      div`.select__option`('Russian Federation'),
      div`.select__option`('Russian Federation'),
    )();

    mount(this.ref, this.options);
  }

  handleBlur = () => {
    if (this.options) unmount(this.options);
  }
}

export default (props: Props) => () => new SelectAutoComplete(props);
