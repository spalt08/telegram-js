/**
 * Worker Payload
 */
export type WorkerMessage = {
  id: string,
  type: 'init' | 'call' | 'update' | 'meta' | 'switch_dc' | 'authorize' | 'password_kdf' | 'get_file' | 'windowEvent' | 'network' | 'ungzip',
  payload: any,
};

/**
 * Request error
 */
export type ClientError = {
  type: 'rpc' | 'network' | 'transport' | 'internal';
  code: number,
  message?: string,
};
