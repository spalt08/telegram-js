import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { Photo, Message } from 'cache/types';

/**
 * Singleton service class for handling main thread
 */
export default class MainService {
  /** Network Status */
  network = new BehaviorSubject('disconnected');

  /** Last Opened Popup */
  popup = new BehaviorSubject('');

  /** Popup Context */
  popupCtx: any = {};

  constructor() {
    client.on('networkChanged', (state: string) => {
      this.network.next(state);
    });
  }

  showPopup(type: 'photo', ctx: { rect: DOMRect, photo: Photo, message: Message }): void;
  showPopup(type: string, ctx: any): void {
    this.popupCtx = ctx;
    this.popup.next(type);
  }
}
