import { map } from 'rxjs/operators';

const knownApiErrorMessages = {
  PASSWORD_HASH_INVALID: 'Password Invalid',
  AUTH_RESTART: 'Please Reload the Page',
  FILTER_INCLUDE_EMPTY: 'No Included Chat is added',
  FILTER_TITLE_EMPTY: 'The Folder Name is empty',
};

export function humanizeError(message: string): string {
  // Known API errors
  if (message in knownApiErrorMessages) {
    return knownApiErrorMessages[message as keyof typeof knownApiErrorMessages];
  }

  // Other API errors
  if (/^[A-Z0-9_-]+$/.test(message)) {
    return message
      .split(/[_-]+/)
      .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return message;
}

export function humanizeErrorOperator<T>() {
  return map((error: T) => typeof error === 'string' ? humanizeError(error) : error);
}
