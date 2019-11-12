import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { div, form, h1, p, text } from 'core/html';
import { button, textInput } from 'components/ui';
import { blurAll, listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import '../login.scss';

/**
 * Layout for Sign UP
 */
export default function formProfile() {
  const isProcessing = new BehaviorSubject<boolean>(false);

  // Keep temp
  const firstNameFieldError = new BehaviorSubject<undefined | string>(undefined);
  const lastNameFieldError = new BehaviorSubject<undefined | string>(undefined);

  const inputFirstName = textInput({
    label: 'Name',
    autocomplete: 'given-name',
    error: firstNameFieldError,
    disabled: isProcessing,
    onChange() {
      if (firstNameFieldError.value !== undefined) {
        firstNameFieldError.next(undefined);
      }
    },
  });

  const inputLastName = textInput({
    label: 'Last Name (optional)',
    autocomplete: 'family-name',
    error: lastNameFieldError,
    disabled: isProcessing,
    onChange() {
      if (lastNameFieldError.value !== undefined) {
        lastNameFieldError.next(undefined);
      }
    },
  });

  // todo: Add photo uploader

  const element = (
    form`.login__form`(
      h1`.login__title`(text('Your Name')),
      p`.login__description`(text('Enter your name and add a profile picture')),
      div`.login__inputs`(
        inputFirstName,
        inputLastName,
        button({
          label: isProcessing.pipe(map((prcs: boolean) => (prcs ? 'Please wait...' : 'Start Messaging'))),
          disabled: isProcessing,
          loading: isProcessing,
        }),
      ),
    )
  );

  listen(element, 'submit', (event: Event) => {
    event.preventDefault();
    blurAll(element);

    if (!isProcessing.value) {
      isProcessing.next(true);

      const firstName = getInterface(inputLastName).getValue();
      const lastName = getInterface(inputLastName).getValue();

      console.log(firstName, lastName);
    }
  });

  return element;
}
