import { input, label } from 'core/html';
import * as icons from 'components/icons';
import { useInterface } from 'core/hooks';
import './checkbox.scss';

interface Props {
  checked?: boolean;
  className?: string;
  onChange?(checked: boolean): void;
}

/**
 * A single styled checkbox
 */
export default function checkbox({ checked, className = '', onChange }: Props = {}) {
  const inputEl = input`.checkbox__input`({
    type: 'checkbox',
    checked,
    onChange() {
      if (onChange) {
        onChange(inputEl.checked);
      }
    },
  });
  const element = label`.checkbox ${className}`(
    inputEl,
    icons.checkboxon({ className: 'checkbox__on' }),
    icons.checkboxempty({ className: 'checkbox__off' }),
  );

  return useInterface(element, {
    getChecked() {
      return inputEl.checked;
    },
    setChecked(newChecked: boolean) {
      inputEl.checked = newChecked;
    },
  });
}
