import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { Photo, Message, Peer, InputStickerSet, Document } from 'mtproto-js';
import { PhotoOptions } from 'helpers/other';
import type { SidebarState } from 'components/sidebar/sidebar';


/**
 * Singleton service class for handling main thread
 */
export default class MainService {
  /** Network Status */
  network = new BehaviorSubject('connected');

  /** Last Opened Popup */
  popup = new BehaviorSubject('');

  /** Right Sidebar Delegate */
  rightSidebarDelegate = new BehaviorSubject<SidebarState | undefined>(undefined);

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

  openSidebar(state: SidebarState) {
    this.rightSidebarDelegate.next(state);
  }
}
