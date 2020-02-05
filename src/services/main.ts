import { BehaviorSubject } from 'rxjs';
import client from 'client/client';

/**
 * Singleton service class for handling main thread
 */
export default class MainService {
  network = new BehaviorSubject('disconnected');

  constructor() {
    client.on('networkChanged', (state: string) => {
      console.warn('network', state);
      this.network.next(state);
    });
  }
}
