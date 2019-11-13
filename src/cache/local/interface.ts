export interface StorageProvider {
  load<T>(repo: string, cb: (data: Record<string | number, T>) => void): void;
  save<T>(repo: string, data: Record<string | number, T>): void;
}
