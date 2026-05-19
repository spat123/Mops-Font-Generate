import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { markHasSignedInBefore } from '../../utils/authReturningUser';

/** Запоминает в localStorage, что пользователь уже входил (для «С возвращением!» на /auth/signin). */
export function AuthReturningUserMarker() {
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      markHasSignedInBefore();
    }
  }, [status]);

  return null;
}
