
// const reader = new FileReader();
// const uploading: Record<string, {
//   data: Uint8Array,
//   size: number,
//   name: string,
//   partSize: number,
//   total: number,
//   big: boolean,
// }> = {};

// interface Notification {
//   (name: 'upload_progress', payload: { id: string, uploaded: number, total: number }): void
//   (name: 'upload_ready', payload: { id: string, inputFile: InputFile }): void
// }

// /**
//  * File managers: saveFilePart
//  */
// function uploadFileChunkLoop(client: Client, id: string, part: number, notify: Notification) {
//   if (!uploading[id]) return;

//   const { partSize, size, data, big, total, name } = uploading[id];
//   const uploaded = partSize * part;
//   const remaining = Math.min(partSize, size - uploaded);

//   const payload = {
//     file_id: id,
//     file_part: part,
//     bytes: data.slice(uploaded, uploaded + remaining),
//     md5_checksum: '',
//   };

//   // @ts-ignore
//   client.call(big ? 'upload.saveFilePartBig' : 'upload.saveFilePart', payload, { thread: 2 }, (err, res) => {
//     if (err || !res) throw new Error(`Error while uploadig file: ${JSON.stringify(err)}`);

//     if (part < total - 1) {
//       notify('upload_progress', { id, uploaded: uploaded + remaining, total: size });
//       uploadFileChunkLoop(client, id, part + 1, notify);
//     } else {
//       notify('upload_ready', {
//         id,
//         inputFile: {
//           _: big ? 'inputFileBig' : 'inputFile',
//           id,
//           parts: total,
//           name,
//           md5_checksum: '',
//         },
//       });

//       delete uploading[id];
//     }
//   });
// }

// /**
//  * Upload file
//  */
// export function uploadFile(client: Client, id: string, file: File, notify: Notification) {
//   let partSize = 262144; // 256 Kb

//   if (file.size > 67108864) {
//     partSize = 524288;
//   } else if (file.size < 102400) {
//     partSize = 32768;
//   }

//   notify('upload_progress', { id, uploaded: 0, total: file.size });

//   uploading[id] = {
//     data: new Uint8Array(reader.readAsArrayBuffer(file)),
//     size: file.size,
//     name: file.name,
//     partSize,
//     total: Math.ceil(file.size / partSize),
//     big: file.size > 1024 * 1024 * 10,
//   };

//   uploadFileChunkLoop(client, id, 0, notify);
// }
