import { BehaviorSubject, Subject } from 'rxjs';
import loginProfile from './login_profile';

interface SendError {
  firstName?: string;
  lastName?: string;
}

function profileSendMock(firstName: string, lastName: string, callback: (error: SendError | null) => void) {
  console.log('Mock profile sent', firstName, lastName);
  const error: SendError = {};

  if (firstName.length < 5) {
    error.firstName = 'Invalid Name';
  }

  if (lastName.length > 10) {
    error.lastName = 'Invalid Last Name';
  }

  if (Object.keys(error).length > 0) {
    callback(error);
    return;
  }

  setTimeout(() => {
    callback(null);
  }, 1000);
}

export default function loginProfileContainer() {
  const isSubmitting = new BehaviorSubject(false);
  const firstNameError = new Subject<string>();
  const lastNameError = new Subject<string>();

  return loginProfile({
    isSubmitting,
    firstNameError,
    lastNameError,
    onSubmit(firstName, lastName) {
      isSubmitting.next(true);
      profileSendMock(firstName, lastName, (error) => {
        isSubmitting.next(false);
        if (error) {
          if (error.firstName) {
            firstNameError.next(error.firstName);
          }
          if (error.lastName) {
            lastNameError.next(error.lastName);
          }
        }
      });
    },
  });
}
