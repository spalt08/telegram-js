/* eslint-disable no-param-reassign */
/* eslint-disable max-classes-per-file */

interface ITreeNode<T> {
  height(): number;
  size(): number;
  totalLength(): number;
  left(): ITreeNode<T>;
  right(): ITreeNode<T>;
  insertSubTree(index: number, subTree: ITreeNode<T>): ITreeNode<T>;
  delete(index: number): ITreeNode<T>;
  getByDistance(distance: number): ItemInfo<T>,
  getByIndex(index: number): ItemInfo<T>,
  mutate(left?: ITreeNode<T>, right?: ITreeNode<T>): ITreeNode<T>,
}

const emptyNode: ITreeNode<any> = {
  height: () => 0,
  size: () => 0,
  totalLength: () => 0,
  left: () => emptyNode,
  right: () => emptyNode,
  delete: () => emptyNode,
  insertSubTree: (_index: number, subTree: ITreeNode<any>) => subTree,
  getByDistance: () => ({} as ItemInfo<any>),
  getByIndex: () => ({} as ItemInfo<any>),
  mutate: () => emptyNode,
};

function rotateLeft<T>(tree: ITreeNode<T>) {
  if (tree.right() === emptyNode) return tree;
  const node = tree.right();
  return node.mutate(tree.mutate(undefined, node.left()), undefined);
}

function rotateRight<T>(tree: ITreeNode<T>) {
  if (tree.left() === emptyNode) return tree;
  const node = tree.left();
  return node.mutate(undefined, tree.mutate(node.right(), undefined));
}

function doubleLeft<T>(tree: ITreeNode<T>) {
  return tree.right() === emptyNode ? tree : rotateLeft(tree.mutate(undefined, rotateRight(tree.right())));
}

function doubleRight<T>(tree: ITreeNode<T>) {
  return tree.left() === emptyNode ? tree : rotateRight(tree.mutate(rotateLeft(tree.left()), undefined));
}

function balance(tree: ITreeNode<unknown>) {
  return tree.right().height() - tree.left().height();
}

function isRightHeavy(tree: ITreeNode<unknown>) {
  return balance(tree) >= 2;
}

function isLeftHeavy(tree: ITreeNode<unknown>) {
  return balance(tree) <= 2;
}

function makeBalanced<T>(tree: ITreeNode<T>) {
  if (isRightHeavy(tree)) {
    return !isLeftHeavy(tree.right()) ? rotateLeft(tree) : doubleLeft(tree);
  }

  if (!isLeftHeavy(tree)) {
    return tree;
  }

  if (!isRightHeavy(tree.left())) {
    return rotateRight(tree);
  }

  return doubleRight(tree);
}

export type ItemInfo<T> = {
  item: T,
  length: number,
  index: number,
  outerDistance: number,
  innerDistance: number
};

class TreeNode<T> implements ITreeNode<T> {
  private readonly _item: T;
  private readonly _size: number;
  private readonly _height: number;
  private readonly _left: ITreeNode<T>;
  private readonly _right: ITreeNode<T>;
  private readonly _length: number;
  private _totalLength?: number;

  public constructor(item: T, length: number, left: ITreeNode<T>, right: ITreeNode<T>) {
    this._item = item;
    this._length = length;
    this._left = left;
    this._right = right;
    this._height = 1 + Math.max(left.height(), right.height());
    this._size = 1 + left.size() + right.size();
  }

  public size() {
    return this._size;
  }

  public height() {
    return this._height;
  }

  public length(): number {
    return this._length;
  }

  public left() {
    return this._left;
  }

  public right() {
    return this._right;
  }

  public totalLength(): number {
    if (this._totalLength === undefined) {
      this._totalLength = this._length + this._left.totalLength() + this._right.totalLength();
    }
    return this._totalLength;
  }

  public add(item: T, length: number) {
    return this.insertSubTree(this._size, new TreeNode<T>(item, length, emptyNode, emptyNode));
  }

  public insert(index: number, item: T, length: number) {
    return this.insertSubTree(index, new TreeNode<T>(item, length, emptyNode, emptyNode));
  }

