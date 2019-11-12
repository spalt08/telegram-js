import { BehaviorSubject } from 'rxjs';
import { Country } from 'const/country';
import client from 'client/client';
import { API_HASH, API_ID } from 'const/api';

/**
 * Service class for handling auth flow
 */
export default class AuthServie {
  /** Login state: welcome, code, password etc. */
  state: BehaviorSubject<string>;

  /** Phone input error */
  phoneNumber = new BehaviorSubject<undefined | string>(undefined);

  /** Selected country */
  phoneCountry = new BehaviorSubject<Country>({
    code: '',
    emoji: '',
    label: '',
    phone: '',
  });

  /** Phone input error */
  errPhone = new BehaviorSubject<undefined | string>(undefined);

  /** Code input error */
  errCode = new BehaviorSubject<undefined | string>(undefined);

  phoneHash: string = '';

  constructor() {
    this.state = new BehaviorSubject('unathorized');
  }

  sendCode(phoneNumber: string, cb: () => void) {
    this.phoneNumber.next(phoneNumber);

    const payload = {
      phone_number: phoneNumber,
      api_id: API_ID,
      api_hash: API_HASH,
      settings: {},
    };

    client.call('auth.sendCode', payload, (err, res) => {
      if (err && err.code === 400) {
        this.errPhone.next(err.message);
        cb();
        return;
      }

      if (!res) return;

      const result = res.json();

      if (result._ === 'auth.sentCode') {
        this.phoneHash = result.phone_code_hash;
        this.state.next('code');
      }
    });
  }

  checkCode(code: string, cb: () => void) {
    const payload = {
      phone_number: this.phoneNumber.value,
      phone_code_hash: this.phoneHash,
      phone_code: code,
    };

    client.call('auth.signIn', payload, (err, res) => {
      if (err && err.code === 400) {
        this.errCode.next(err.message);
        cb();
        return;
      }

      if (!res) return;

      console.log(res.json());
    });
  }
}
