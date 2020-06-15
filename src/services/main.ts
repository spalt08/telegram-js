import client from 'client/client';
import { PhotoOptions } from 'helpers/other';
import { Document, InputStickerSet, Message, Peer, Photo } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';

type SidebarState = import('components/sidebar/sidebar').SidebarState;

/**
 * Singleton service class for handling main thread
 */
export default class MainService {
  /** Network Status */
  network = new BehaviorSubject('connected');

  /** Last Opened Popup */
  popup = new BehaviorSubject('');

  /** Popup Context */
  popupCtx: any = {};

  /** Right Sidebar Delegate */
  rightSidebarDelegate = new BehaviorSubject<SidebarState | undefined>(undefined);

  rightSidebarCtx: any = {};

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

  openSidebar(state: 'searchStickers'): void;
  openSidebar(state: 'sharedMedia' | 'info' | 'messageSearch', ctx: Peer): void;
  openSidebar(state: 'pollResults', ctx: { peer: Peer, messageId: number }): void;
  openSidebar(state: SidebarState, ctx?: any): void {
    this.rightSidebarCtx = ctx;
    this.rightSidebarDelegate.next(state);
  }
}
