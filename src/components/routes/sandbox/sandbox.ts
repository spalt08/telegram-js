import { div } from 'core/html';
import message from './message/message';
import './sandbox.scss';

export default function sandbox() {
  return div`.sandbox.like-chat`(
    message({ msg: 'Test', image: 'https://theecologist.org/sites/default/files/styles/inline_l/public/2018-05/contre_jour_leaves_lens_flare_meadow_nature_park_sky_summer-948356.jpg?itok=JqgRwHxm', out: true }),
    message({ msg: 'Какая браузеру разница откуда грузить? Если ты сложишь шрифты локально, то конечно они будет мгновенно грузиться с localhost. Но реальный сервер, на который будет загружено наше решение для тестирования, так же далеко от браузера, как сервер Google, поэтому загрузка будет идти одинаково долго.', out: false }),
  );
}
