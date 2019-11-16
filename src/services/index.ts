import AuthService from './auth';
import DialogService from './dialog';
import MessageService from './message';
import FileService from './file';

export const auth = new AuthService();
export const dialog = new DialogService();
export const message = new MessageService();
export const file = new FileService();


// todo remove debug
(window as any).dialog = dialog;
