declare module '.scss';
declare module '.css';

declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.tgs' {
  const src: string;
  export default src;
}

declare module '*.txt' {
  const src: string;
  export default src;
}

declare module '*?raw' {
  const text: string;
  export default text;
}

declare module '*?file' {
  const url: string;
  export default url;
}

declare module 'pako/lib/deflate' {
  export { deflate, Deflate, deflateRaw, gzip } from 'pako';
}
declare module 'pako/lib/inflate' {
  export { inflate, Inflate, inflateRaw, ungzip } from 'pako';
}

declare module 'code-points' {
  const codePoints: (str: string, options?: { unique?: boolean }) => number[];
  export default codePoints;
}
