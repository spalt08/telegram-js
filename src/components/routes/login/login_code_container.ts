import { BehaviorSubject, Subject } from 'rxjs';
import loginCode from './login_code';

function codeSendMock(code: string, callback: (error: string | null) => void) {
  if (code.length < 5) {
    callback('Invalid Code');
    return;
  }

  setTimeout(() => {
    callback(null);
  }, 2000);
}

interface Props {
  phone: string;
}

export default function loginCodeContainer({ phone }: Props) {
  const isSubmitting = new BehaviorSubject(false);
  const codeError = new Subject<string>();

  return loginCode({
    phone,
    isSubmitting,
    codeError,
    onSubmit(code) {
      isSubmitting.next(true);
      codeSendMock(code, (error) => {
        isSubmitting.next(false);
        if (error) {
          codeError.next(error);
        } else {
          console.log('Code sent', code);
        }
      });
    },
  });
}
