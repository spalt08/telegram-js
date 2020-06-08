/* eslint-disable prefer-destructuring */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
/* ====================================================================
MIT License
Canvas2APNG
Encoder for animated APNG file from a series of Html5 canvas drawings.
Copyright (c) aug 2017, Arthur Kalverboer
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
========================================================================     */

const frame = new Uint8Array(30 * 1024 * 1024);
let pos = 0;

function push(arr: ArrayLike<number>) {
  frame.set(arr, pos);
  pos += arr.length;
}

function clone() {
  const result = new Uint8Array(pos);
  result.set(frame.slice(0, pos));
  pos = 0;
  return result;
}

export class APNGencoder {
  canvas: OffscreenCanvas; // Canvas element
  repeat: number; // number of repeats; 0 indefinitely
  frameNo: number; // frame number (0 is first frame)
  seqNumber: number; // Sequence number for fcTL and fdAT chunks
  delay_num: number; // Frame delay fraction numerator   (int16, 2 bytes)
  delay_den: number; // Frame delay fraction denominator (int16, 2 bytes) 0 == 1/100 sec
  dispose: number; // Type of frame area disposal; values 0, 1, 2
  blend: number; // Type of frame area rendering: values 0, 1
  apngBytes?: ArrayBuffer; // APNG output stream (ByteArray)
  started: boolean; // ready to output frames
  closeStream: boolean; // close stream when finished

  // Generate APNG byte array from a series of canvas images.
  // See: https://en.wikipedia.org/wiki/APNG

  constructor(iCanvas: OffscreenCanvas) {
    this.canvas = iCanvas;
    this.repeat = 0;
    this.frameNo = -1;
    this.seqNumber = -1;
    this.delay_num = 1;
    this.delay_den = 1;
    this.dispose = 0;
    this.blend = 1;
    this.started = false;
    this.closeStream = false;
  }

  start() {
    // Creates APNG output stream on which images are written.
    this.started = true;
    this.closeStream = false;
    this.frameNo = -1;
    this.seqNumber = -1;
    return 0;
  } // start

  setDelay(d1000: number) {
    // Sets the delay time between each frame.
    // Applies to the last frame added and for subsequent frames.
    // Parameter: d1000 int delay time in 1/1000 sec.
    this.delay_num = d1000 | 0;
    this.delay_den = 1000;
    return 0;
  } // setDelay

  setRepeat(iter: number) {
    // Sets the number of times the set of APNG frames should be played.
    // Default is 1; 0 means play indefinitely.
    // Must be invoked before the first image is added.
    // Parameter: int number of iterations.
    if (iter >= 0) this.repeat = iter | 0;
    return 0;
  } // setRepeat

  setDispose(d: number) {
    // 0: APNG_DISPOSE_OP_NONE: no disposal is done on this frame before rendering the next;
    //    the contents of the output buffer are left as is.
    // 1: APNG_DISPOSE_OP_BACKGROUND: the frame's region of the output buffer is to be cleared
    //    to fully transparent black before rendering the next frame.
    // 2: APNG_DISPOSE_OP_PREVIOUS: the frame's region of the output buffer is to be reverted
    //    to the previous contents before rendering the next frame.
    if (d < 0 || d > 2) return 0; // not valid
    this.dispose = d | 0;
    return 0;
  } // setDispose

  setBlend(b: number) {
    // 0: APNG_BLEND_OP_SOURCE all color components of the frame, including alpha, overwrite
    //    the current contents of the frame's output buffer region.
    // 1: APNG_BLEND_OP_OVER the frame should be composited onto the output buffer based
    //    on its alpha, using a simple OVER operation.
    if (b < 0 || b > 1) return 0; // not valid
    this.blend = b | 0;
    return 0;
  } // setBlend

