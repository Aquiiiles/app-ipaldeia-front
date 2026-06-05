import { auth } from './firebase';

const ADMIN_EMAILS = [
  'aquilesvelox@gmail.com',
  'aquiles.kds@gmail.com',
];

export function isAdmin(): boolean {
  const user = auth.currentUser;
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}
