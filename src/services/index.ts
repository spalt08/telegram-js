import AuthService from './auth';
import DialogService from './dialog';
import MessageService from './message';
import FileService from './file';

export const auth = new AuthService();
export const file = new FileService();
export const message = new MessageService();
export const dialog = new DialogService();


// todo remove debug
(window as any).dialog = dialog;
