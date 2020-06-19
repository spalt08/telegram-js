import client from 'client/client';
import { PhotoOptions } from 'helpers/other';
import { Document, InputStickerSet, Message, Peer, Photo } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { task } from 'client/context';

type SidebarState = import('components/sidebar/sidebar').SidebarState;
type SidebarContext<T> = import('components/sidebar/sidebar').SidebarContext<T>;
type SidebarStateAndCtx = import('components/sidebar/sidebar').SidebarStateAndCtx;

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

  /** Is Chat Opened */
  isChatOpened = new BehaviorSubject<boolean | null>(null);

  /** Window Size */
  window = { width: 0, height: 0 };

  /** Right Sidebar Delegate */
  rightSidebarDelegate = new BehaviorSubject<SidebarStateAndCtx | undefined>(undefined);

  constructor() {
    this.window = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    window.addEventListener('resize', () => {
      this.window = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    });

    window.addEventListener('online', () => task('network_event', 'online'));
    window.addEventListener('offline', () => task('network_event', 'offline'));

    client.on('networkChanged', (state: string) => {
      this.network.next(state);
    });
  }

  showPopup(type: 'gallery', ctx: { opener?: { rect: DOMRect, thumb: string }, message: Message.message }): void;
  showPopup(type: 'sendMedia'): void;
  showPopup(type: 'stickerSet', ctx: InputStickerSet): void;
  showPopup(type: 'photo', ctx: { rect: DOMRect, options: PhotoOptions, photo: Photo, peer: Peer, message: Message }): void;
  showPopup(type: 'video', ctx: { rect: DOMRect, video: Document.document, peer?: Peer, message?: Message }): void;
  showPopup(type: 'confirmation', ctx: { body: string | Node, title?: string, confirmCallback: () => void }): void;
  showPopup(type: string, ctx?: any): void {
    this.popupCtx = ctx;
    this.popup.next(type);
  }

  closePopup = () => {
    this.popupCtx = undefined;
    this.popup.next('');
  };

  openSidebar<K extends SidebarState>(state: K, ctx: SidebarContext<K>): void {
    this.rightSidebarDelegate.next({ state, ctx } as any);
  }

  closeSidebar() {
    this.rightSidebarDelegate.next(undefined);
  }
}
