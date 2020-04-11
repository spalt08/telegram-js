import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { Photo, Message, Peer, InputStickerSet, Document } from 'mtproto-js';
import { PhotoOptions } from 'components/media/photo/photo';

export const enum RightSidebarPanel {
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

  showPopup(type: 'sendMedia'): void;
  showPopup(type: 'stickerSet', ctx: InputStickerSet): void;
  showPopup(type: 'photo', ctx: { rect: DOMRect, options: PhotoOptions, photo: Photo, peer: Peer, message: Message }): void;
  showPopup(type: 'video', ctx: { rect: DOMRect, video: Document.document, peer?: Peer, message?: Message }): void;
  showPopup(type: string, ctx?: any): void {
    this.popupCtx = ctx;
    this.popup.next(type);
  }

  closePopup = () => {
    this.popupCtx = undefined;
    this.popup.next('');
  };

  setRightSidebarPanel(panel: RightSidebarPanel) {
    this.rightSidebarPanel.next(panel);
  }
}
