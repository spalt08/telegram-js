import {
  Transports, ClientError, TransportState, AuthKey, MethodDeclMap, InputFile, AccountPassword,
  InputCheckPasswordSRP, Update, Updates, InputFileLocation } from 'mtproto-js';

export type APICallHeaders = {
  dc?: number,
  thread?: number,
  transport?: Transports,
};

/**
 * Worker tasks without direct callbacks
 */
export interface TaskPayloadMap {
  'switch_dc': number,
  'upload': {
    id: string,
    file: File,
  },
  'location': {
    url: string,
    location: InputFileLocation,
    options: DownloadOptions,
  },
  'webp_loaded': {
    url: string,
    blob: Blob,
  }
  'thumb': {
    url: string,
    bytes: ArrayBuffer,
  }

  // storybook
  'url_map': {
    url: string,
    map: string,
  },
}

/**
 * Worker requests with single callback result
 */
export interface RequestPayloadMap {
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
}

export type TaskType = keyof TaskPayloadMap;
export type ServiceTask = {
  [K in TaskType]: {
    type: K,
    payload: TaskPayloadMap[K],
  }
}[TaskType];

export type RequestType = keyof RequestPayloadMap;
export type ServiceRequest = {
  [K in RequestType]: {
    id: string,
    type: K,
    payload: RequestPayloadMap[K],
  }
}[RequestType];

/**
 * Any message to be sent to worker
 */
export type WindowMessage = ServiceRequest | (ServiceTask & { id?: undefined });

/**
 * Worker incoming notifications with task progress or result
 */
export interface NotificationPayloadMap {
  'update': Updates | Update;
  'authorization_updated': { dc: number, user: number };
  'network_updated': TransportState;
  'file_progress': {
    url: string,
    downloaded: number,
    total: number,
  };
  'upload_progress': {
    id: string,
    uploaded: number,
    total: number,
  };
  'upload_ready': {
    id: string,
    inputFile: InputFile,
  };
  'webp': {
    url: string,
    data: ArrayBuffer,
  };
}

/**
 * Worker responses with result payload
 */
export interface ResponsePayloadMap {
  'rpc_result': {
    error: ClientError,
    result: any, // JSON
  };
  'password_kdf': InputCheckPasswordSRP.inputCheckPasswordSRP,
  'authorization_complete': AuthKey,
}

export type NotificationType = keyof NotificationPayloadMap;
export type ServiceNotification = {
  [K in NotificationType]: {
    type: K,
    payload: NotificationPayloadMap[K],
  }
}[NotificationType];

export type ResponseType = keyof ResponsePayloadMap;
export type ServiceResponse = {
  [K in ResponseType]: {
    id: string,
    type: K,
    payload: ResponsePayloadMap[K],
  }
}[ResponseType];

export interface RequestResponseMap {
  'call': 'rpc_result',
  'password_kdf': 'password_kdf',
  'authorize': 'authorization_complete',
}

/**
 * Any message received from worker
 */
export type ServiceMessage = ServiceResponse | ServiceNotification & { id?: undefined };

export type ServiceRequestID = string;
export type ServiceRequestCallback<K extends RequestType> = (payload: ResponsePayloadMap[RequestResponseMap[K]]) => void;
export type ServiceNotificationCallback<K extends NotificationType> = (payload: NotificationPayloadMap[K]) => void;

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
export type DownloadOptions = { size?: number, dc_id?: number, mime_type?: string, priority?: Priority, precise?: boolean, progress?: boolean };
export type URLResolver = (url: string) => void;
export type DownloadResolver = URLResolver;
export type DownloadProgressResolver = (downloaded: number, total: number) => void;


export enum Priority {
  Highest,
  Lowest,
  Background = 32,
}