  async addFrame() {
    // The addFrame method takes a canvas element to create each frame.
    if ((this.canvas === null) || !this.started) {
      throw new Error('Please call start method before calling addFrame');
    }

    this.frameNo += 1; // frame number: used to derive seq number fcTL/fdAT chunks

    const dataBlob: Blob = await this.canvas.convertToBlob({ type: 'image/png' });
    const frameBytes = new Uint8Array(await dataBlob.arrayBuffer());

    if (this.frameNo === 0) {
      // Add signature (first eight bytes of a PNG datastream)
      const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      push(signature);

      // Copy Image Header Chunk (IHDR)
      let chunk = this.findChunk(frameBytes, 'IHDR')!;
      let chunkSlice = frameBytes.slice(chunk.idx, chunk.idx + 12 + chunk.len);
      push(chunkSlice);

      // acTL chunk   (animation control)
      const acTL = new Array<number>(0);
      acTL.push(...[0, 0, 0, 8]); // fixed length (8 data bytes)
      acTL.push(...str4ToBytes4('acTL')); // chunk type;
      acTL.push(...[0, 0, 0, 1]); // number of frames: must be updated at end
      acTL.push(...int32ToBytes4(this.repeat)); // push nr of times to loop
      let crcVal = crc32b(acTL.slice(4, 4 + 4 + 8));
      acTL.push(...int32ToBytes4(crcVal)); // push CRC 4 bytes
      push(acTL);

      // Add (copy) Data Chunks (fcTL and IDAT)  (first frame)
      const chunkArray = this.findChunkAll(frameBytes, 'IDAT');
      for (let i = 0; i < chunkArray.length; i++) {
        if (i === 0) {
          // fcTL chunk (frame control)
          this.seqNumber += 1; // Sequence number for fcTL and fdAT chunks
          const fcTL = new Array(0);
          fcTL.push(...int32ToBytes4(26)); // fixed length data 8 bytes
          fcTL.push(...str4ToBytes4('fcTL')); // chunk type;
          fcTL.push(...int32ToBytes4(this.seqNumber)); // sequence number 0
          fcTL.push(...int32ToBytes4(this.canvas.width)); // width
          fcTL.push(...int32ToBytes4(this.canvas.height)); // height
          fcTL.push(...int32ToBytes4(0)); // x-offset
          fcTL.push(...int32ToBytes4(0)); // y-offset
          fcTL.push(...int16ToBytes2(this.delay_num)); // Delay num
          fcTL.push(...int16ToBytes2(this.delay_den)); // Delay den
          fcTL.push(this.dispose); // dispose mode; values [0,1,2] (1 byte)
          fcTL.push(this.blend); // blend mode values [0,1] (1 byte)

          crcVal = crc32b(fcTL.slice(4, 4 + 4 + 26));
          fcTL.push(...int32ToBytes4(crcVal)); // push CRC 4 bytes
          push(fcTL); // push to main stream
        }

        chunk = chunkArray[i]; // copy complete IDAT chunk
        chunkSlice = frameBytes.slice(chunk.idx, chunk.idx + 12 + chunk.len);
        push(chunkSlice); // push to main stream
      } // for
    } // first frame

    if (this.frameNo > 0) {
      // Not first frame
      // Add Data Chunks fcTL/fdAT
      const chunkArray = this.findChunkAll(frameBytes, 'IDAT');
      for (let i = 0; i < chunkArray.length; i++) {
        if (i === 0) {
          // fcTL chunk (frame control)
          this.seqNumber += 1; // Sequence number for fcTL and fdAT chunks
          const fcTL = new Array<number>(0);
          fcTL.push(...int32ToBytes4(26)); // fixed length data 8 bytes
          fcTL.push(...str4ToBytes4('fcTL')); // chunk type;
          fcTL.push(...int32ToBytes4(this.seqNumber)); // sequence number
          fcTL.push(...int32ToBytes4(this.canvas.width)); // width
          fcTL.push(...int32ToBytes4(this.canvas.height)); // height
          fcTL.push(...int32ToBytes4(0)); // x-offset
          fcTL.push(...int32ToBytes4(0)); // y-offset
          fcTL.push(...int16ToBytes2(this.delay_num)); // Delay num
          fcTL.push(...int16ToBytes2(this.delay_den)); // Delay den
          fcTL.push(this.dispose); // dispose mode; values [0,1,2] (1 byte)
          fcTL.push(this.blend); // blend mode values [0,1] (1 byte)

          const crcVal = crc32b(fcTL.slice(4, 4 + 4 + 26));
          fcTL.push(...int32ToBytes4(crcVal)); // push CRC 4 bytes
          push(fcTL); // push to main stream
        }

        // ============================================================================
        // fdAT chunk (frame data)
        const chunk = chunkArray[i]; // get IDAT chunk object
        const chunk_IDAT_data = frameBytes.slice(chunk.idx + 8, chunk.idx + 8 + chunk.len);
        const len_fdAT = chunk.len + 4; // increase data with seq number

        this.seqNumber += 1; // Sequence number for fcTL and fdAT chunks
        const fdAT = new Array(0);
        fdAT.push(...int32ToBytes4(len_fdAT)); // append length bytes
        fdAT.push(...str4ToBytes4('fdAT')); // chunk type bytes
        fdAT.push(...int32ToBytes4(this.seqNumber)); // add sequence number bytes
        fdAT.push(...chunk_IDAT_data); // append original IDAT data
        const crcVal = crc32b(fdAT.slice(4, 4 + 4 + len_fdAT));
        fdAT.push(...int32ToBytes4(crcVal)); // push CRC 4 bytes

        push(fdAT); // push to main stream
      }
    }

    return 0;
  }

