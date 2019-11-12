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

declare module '*.json' {
  const data: Record<string, any>;
  export default data;
}

declare module '*?raw' {
  const text: string;
  export default text;
}
