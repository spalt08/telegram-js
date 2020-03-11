import { Transports, ClientError, TransportState, AuthKey } from 'mtproto-js';
import { InputFile, AccountPassword, InputCheckPasswordSRP, InputFileLocation, Update, MethodDeclMap } from 'client/schema';

export type APICallHeaders = {
  dc?: number,
  thread?: number,
  transport?: Transports,
};

/**
 * Worker tasks without direct callbacks
 */
export interface WorkerTaskPayloadMap {
  'init': {
    dc: number,
    test: boolean,
    debug: boolean,
    meta: Record<number, any>,
  };
  'download': {
    id: string,
    location: InputFileLocation,
    options: DownloadOptions,
  };
  'upload': {
    id: string,
    file: File,
  };
  'switch_dc': number,
  'window_event': string,
  'listen_update': string,
}

/**
 * Worker requests with single callback result
 */
export interface WorkerRequestPayloadMap {
  'call': {
    method: string,
    params: Record<string, any>,
    headers: APICallHeaders,
  },
  'password_kdf': {
    algo: AccountPassword,
    password: string,
  },
  'authorize': number,
  'load_tgs': string,

}

export type WorkerTaskType = keyof WorkerTaskPayloadMap;
export type WorkerTask = {
  [K in WorkerTaskType]: {
    type: K,
    payload: WorkerTaskPayloadMap[K],
  }
}[WorkerTaskType];

export type WorkerRequestType = keyof WorkerRequestPayloadMap;
export type WorkerRequest = {
  [K in WorkerRequestType]: {
    id: string,
    type: K,
    payload: WorkerRequestPayloadMap[K],
  }
}[WorkerRequestType];

/**
 * Any message to be sent to worker
 */
export type WorkerMessageOutcoming = WorkerRequest | WorkerTask & { id?: undefined };

/**
 * Worker incoming notifications with task progress or result
 */
export interface WorkerNotificationPayloadMap {
  'update': Update;
  'meta_updated': Record<number, any>;
  'network_updated': TransportState;
  'upload_progress': {
    id: string,
    uploaded: number,
    total: number,
  };
  'upload_ready': {
    id: string,
    inputFile: InputFile,
  };
  'download_progress': {
    id: string,
    downloaded: number,
    total: number,
  };
  'download_ready': {
    id: string,
    url: string,
  };
}

/**
 * Worker responses with result payload
 */
export interface WorkerResponsePayloadMap {
  'rpc_result': {
    error: ClientError,
    result: any, // JSON
  };
  'password_kdf': InputCheckPasswordSRP,
  'authorization_complete': AuthKey,
  'tgs_loaded': any, // JSON
}

export type WorkerNotificationType = keyof WorkerNotificationPayloadMap;
export type WorkerNotification = {
  [K in WorkerNotificationType]: {
    type: K,
    payload: WorkerNotificationPayloadMap[K],
  }
}[WorkerNotificationType];

export type WorkerResponseType = keyof WorkerResponsePayloadMap;
export type WorkerResponse = {
  [K in WorkerResponseType]: {
    id: string,
    type: K,
    payload: WorkerResponsePayloadMap[K],
  }
}[WorkerResponseType];

export interface WorkerReqResMap {
  'call': 'rpc_result',
  'password_kdf': 'password_kdf',
  'authorize': 'authorization_complete',
  'load_tgs': 'tgs_loaded',
}
/**
 * Any message received from worker
 */
export type WorkerMessageIncoming = WorkerResponse | WorkerNotification & { id?: undefined };

export type WorkerRequestID = string;
export type WorkerRequestCallback<K extends WorkerRequestType> = (payload: WorkerResponsePayloadMap[WorkerReqResMap[K]]) => void;
export type WorkerNotificationCallback<K extends WorkerNotificationType> = (payload: WorkerNotificationPayloadMap[K]) => void;

/**
 * Worker callbacks
 */
export type APICallResolver<K extends keyof MethodDeclMap> = (...args: [ClientError, undefined] | [null, MethodDeclMap[K]['res']]) => void;
export type APICallParams<K extends keyof MethodDeclMap> = MethodDeclMap[K]['req'];

export type UpdateResolver<T> = (res: T) => void;
export type AnyResolver = (...payload: unknown[]) => void;
export type EventResolver = (event: any) => void;
export type UploadResolver = (input: InputFile) => void;
export type UploadProgressResolver = (uploaded: number, total: number) => void;
export type DownloadOptions = { size?: number, dc_id?: number, mime_type?: string, priority?: Priority };
export type DownloadResolver = (url: string) => void;
export type DownloadProgressResolver = (downloaded: number, total: number) => void;


export enum Priority {
  Highest,
  Lowest,
  Background = 32,
}