  public delete(index: number): ITreeNode<T> {
    let tree: ITreeNode<T>;
    if (index === this._left.size()) {
      if (this._right === emptyNode && this._left === emptyNode) {
        tree = emptyNode;
      } else if (this._right === emptyNode) {
        tree = this._left;
      } else if (this._left === emptyNode) {
        tree = this._right;
      } else {
        let node = this._right;
        while (node.left() !== emptyNode) {
          node = node.left();
        }
        const right = this._right.delete(0);
        tree = node.mutate(this._left, right);
      }
    } else {
      tree = index < this._left.size()
        ? this.mutate(this._left.delete(index), undefined)
        : this.mutate(undefined, this._right.delete(index - this._left.size() - 1));
    }
    return tree === emptyNode ? tree : makeBalanced(tree);
  }

  public insertSubTree(index: number, subTree: ITreeNode<T>): ITreeNode<T> {
    const tree = index <= this._left.size()
      ? this.mutate(this._left.insertSubTree(index, subTree), undefined)
      : this.mutate(undefined, this._right.insertSubTree(index - this._left.size() - 1, subTree));
    return makeBalanced(tree);
  }

  public getByDistance(distance: number): ItemInfo<T> {
    const innerDistance = distance - this._left.totalLength();

    if (innerDistance < 0) {
      return this._left.getByDistance(distance);
    }

    const length = this._left.totalLength() + this.length();
    if (distance >= length) {
      const result = this._right.getByDistance(distance - length);
      result.index += this._left.size() + 1;
      result.outerDistance += length;
      return result;
    }

    return { index: this._left.size(), length: this.length(), item: this._item, outerDistance: this._left.totalLength(), innerDistance };
  }

  public getByIndex(index: number): ItemInfo<T> {
    if (index < this._left.size()) {
      return this._left.getByIndex(index);
    }
    if (index > this._left.size()) {
      const result = this._right.getByIndex(index - this._left.size() - 1);
      result.index += this._left.size() + 1;
      result.outerDistance += this._left.totalLength() + this.length();
      return result;
    }

    return { index, item: this._item, length: this.length(), outerDistance: this._left.totalLength(), innerDistance: 0 };
  }

  mutate(left?: ITreeNode<T>, right?: ITreeNode<T>) {
    return new TreeNode<T>(this._item, this.length(), left ?? this._left, right ?? this._right);
  }
}

export class DistanceTree<T> {
  private _root: ITreeNode<T> = emptyNode;

  public size() {
    return this._root.size();
  }

  public totalLength() {
    return this._root.totalLength();
  }

  public insert(index: number, item: T, length: number) {
    this._root = this._root.insertSubTree(index, new TreeNode<T>(item, length, emptyNode, emptyNode));
  }

  public delete(index: number) {
    this._root = this._root.delete(index);
  }

  public updateLength(index: number, length: number, clampToBounds = true) {
    if (index < 0 || index >= this._root.size()) {
      if (clampToBounds) {
        index = Math.max(0, Math.min(index, this._root.size() - 1));
      } else {
        throw Error(`index is out of range: ${index}`);
      }
    }

    const info = this.getByIndex(index);
    this._root = this._root
      .delete(index)
      .insertSubTree(index, new TreeNode<T>(info.item, length, emptyNode, emptyNode));
  }

  /**
   * Returns the item and its offset information by distance.
   * @param distance distance of item
   * @param clampToBounds if true, returns first/last element when distance is out of range. Otherwise, throws error.
   */
  public getByDistance(distance: number, clampToBounds = true): Readonly<ItemInfo<T>> {
    if (clampToBounds && distance >= this._root.totalLength()) {
      return this._root.getByIndex(this._root.size() - 1);
    }
    if (distance < 0) {
      if (clampToBounds) {
        distance = Math.max(0, distance);
      } else {
        throw Error('distance is out of range.');
      }
    }
    return this._root.getByDistance(distance);
  }

  /**
   * Returns the item and its offset information by index.
   * @param index index of item
   * @param clampToBounds if true, returns first/last element when index is out of range. Otherwise, throws error.
   */
  public getByIndex(index: number, clampToBounds = true): Readonly<ItemInfo<T>> {
    if (index < 0 || index >= this._root.size()) {
      if (clampToBounds) {
        index = Math.max(0, Math.min(index, this._root.size() - 1));
      } else {
        throw Error('index is out of range.');
      }
    }
    return this._root.getByIndex(index);
  }
}
