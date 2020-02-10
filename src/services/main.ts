import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { Photo, Message } from 'cache/types';

export enum RightSidebarPanel {
  None,
  Info,
  Search
}

/**
 * Singleton service class for handling main thread
 */
export default class MainService {
  /** Network Status */
  network = new BehaviorSubject('disconnected');

  /** Last Opened Popup */
  popup = new BehaviorSubject('');

  /** State of sidebar visibility */
  rightSidebarPanel = new BehaviorSubject(RightSidebarPanel.None);

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

  setRightSidebarPanel(panel: RightSidebarPanel) {
    this.rightSidebarPanel.next(panel);
  }
}
