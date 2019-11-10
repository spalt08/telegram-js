import loginCode from './login_code';

interface Props {
  phone: string;
}

export default function loginCodeContainer({ phone }: Props) {
  return loginCode({ phone });
}
