import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { Country } from 'const/country';
import client from 'client/client';
import { API_HASH, API_ID } from 'const/api';
import { unformat } from 'helpers/phone';
import { upload } from 'client/media';
import {
  AuthSendCode,
  AuthCheckPassword,
  AuthSentCode,
  AuthAuthorization,
  AccountPassword,
} from 'client/schema';

export const enum AuthStage {
  Unauthorized,
  Code,
  Password,
  Authorized,
  SignUp,
  TwoFA,
}

/**
 * Singleton service class for handling auth flow
 */
export default class AuthService {
  /** Login state */
  readonly state = new BehaviorSubject<AuthStage>(AuthStage.Unauthorized);

  /** Phone input error */
  readonly phoneNumber = new BehaviorSubject<undefined | string>(undefined);

  /** Selected country */
  readonly phoneCountry = new BehaviorSubject<Country>({
    code: '',
    emoji: '',
    label: '',
    phone: '',
  });

  /** Phone input error */
  readonly errPhone = new BehaviorSubject<undefined | string>(undefined);

  /** Code input error */
  readonly errCode = new BehaviorSubject<undefined | string>(undefined);

  /** Password input error */
  readonly errPassword = new BehaviorSubject<undefined | string>(undefined);

  /** First name input error */
  readonly errFirstName = new BehaviorSubject<undefined | string>(undefined);

  /** Last name input error */
  readonly errLastName = new BehaviorSubject<undefined | string>(undefined);

  /** Received code type */
  codeType: string = '';

  profilePhoto?: File;

  userID: number = 0;

  /** Phone hash for signIn request */
  protected phoneHash: string = '';

  /** Passwork KDF algo */
  protected passwordAlgo?: AccountPassword;

  constructor() {
    const uid = client.getUserID();
    if (uid && uid > 0) {
      this.userID = +uid;
      this.state.next(AuthStage.Authorized);
    }

    this.state
      .pipe(
        map((state) => state === AuthStage.Authorized),
        distinctUntilChanged(),
        filter((isAuthorized) => isAuthorized),
      )
      .subscribe(() => {
        client.callAsync('account.updateStatus', { offline: false });
      });
  }

  /**
   * Sends verification code for promted phone number
   * @mtproto auth.sendCode
   */
  async sendCode(phoneNumber: string, remember: boolean) {
    this.phoneNumber.next(phoneNumber);

    if (!remember) {
      client.storage = window.sessionStorage;
    }

    const payload: AuthSendCode = {
      phone_number: unformat(this.phoneCountry.value.phone) + phoneNumber,
      api_id: API_ID,
      api_hash: API_HASH,
      settings: { _: 'codeSettings' },
    };
    let result: AuthSentCode;

    try {
      result = await client.callAsync('auth.sendCode', payload);
    } catch (err) {
      if (err.type === 'network') {
        if (err.message && (err.message.indexOf('400') || err.code === 1006)) {
          client.svc.meta = {};
        }

        this.errPhone.next('NETWORK_ERROR');

        // Should use another DC
      } else if (err.message && err.message.indexOf('PHONE_MIGRATE_') > -1) {
        client.setBaseDC(+err.message.slice(-1));

        await this.sendCode(phoneNumber, remember);

        // Display error message
      } else if (err.message === 'AUTH_RESTART') {
        await this.sendCode(phoneNumber, remember);
      } else {
        this.errPhone.next(err.message);
      }
      return;
    }

    // Success
    if (result?._ === 'auth.sentCode') {
      this.phoneHash = result.phone_code_hash;
      this.codeType = result.type._;
      this.state.next(AuthStage.Code);
    }
  }

  /**
   * Tries to sign in without 2FA
   * @mtproto auth.signIn
   */
  async checkCode(code: string) {
    const payload = {
      phone_number: unformat(this.phoneCountry.value.phone) + this.phoneNumber.value,
      phone_code_hash: this.phoneHash,
      phone_code: code,
    };
    let result: AuthAuthorization;

    try {
      result = await client.callAsync('auth.signIn', payload);
    } catch (err) {
      if (err.type === 'network') {
        this.errCode.next('NETWORK_ERROR');
      } else if (err.message === 'SESSION_PASSWORD_NEEDED') {
        this.state.next(AuthStage.TwoFA);
        this.getPasswordAlgo();
      } else {
        this.errCode.next(err.message);
      }
      return;
    }

    this.authorize(result);
  }

  /**
   * Fetch password KDF algo from server
   * @mtproto account.getPassword
   */
  protected async getPasswordAlgo() {
    for (;;) {
      try {
        // eslint-disable-next-line no-await-in-loop
        this.passwordAlgo = await client.callAsync('account.getPassword', {});
        break;
      } catch (error) {
        // retry
      }
    }
  }

  /**
   * Tries to sign in with 2FA
   * @mtproto auth.checkPassword
   */
  async checkPassword(password: string) {
    // Wait for pwd algo fetch
    while (!this.passwordAlgo) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const hash = await client.getPasswordKdfAsync(this.passwordAlgo, password);
    const payload: AuthCheckPassword = { password: hash };
    let result: AuthAuthorization;

    try {
      result = await client.callAsync('auth.checkPassword', payload);
    } catch (err) {
      if (err.type === 'network') {
        this.errPassword.next('NETWORK_ERROR');

        // Display error message
      } else {
        this.passwordAlgo = undefined;
        this.getPasswordAlgo();
        this.errPassword.next(err.message);
      }
      return;
    }

    this.authorize(result);
  }

  /**
   * Tries to sign up
   * @mtproto auth.signUp
   */
  async signUp(firstName: string, lastName: string) {
    const payload = {
      phone_number: unformat(this.phoneCountry.value.phone) + this.phoneNumber.value,
      phone_code_hash: this.phoneHash,
      first_name: firstName,
      last_name: lastName,
    };
    let result: AuthAuthorization;

    try {
      result = await client.callAsync('auth.signUp', payload);
    } catch (err) {
      // todo: handle PHONE_CODE_EXPIRED
      if (err.type === 'network') {
        this.errFirstName.next('NETWORK_ERROR');
      } else if (err.message === 'FIRSTNAME_INVALID') {
        this.errFirstName.next('Invalid First Name');
      } else if (err.message === 'LASTNAME_INVALID') {
        this.errLastName.next('Invalid Last Name');
      } else {
        this.errFirstName.next(err.message);
      }
      return;
    }

    if (this.profilePhoto) this.setProfilePhoto();
    this.authorize(result);
  }

  protected authorize(response: AuthAuthorization) {
    switch (response._) {
      case 'auth.authorizationSignUpRequired':
        this.state.next(AuthStage.SignUp);
        break;
      case 'auth.authorization':
        // todo: preload data
        this.userID = response.user.id;

        // Create keys for other dcs
        for (let i = 1; i <= (client.svc.test ? 3 : 5); i += 1) {
          if (i !== client.getBaseDC()) client.authorize(i);
        }

        this.state.next(AuthStage.Authorized);
        break;
      default:
    }
  }

  protected setProfilePhoto() {
    if (!this.profilePhoto) return;

    upload(this.profilePhoto, async (inputFile) => {
      await client.callAsync('photos.uploadProfilePhoto', { file: inputFile });
      // console.log(result);
    });
  }
}
