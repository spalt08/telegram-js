import AuthService from './auth';
import DialogService from './dialog';
import MessageService from './message';
import MainService from './main';
import MediaService from './media';
import UserService from './user';
import ChatService from './chat';
import MessageSearchService from './message_search/message_search';

export { RightSidebarPanel } from './main';

export const main = new MainService();
export const auth = new AuthService();
export const message = new MessageService();
export const dialog = new DialogService();
export const media = new MediaService();
export const user = new UserService();
export const chat = new ChatService();
export const messageSearch = new MessageSearchService();
