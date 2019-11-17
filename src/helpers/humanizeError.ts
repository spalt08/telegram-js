import { map } from 'rxjs/operators';

export function humanizeError(message: string): string {
  // Known API errors
  switch (message) {
    case 'PASSWORD_HASH_INVALID': return 'Password Invalid';
    case 'AUTH_RESTART': return 'Please Reload the Page';
    default:
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
