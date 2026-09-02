import type { HttpRequest } from '../http.types';

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
};

export type SessionContext = {
  id: string;
  token: string;
};

export type AuthenticatedRequest = HttpRequest & {
  auth?: AuthenticatedUser;
  authSession?: SessionContext;
};

export type RegistrationInput = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginInput = {
  email: string;
  password: string;
};
