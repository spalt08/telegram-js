import { BehaviorSubject } from 'rxjs';
import { Country } from 'const/country';
import client from 'client/client';
import { API_HASH, API_ID } from 'const/api';

/**
 * Singleton service class for handling auth flow
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

  /** Password input error */
  errPassword = new BehaviorSubject<undefined | string>(undefined);

  /** Phone hash for signIn request */
  phoneHash: string = '';

  /** Received code type */
  codeType: string = '';

  /** Passwork KDF algo */
  passwordAlgo?: any;

  constructor() {
    this.state = new BehaviorSubject('unathorized');
  }

  /**
   * Sends verification code for promted phone number
   * @mtproto auth.sendCode
   */
  sendCode(phoneNumber: string, cb: () => void) {
    this.phoneNumber.next(phoneNumber);

    this.state.next('code');
    // const payload = {
    //   phone_number: phoneNumber,
    //   api_id: API_ID,
    //   api_hash: API_HASH,
    //   settings: {},
    // };

    // client.call('auth.sendCode', payload, (err, res) => {
    //   if (err && err.type === 'network') { cb(); return; }

    //   if (err) {
    //     // Should use another DC
    //     if (err.message && err.message.indexOf('PHONE_MIGRATE_') > -1) {
    //       client.cfg.dc = +err.message.slice(-1);
    //       this.sendCode(phoneNumber, cb);

    //     // Display error message
    //     } else {
    //       this.errPhone.next(err.message);
    //       cb();
    //     }
    //     return;
    //   }

    //   if (!res) return;

    //   const result = res.json();

    //   // Success
    //   if (result._ === 'auth.sentCode') {
    //     this.phoneHash = result.phone_code_hash;
    //     this.codeType = result.type._;
    //     this.state.next('code');
    //   }
    // });
  }

  /**
   * Tries to sign in without 2FA
   * @mtproto auth.signIn
   */
  checkCode(code: string, cb: () => void) {
    this.state.next('2fa');
    // const payload = {
    //   phone_number: this.phoneNumber.value,
    //   phone_code_hash: this.phoneHash,
    //   phone_code: code,
    // };

    // client.call('auth.signIn', payload, (err, res) => {
    //   if (err && err.type === 'network') { cb(); return; }

    //   // Should use 2FA authorization
    //   if (err && err.message === 'SESSION_PASSWORD_NEEDED') {
    //     this.state.next('2fa');

    //     this.getPasswordAlgo();
    //     return;
    //   }

    //   // Display error message
    //   if (err && err.code === 400) {
    //     this.errCode.next(err.message);
    //     cb();
    //     return;
    //   }

    //   if (!res) return;

    //   this.authorize(res.json());
    // });
  }

  /**
   * Fetch password KDF algo from server
   * @mtproto account.getPassword
   */
  getPasswordAlgo() {
    client.call('account.getPassword', {}, (err, algo) => {
      if (err || !algo) this.getPasswordAlgo();
      else this.passwordAlgo = algo.json();
    });
  }

  /**
   * Tries to sign in with 2FA
   * @mtproto auth.checkPassword
   */
  checkPassword(password: string, cb: () => void) {
    this.state.next('signup');
    // Wait for pwd algo fetch
    // if (!this.passwordAlgo) {
    //   setTimeout(() => this.checkPassword(password, cb), 100);
    //   return;
    // }

    // client.getPasswordKdfAsync(this.passwordAlgo, password, (ip) => {
    //   client.call('auth.checkPassword', { password: ip }, (err, res) => {
    //     if (err && err.type === 'network') { cb(); return; }

    //     // Display error message
    //     if (err) {
    //       this.errPassword.next(err.message);
    //       return;
    //     }

    //     if (!res) return;

    //     this.authorize(res.json());
    //   });
    // });
  }

  authorize(response: any) {
    console.log(response);
  }
}
