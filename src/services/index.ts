import AuthService from './auth';
import DialogService from './dialog';
import MessageService from './message';
import MainService from './main';
import MediaService from './media';
import PeerService from './peer';
import MessageSearchService from './message_search/message_search';
import UserTyping from './user_typing';

export { RightSidebarPanel } from './main';

export const main = new MainService();
export const auth = new AuthService();
export const userTyping = new UserTyping();
export const peer = new PeerService();
export const message = new MessageService(userTyping, peer);
export const dialog = new DialogService();
export const media = new MediaService();
export const messageSearch = new MessageSearchService();
