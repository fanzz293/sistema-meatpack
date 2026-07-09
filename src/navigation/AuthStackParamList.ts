// src/navigation/AuthStackParamList.ts

/**
 * Definição de Tipos para a Pilha de Autenticação (Auth Stack).
 * * Este tipo funciona como um dicionário central que informa ao React Navigation
 * o nome exato de cada tela pertencente ao fluxo de credenciais/onboarding
 * e quais os formatos de parâmetros (Payload) exigidos no ato da navegação.
 */
export type AuthStackParamList = {
  // 'undefined' indica que a tela de Login não necessita de parâmetros para ser aberta
  Login: undefined;
  
  // 'undefined' indica que a tela de Cadastro de Operador é aberta limpa, sem dependências
  Signup: undefined;
  
  /**
   * A tela de Verificação de Código exige obrigatoriamente um objeto de dados
   * contendo os canais de contato do operador para fins de auditoria e disparo de tokens.
   */
  Verification: { 
    email: string;    // Endereço de e-mail do operador que acabou de se cadastrar
    telefone: string; // Número de telefone celular informado para envio de alertas/SMS
  };
};