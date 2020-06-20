import { InputFile } from 'mtproto-js';

export interface UploadPartResolver {
  (file_id: string, file_part: number, file_total_parts: number, bytes: ArrayBuffer, big: boolean, ready: () => void): void,
}

const uploading: Record<string, {
  data: Uint8Array,
  size: number,
  name: string,
  partSize: number,
  total: number,
  big: boolean,
}> = {};

interface Notification {
  (name: 'upload_progress', payload: { id: string, uploaded: number, total: number }): void
  (name: 'upload_ready', payload: { id: string, inputFile: InputFile }): void
}

/**
 * File managers: saveFilePart
 */
function uploadFileChunkLoop(id: string, part: number, upload: UploadPartResolver, notify: Notification) {
  if (!uploading[id]) return;

  const { partSize, size, data, big, total, name } = uploading[id];
  const uploaded = partSize * part;
  const remaining = Math.min(partSize, size - uploaded);

  upload(id, part, total, data.subarray(uploaded, uploaded + remaining), big, () => {
    if (part < total - 1) {
      notify('upload_progress', { id, uploaded: uploaded + remaining, total: size });
      uploadFileChunkLoop(id, part + 1, upload, notify);
    } else {
      notify('upload_ready', {
        id,
        inputFile: {
          _: big ? 'inputFileBig' : 'inputFile',
          id,
          parts: total,
          name,
          md5_checksum: '',
        },
      });

      delete uploading[id];
    }
  });
}

/**
 * Upload file
 */
export function uploadFile(id: string, file: File | Blob, upload: UploadPartResolver, notify: Notification) {
  let partSize = 262144; // 256 Kb
  if (file.size > 67108864) partSize = 524288;
  else if (file.size < 102400) partSize = 32768;

  notify('upload_progress', { id, uploaded: 0, total: file.size });

  let reader: FileReader | undefined = new FileReader();
  reader.readAsArrayBuffer(file);
  reader.onload = () => {
    if (!reader) return;

    uploading[id] = {
      data: new Uint8Array(reader.result as ArrayBuffer),
      size: file.size,
      name: (file as any).name || 'untitled',
      partSize,
      total: Math.ceil(file.size / partSize),
      big: file.size > 1024 * 1024 * 10,
    };

    uploadFileChunkLoop(id, 0, upload, notify);

    reader = undefined;
  };
}
