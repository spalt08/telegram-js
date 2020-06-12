interface FileReaderSync {
  readAsArrayBuffer(blob: Blob): any;
  readAsBinaryString(blob: Blob): void;
  readAsDataURL(blob: Blob): string;
  readAsText(blob: Blob, encoding?: string): string;
}

// declare const FileReaderSync: {
//   prototype: FileReaderSync;
//   new(): FileReaderSync;
// };

declare module 'vendor/libwebp-0.2.0'
declare module 'vendor/rlottie/rlottie-wasm'
declare module 'mp4box'
declare module 'serviceworker-webpack-plugin/lib/runtime'

declare module '.scss'
declare module '.css'

declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.mp3' {
  const src: string;
  export default src;
}
declare module '*.mp4' {
  const src: string;
  export default src;
}
declare module '*.tgs' {
  const src: string;
  export default src;
}

declare module '*.webp' {
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

declare module 'lottie-web/build/player/lottie_canvas' {
  export * from 'lottie-web';
  export { default } from 'lottie-web';
}

declare module 'worker-loader!*' {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}
