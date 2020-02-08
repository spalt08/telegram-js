import AuthService from './auth';
import DialogService from './dialog';
import MessageService from './message';
import MainService from './main';
import MediaService from './media';

export const main = new MainService();
export const auth = new AuthService();
export const message = new MessageService();
export const dialog = new DialogService();
export const media = new MediaService();
