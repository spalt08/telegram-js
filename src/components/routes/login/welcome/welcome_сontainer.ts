/* eslint-disable @typescript-eslint/no-use-before-define */
import { BehaviorSubject, Subject } from 'rxjs';
import { ClientError, TLAbstract } from 'mtproto-js';
import { Country } from 'const/country';
import { unformatWithCountry } from 'helpers/phone_number';
import client from 'client/client';
import { API_ID, API_HASH } from 'const/api';
import welcomeForm from './welcome';

interface Props {
  onCode(phone: string, hash: string): void;
  onRegister(phone: string): void;
}

export default function welcomeController({ onCode }: Props) {
  const isSubmitting = new BehaviorSubject(false);
  const phoneError = new Subject<string>();

  const handleSubmit = (country: Country, number: string, _remember: boolean) => {
    isSubmitting.next(true);

    const phone = unformatWithCountry(country, number);

    client.call('auth.sendCode', {
      phone_number: phone,
      api_id: API_ID,
      api_hash: API_HASH,
      settings: {},
    }, (err: ClientError | null, res: TLAbstract) => {
      if (err && err.code === 400) {
        phoneError.next(err.message);
        isSubmitting.next(false);
        return;
      }

      const result = res.json();

      if (result._ === 'auth.sentCode') {
        onCode(phone, result.phone_code_hash);
      }
    });
  };


  return welcomeForm({
    isSubmitting,
    phoneError,
    onSubmit: handleSubmit,
  });
}
