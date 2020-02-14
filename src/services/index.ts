import AuthService from './auth';
import DialogService from './dialog';
import MessageService from './message/message';
import MainService from './main';
import MediaService from './media';
import PeerService from './peer';
import MessageSearchService from './message_search/message_search';
import UserTyping from './user_typing';
import UserService from './user';

export { RightSidebarPanel } from './main';

export const main = new MainService();
export const auth = new AuthService();
export const user = new UserService();
export const userTyping = new UserTyping();
export const message = new MessageService();
export const peer = new PeerService(message);
export const dialog = new DialogService(message);
export const media = new MediaService(main);
export const messageSearch = new MessageSearchService();
