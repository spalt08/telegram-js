import { Client, TypeLanguage } from 'mtproto-js';
import { API_ID, API_HASH, APP_VERSION } from 'const/api';
import Layer105 from './layer105.json';

const tl = new TypeLanguage(Layer105);
const client = new Client(tl, {
  test: false,
  ssl: true,
  dc: 2,
  protocol: 'intermediate',
  transport: 'websocket',

  APILayer: 105,
  APIID: API_ID,
  APIHash: API_HASH,

  deviceModel: 'test',
  systemVersion: 'test',
  appVersion: APP_VERSION,
  langCode: 'en',
});

// Debug
(window as any).client = client;

export default client;