  finish() {
    // Adds final chunk to the APNG stream.
    // If you don't call the finish method the APNG stream will not be valid.
    if (!this.started) return false;

    // Add Image End Chunk (IEND)
    const chunkArray = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]; // fixed
    push(chunkArray);
    const result = clone();

    // Update acTL chunk with number of frames
    const chunk = this.findChunk(result, 'acTL')!;
    const nFrames = int32ToBytes4(this.frameNo + 1);
    result[chunk.idx + 8] = nFrames[0];
    result[chunk.idx + 8 + 1] = nFrames[1];
    result[chunk.idx + 8 + 2] = nFrames[2];
    result[chunk.idx + 8 + 3] = nFrames[3];

    // Update CRC of acTL
    const acTLslice = result.slice(chunk.idx + 4, chunk.idx + 4 + 4 + 8);
    const crcVal = crc32b(acTLslice);
    const crcBytes = int32ToBytes4(crcVal);
    result[chunk.idx + 4 + 4 + 8] = crcBytes[0];
    result[chunk.idx + 4 + 4 + 8 + 1] = crcBytes[1];
    result[chunk.idx + 4 + 4 + 8 + 2] = crcBytes[2];
    result[chunk.idx + 4 + 4 + 8 + 3] = crcBytes[3];

    this.started = false;
    this.closeStream = true;

    this.apngBytes = result;
    return true;
  } // finish

  stream() {
    // Retrieves the APNG stream.
    return this.apngBytes;
  }

  findChunk(arr: Uint8Array, iType: string) {
    // Find first chunk matching iType; undefined if not found
    let offset = 8; // start search
    let chunk: Chunk | undefined; // default output
    while (offset < arr.length) {
      const chunk1 = arr.slice(offset, offset + 4); // length chunk data
      const chunk2 = arr.slice(offset + 4, offset + 8); // type of chunk

      const chunkLength = bytes4ToInt32(chunk1);
      const chunkType = bytes4ToStr4(chunk2);
      if (chunkType === iType) {
        chunk = { idx: offset, len: chunkLength, type: chunkType };
        return chunk;
      }

      offset += 4 + 4 + chunkLength + 4;
    }

    return chunk;
  }

  findChunkAll(arr: Uint8Array, iType: string) {
    // Find all chunks matching iType. Output array of chunk objects.
    let offset = 8; // start search
    const chunkArray: Chunk[] = []; // default output
    while (offset < arr.length) {
      const chunk1 = arr.slice(offset, offset + 4); // length chunk data
      const chunk2 = arr.slice(offset + 4, offset + 8); // type of chunk

      const chunkLength = bytes4ToInt32(chunk1);
      const chunkType = bytes4ToStr4(chunk2);
      if (chunkType === iType) {
        const chunk = { idx: offset, len: chunkLength, type: chunkType };
        chunkArray.push(chunk); // array of chunk objects
      }

      offset += 4 + 4 + chunkLength + 4;
    }

    return chunkArray;
  }
}

