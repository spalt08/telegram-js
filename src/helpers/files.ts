import { hex } from 'mtproto-js'

export function hexToBlob(str: string, type: string) {
  return new Blob([hex(str).buffer], { type });
}

export function blobToUrl(blob: Blob) {
  return (window.URL || window.webkitURL).createObjectURL(blob);
}
