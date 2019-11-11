import { BehaviorSubject, Subject } from 'rxjs';
import { ClientError, TLAbstract } from 'mtproto-js';
import client from 'client/client';
import loginCode from './code';

interface Props {
  phone: string;
  hash: string,
  onRedirectToPassword(): void;
  onReturnToPhone(): void;
}

export default function loginCodeContainer({ phone, hash, onReturnToPhone }: Props) {
  const isSubmitting = new BehaviorSubject(false);
  const codeError = new Subject<string>();

  const handleSubmit = (code: string) => {
    isSubmitting.next(true);

    client.call('auth.signIn', {
      phone_number: phone,
      phone_code_hash: hash,
      phone_code: code,
    }, (err: ClientError, res: TLAbstract) => {
      if (err && err.code === 400) {
        codeError.next(err.message);
        isSubmitting.next(false);
        return;
      }

      console.log(res.json());
    });
  };

  return loginCode({
    phone,
    isSubmitting,
    codeError,
    onSubmit: handleSubmit,
    onReturnToPhone,
  });
}
