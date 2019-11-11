/* eslint-disable @typescript-eslint/no-use-before-define */
import { BehaviorSubject, Subject } from 'rxjs';
import { Country } from 'const/country';
import { formatWithCountry, unformatWithCountry } from 'helpers/phone_number';
import loginWelcome from './login_welcome';
import client from 'client/client';

function loginMock(phone: string, remember: boolean, callback: (error: string | null) => void) {
  console.log('Mock login', phone, remember);

  if (phone.length < 5) {
    callback('Invalid Phone Number');
    return;
  }

  setTimeout(() => {
    callback(null);
  }, 1000);
}

interface Props {
  onRedirectToCode(phone: string): void;
}

export default function loginWelcomeContainer({ onRedirectToCode }: Props) {
  const isSubmitting = new BehaviorSubject(false);
  const phoneError = new Subject<string>();

  client.call('help.getNearestDc', {});

  return loginWelcome({
    isSubmitting,
    phoneError,
    onSubmit(phoneCountry: Country, phoneNumber: string, remember: boolean): void {
      isSubmitting.next(true);
      loginMock(unformatWithCountry(phoneCountry, phoneNumber), remember, (error) => {
        isSubmitting.next(false);
        if (error) {
          phoneError.next(error);
        } else {
          onRedirectToCode(formatWithCountry(phoneCountry, phoneNumber));
        }
      });
    },
  });
}
