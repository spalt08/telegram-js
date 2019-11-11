import { BehaviorSubject, Subject } from 'rxjs';
import loginPassword from './login_password';

function passwordSendMock(password: string, callback: (error: string | null) => void) {
  console.log('Mock password sent', password);

  if (password.length < 5) {
    callback('Invalid Password');
    return;
  }

  setTimeout(() => {
    callback(null);
  }, 1000);
}

export default function loginPasswordContainer() {
  const isSubmitting = new BehaviorSubject(false);
  const passwordError = new Subject<string>();

  return loginPassword({
    isSubmitting,
    passwordError,
    onSubmit(code) {
      isSubmitting.next(true);
      passwordSendMock(code, (error) => {
        isSubmitting.next(false);
        if (error) {
          passwordError.next(error);
        }
      });
    },
  });
}
