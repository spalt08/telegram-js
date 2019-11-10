/* eslint-disable @typescript-eslint/no-use-before-define */
import { BehaviorSubject, Subject } from 'rxjs';
import loginWelcome from './login_welcome';

function loginMock(phone: string, remember: boolean, callback: (error: string | null) => void) {
  if (phone.length < 5) {
    callback('Incorrect Phone Number');
    return;
  }

  setTimeout(() => {
    callback(null);
  }, 2000);
}

export default function loginWelcomeContainer(onRedirectToCode: () => void) {
  const isSubmitting = new BehaviorSubject(false);
  const phoneError = new Subject<string>();

  return loginWelcome({
    isSubmitting,
    phoneError,
    onSubmit(phone: string, remember: boolean): void {
      isSubmitting.next(true);
      loginMock(phone, remember, (error) => {
        isSubmitting.next(false);
        if (error) {
          phoneError.next(error);
        } else {
          onRedirectToCode();
        }
      });
    },
  });
}