// ===============================================================================

// A chunk in a PNG file consists of four parts:
// - Length of data (4 bytes)
// - Chunk type (4 bytes)
// - Chunk data (length bytes)
// - CRC (Cyclic Redundancy Code / Checksum, 4 bytes)
// There are about 20 different chunk types, but for a minimal PNG, only 3 are required:
// - the IHDR (image header) chunk
// - one or more IDAT (image data) chunks
// - the IEND (image end) chunk
type Chunk = {
  // Object Chunk
  idx: number; // Starting index of chunk in context of byte array
  len: number; // Length of data: total length of chunk is (4 + 4 + len + 4)
  type: string; // IHDR, IEND, IDAT, acTL, fcTL, fdAT, etc.
};

// ===============================================================================
function str4ToBytes4(iString: string) {
  const cc = new Array(4);
  cc[0] = iString.charCodeAt(0);
  cc[1] = iString.charCodeAt(1);
  cc[2] = iString.charCodeAt(2);
  cc[3] = iString.charCodeAt(3);
  return cc;
}

function bytes4ToStr4(iBytes: Uint8Array) {
  const cc = String.fromCharCode(iBytes[0]) + String.fromCharCode(iBytes[1]) + String.fromCharCode(iBytes[2]) + String.fromCharCode(iBytes[3]);
  return cc;
}

function int32ToBytes4(iNum: number) {
  return [(iNum >> 24) & 0xff, (iNum >> 16) & 0xff, (iNum >> 8) & 0xff, iNum & 0xff];
}

function bytes4ToInt32(iBytes: Uint8Array) {
  const num = (iBytes[0] << 24) + (iBytes[1] << 12) + (iBytes[2] << 8) + iBytes[3];
  return num;
}

function int16ToBytes2(iNum: number) {
  return [(iNum >> 8) & 0xff, iNum & 0xff];
}

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
/*
Implementation of CRC32b calculation.
Calculation function: var res = crc32b(iVar)
- iVar is string or array of unsigned integer
- res is unsigned integer (4 bytes)
Format function for output CRC32 calculation: formatCRC32(iVal, iType)
Testcases:
IN: [0x49,0x48,0x44,0x52,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00];
OUT:  "907753DE"   or [144,119,83,222]   (IHDR chunk)
IN: [0x49,0x45,0x4E,0x44] or [73,69,78,68]
OUT: "AE426082"  or  [174,66,96,130]  (IEND chunk)
IN: "SheetJS"
OUT: "9DD03922" or  [157,208,57,34]
*/

// ===============================================================================

const a_table = '00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D';

const b_table = a_table.split(' ').map((s) => parseInt(s, 16));

function crc32b(iVar: string | Uint8Array | Array<number>) {
  let arr: number[] | Uint8Array;
  // Calculate CRC32b value of iVar (string or array of integers (bytes))
  if (typeof iVar === 'string' || iVar instanceof String) {
    // Convert string to integer array
    arr = new Array(iVar.length);
    for (let i = 0; i < iVar.length; i++) { arr[i] = iVar.charCodeAt(i); }
  } else {
    arr = iVar;
  }

  let crc = -1;
  for (let i = 0, iTop = arr.length; i < iTop; i++) {
    crc = (crc >>> 8) ^ b_table[(crc ^ arr[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

// ===============================================================================
