import url from './layer105.json?file';

/**
 * Reduce bundle size by loading schema
 */
export default function loadSchema(cb: (schema: any) => void) {
  const xhr = new XMLHttpRequest();

  // eslint-disable-next-line no-restricted-globals
  xhr.open('GET', `${location.origin}/${url}`);
  xhr.send();

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const json = JSON.parse(xhr.response);
      cb(json);
    }
  };
}
