import { a } from 'core/html';

export function downloadByUrl(filename: string, href: string) {
  const link = a({ download: filename, href, style: { display: 'none ' } });
  link.click();
}
