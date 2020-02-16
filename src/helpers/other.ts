import { a } from 'core/html';

export function downloadByUrl(filename: string, href: string) {
  const link = a({ download: filename, href, style: { display: 'none ' } });
  link.click();
}

export function todoAssertHasValue<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    console.warn('ASSERT: Empty value');
  }
  return value!;
}
