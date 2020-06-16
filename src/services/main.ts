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

  #rightSidebarContexts = new Map<string, BehaviorSubject<any>>();

  constructor() {
    client.on('networkChanged', (state: string) => {
      this.network.next(state);
    });
  }

  showPopup(type: 'sendMedia'): void;
  showPopup(type: 'stickerSet', ctx: InputStickerSet): void;
  showPopup(type: 'photo', ctx: { rect: DOMRect, options: PhotoOptions, photo: Photo, peer: Peer, message: Message }): void;
  showPopup(type: 'video', ctx: { rect: DOMRect, video: Document.document, peer?: Peer, message?: Message }): void;
  showPopup(type: 'confirmation', ctx: { body: string, title?: string, confirmCallback: () => void }): void;
  showPopup(type: string, ctx?: any): void {
    this.popupCtx = ctx;
    this.popup.next(type);
  }

  closePopup = () => {
    this.popupCtx = undefined;
    this.popup.next('');
  };

  openSidebar(state: 'searchStickers' | 'searchGifs'): void;
  openSidebar(state: 'sharedMedia' | 'info', ctx: Peer): void;
  openSidebar(state: 'messageSearch', ctx: { peer: Peer, query?: string }): void;
  openSidebar(state: 'pollResults', ctx: { peer: Peer, messageId: number }): void;
  openSidebar(state: 'addBotToGroup', ctx: Peer): void;
  openSidebar(state: SidebarState, ctx?: any): void {
    let contextSubject = this.#rightSidebarContexts.get(state);
    if (!contextSubject) {
      contextSubject = new BehaviorSubject(ctx);
      this.#rightSidebarContexts.set(state, contextSubject);
    } else {
      contextSubject.next(ctx);
    }
    this.rightSidebarDelegate.next(state);
  }

  closeSidebar() {
    this.rightSidebarDelegate.next(undefined);
  }

  getSidebarCtx(state: SidebarState) {
    return this.#rightSidebarContexts.get(state)!;
  }
}
