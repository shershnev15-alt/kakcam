import { FoundationScreen } from '../../src/components/foundation-screen';

export default function ProfileScreen() {
  return (
    <FoundationScreen
      eyebrow="GUEST MODE"
      title="Ваш профиль"
      copy="Избранное доступно без регистрации. Войдите позже, чтобы синхронизировать его между устройствами."
    />
  );
}
