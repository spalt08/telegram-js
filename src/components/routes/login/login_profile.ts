import { BehaviorSubject, Observable } from 'rxjs';
import { div, form, h1, p, text } from 'core/html';
import { button, textInput } from 'components/ui';
import { blurAll, listen } from 'core/dom';
import { getInterface, useObservable } from 'core/hooks';
import './login.scss';

interface Props {
  isSubmitting?: Observable<boolean>;
  firstNameError?: Observable<string>;
  lastNameError?: Observable<string>;
  onSubmit(firstName: string, lastName: string): void;
}

/**
 * Layout for entering SMS code for sign in
 */
export default function loginProfile({ isSubmitting, firstNameError, lastNameError, onSubmit }: Props) {
  const firstNameFieldError = new BehaviorSubject<undefined | string>(undefined);
  const lastNameFieldError = new BehaviorSubject<undefined | string>(undefined);

  const firstNameField = textInput({
    label: 'Name',
    autocomplete: 'given-name',
    error: firstNameFieldError,
    onChange() {
      if (firstNameFieldError.value !== undefined) {
        firstNameFieldError.next(undefined);
      }
    },
  });
  const lastNameField = textInput({
    label: 'Last Name (optional)',
    autocomplete: 'family-name',
    error: lastNameFieldError,
    onChange() {
      if (lastNameFieldError.value !== undefined) {
        lastNameFieldError.next(undefined);
      }
    },
  });

  const element = (
    form`.login__form`(
      h1`.login__title`(text('Your Name')),
      p`.login__description`(text('Enter your name and add a profile picture')),
      div`.login__inputs`(
        firstNameField,
        lastNameField,
        button({
          label: 'Next',
          disabled: isSubmitting,
          loading: isSubmitting,
        }),
      ),
    )
  );

  let isCurrentlySubmitting = false;
  if (isSubmitting) {
    useObservable(element, isSubmitting, (s) => { isCurrentlySubmitting = s; });
  }

  listen(element, 'submit', (event: Event) => {
    event.preventDefault();
    blurAll(element);
    if (!isCurrentlySubmitting) {
      onSubmit(
        getInterface(firstNameField).getValue(),
        getInterface(lastNameField).getValue(),
      );
    }
  });

  if (firstNameError) {
    useObservable(element, firstNameError, (errorMessage) => firstNameFieldError.next(errorMessage));
  }
  if (lastNameError) {
    useObservable(element, lastNameError, (errorMessage) => lastNameFieldError.next(errorMessage));
  }

  return element;
}
