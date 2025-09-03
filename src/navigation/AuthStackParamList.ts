// src/navigation/AuthStackParamList.ts
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  Verification: { email: string; telefone: string };
};