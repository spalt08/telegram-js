
import { PhotoOptions } from 'helpers/other';
import { Message, Photo } from 'mtproto-js';
import { main } from 'services';
import photoRenderer from './photo';


export default function photoPreview(photo: Photo.photo, options: PhotoOptions, message: Message.message) {
  if (photo._ !== 'photo') return null;
  return photoRenderer(photo, options, (opener) => main.showPopup('gallery', { message, opener }));
}
