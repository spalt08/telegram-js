import { inflate } from 'pako/lib/inflate';

/**
 * Load and ungzip .tgs
 */
export function loadTGS(src: string, cb: (json: any) => void) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', src, true);
  xhr.responseType = 'arraybuffer';
  xhr.send();

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      let parsedData: object = {};
      if (xhr.status === 200) {
        try {
          parsedData = JSON.parse(inflate(xhr.response, { to: 'string' }));
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error(`Failed to download a TGS from ${src}`);
        }
      }
      cb(parsedData);
    }
  };
}
