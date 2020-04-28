import {
  Transports, ClientError, TransportState, AuthKey, UpdateDeclMap, MethodDeclMap, InputFile, AccountPassword,
  InputCheckPasswordSRP, InputFileLocation, Update, User, Chat, Updates } from 'mtproto-js';

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
  'stream_request': {
    id: string,
    location: InputFileLocation,
    options: DownloadOptions,
  };
  'stream_seek': {
    id: string,
    seek: number,
  };
  'stream_revoke': {
    id: string,
  };
  'upload': {
    id: string,
    file: File,
  };
  'switch_dc': number,
  'window_event': string,
  'listen_update': keyof UpdateDeclMap,
}

/**
 * Worker requests with single callback result
 */
export interface WorkerRequestPayloadMap {
  'call': {
    method: keyof MethodDeclMap,
    params: Record<string, any>,
    headers: APICallHeaders,
  },
  'password_kdf': {
    algo: AccountPassword,
    password: string,
  },
  'authorize': number,
  'load_tgs': string,
  'get_file_part': {
    location: InputFileLocation,
    options: DownloadOptions,
    offset: number,
    limit: number,
  },
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
  'update': Updates | Update | User | Chat;
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
    location: InputFileLocation,
  };
  'stream_initialize': {
    id: string,
    info: any,
    segments: any[],
  };
  'stream_segment': {
    id: string,
    segment: {
      id: any,
      user: any,
      buffer: any
    },
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
  'password_kdf': InputCheckPasswordSRP.inputCheckPasswordSRP,
  'authorization_complete': AuthKey,
  'tgs_loaded': any, // JSON
  'file_part': {
    offset: number,
    limit: number,
    buffer: ArrayBuffer,
  }, // JSON
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
  'get_file_part': 'file_part',
}

/**
 * Servive Worker requests with single callback result
 */
export interface ServiceWorkerNotificationMap {
  'requested': { url: string },
  'cached': { url: string },
  'stream_range': { url: string, offset: number, end: number },
}

export type ServiceWorkerNotificationType = keyof ServiceWorkerNotificationMap;
export type ServiceWorkerNotification = {
  [K in ServiceWorkerNotificationType]: {
    type: K,
    payload: ServiceWorkerNotificationMap[K],
  }
}[ServiceWorkerNotificationType];


/**
 * Servive Worker requests with single callback result
 */
export interface ServiceWorkerTaskPayloadMap {
  'completed': { url: string },
  'range': {
    url: string,
    offset: number,
    end: number,
    buffer: ArrayBuffer,
    size: number,
  }
}

export type ServiceWorkerTaskType = keyof ServiceWorkerTaskPayloadMap;
export type ServiceWorkerTask = {
  [K in ServiceWorkerTaskType]: {
    type: K,
    payload: ServiceWorkerTaskPayloadMap[K],
  }
}[ServiceWorkerTaskType];


/**
 * Any message received from worker
 */
export type WorkerMessageIncoming = WorkerResponse | WorkerNotification & { id?: undefined };

export type WorkerRequestID = string;
export type WorkerRequestCallback<K extends WorkerRequestType> = (payload: WorkerResponsePayloadMap[WorkerReqResMap[K]]) => void;
export type WorkerNotificationCallback<K extends WorkerNotificationType> = (payload: WorkerNotificationPayloadMap[K]) => void;
export type ServiceWorkerNotificationCallback<K extends ServiceWorkerNotificationType> = (payload: ServiceWorkerNotificationMap[K]) => void;

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
export type URLResolver = (url: string) => void;
export type DownloadResolver = URLResolver;
export type DownloadProgressResolver = (downloaded: number, total: number) => void;


export enum Priority {
  Highest,
  Lowest,
  Background = 32,
}
