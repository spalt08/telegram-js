/* eslint-disable no-param-reassign */
export type Atom = {
  type: string,
  offset: number,
  length: number,
};

export function getAtomLength(buf: Uint8Array, seek: number) {
  const length = (
    buf[seek] << 24
  ^ buf[seek + 1] << 16
  ^ buf[seek + 2] << 8
  ^ buf[seek + 3]
  ) >>> 0;

  return length;
}

export function getAtomType(buf: Uint8Array, seek: number) {
  return (
    String.fromCharCode(buf[seek + 4])
  + String.fromCharCode(buf[seek + 5])
  + String.fromCharCode(buf[seek + 6])
  + String.fromCharCode(buf[seek + 7])
  );
}

export const SMALLEST_CHUNK_LIMIT = 1024 * 4;

export function alignOffset(offset: number, base = SMALLEST_CHUNK_LIMIT): number {
  return offset - (offset % base);
}

export function alignLimit(limit: number): number {
  return 2 ** Math.ceil(Math.log(limit) / Math.log(2));
}

export function getMoovAtomElement(atoms: Atom[]): Atom | undefined {
  for (let i = 0; i < atoms.length; i++) {
    if (atoms[i].type === 'moov') return atoms[i];
  }

  return undefined;
}

export function lookupAtoms(buf: Uint8Array, atoms: Atom[], offset = 0): Atom | undefined {
  let prevAtom: Atom | undefined;
  let seek = 0;

  if (atoms.length > 0) {
    prevAtom = atoms[atoms.length - 1];
    seek = prevAtom.offset + prevAtom.length - offset;
  }

  while (buf.length > 0 && seek < buf.length) {
    const length = getAtomLength(buf, seek);
    const type = getAtomType(buf, seek);
    const atom = { type, length, offset: offset + seek };

    atoms.push(atom);

    seek += length;
    prevAtom = atom;
  }

  return prevAtom;
}

type AtomTree = Atom & { children: AtomTree[] };

export function parseAtomsRecursive(base: AtomTree, buf: Uint8Array, offset: number, limit: number): AtomTree {
  let seek = offset;

  while (buf.length > 0 && seek < buf.length && seek - offset < limit) {
    const length = getAtomLength(buf, seek);
    const type = getAtomType(buf, seek);

    if (length > 0 && length < limit) {
      const atom: AtomTree = {
        type,
        length,
        offset: seek,
        children: [],
      };

      base.children.push(atom);

      parseAtomsRecursive(atom, buf, seek + 8, length);
    }

    seek += length;
    if (length === 0) break;
  }

  return base;
}

export function filterAtoms(base: AtomTree, type: string) {
  return base.children.filter((atom) => atom.type === type);
}

export function getChildAtom(base: AtomTree, type: string) {
  return base.children.find((atom) => atom.type === type);
}

export function parseMoovAtom(buf: Uint8Array, offset: number, length: number) {
  const moov: AtomTree = {
    type: 'moov',
    offset,
    length,
    children: [],
  };

  parseAtomsRecursive(moov, buf, offset, length);

  const traks = filterAtoms(moov, 'trak');

  for (let i = 0; i < traks.length; i++) {
    const mdia = getChildAtom(traks[i], 'mdia');
    console.log(mdia);
  }
}
