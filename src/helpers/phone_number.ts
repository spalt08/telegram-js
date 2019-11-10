import { Country } from 'const/country';

/**
 * @param formatsVal See country.ts
 * @param str Digits only
 */
export function format(formatsVal: Array<string | number>, str: string): string {
  if (!str) return '';

  let formated = '';
  let maxLength = 0;

  for (let i = 0; i < formatsVal.length; i += 2) {
    maxLength = formatsVal[i] as number;

    if (typeof formatsVal[i] === 'number' && str.length <= formatsVal[i]) {
      const pattern = formatsVal[i + 1] as string;
      const digitPlaceholder = 'd';
      let offset = 0;
      let len = 0;

      for (let j = 0; j < pattern.length && offset + len < str.length; j++) {
        if (pattern[j] === digitPlaceholder) {
          len++;
          continue;
        }

        formated += str.slice(offset, offset + len);
        formated += pattern[j];
        offset += len;
        len = 0;
      }

      return formated + str.slice(offset);
    }
  }

  return format(formatsVal, str.slice(0, maxLength));
}

/**
 * Removes everything from the phone number string except digits
 */
export function unformat(str: string) {
  return str.replace(/[^\d]/g, '');
}

export function formatWithCountry(country: Country, number: string) {
  return `${country.phone} ${country.phoneFormats ? format(country.phoneFormats, number) : number}`;
}

export function unformatWithCountry(country: Country, number: string) {
  return unformat(country.phone) + number;
}
