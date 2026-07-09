// src/navigation/AuthNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- IMPORTAÇÃO DOS COMPONENTES DE TELA (SCREENS DE AUTENTICAÇÃO) ---
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import VerificationScreen from '../screens/auth/VerificationScreen'; 

// --- IMPORTAÇÃO DA TIPAGEM DE ROTAS ---
import { AuthStackParamList } from './AuthStackParamList';

// ============================================================================
// --- INSTANCIAÇÃO DO NAVEGADOR DE AUTENTICAÇÃO ---
// ============================================================================
// Cria a pilha de navegação injetando a assinatura de tipos exclusiva do fluxo de credenciais.
// Isso impede o desenvolvedor de tentar navegar para uma tela de estoque de dentro deste fluxo isolado.
const Stack = createNativeStackNavigator<AuthStackParamList>();

// ============================================================================
// --- COMPONENTE DE NAVEGAÇÃO DE AUTENTICAÇÃO (AUTH NAVIGATOR) ---
// ============================================================================
export default function AuthNavigator() {
  return (
    // Altere para incluir o id:
<Stack.Navigator id={undefined} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
       {/* Tela Inicial do Fluxo: Ponto de partida para inserção de credenciais do operador */}
       <Stack.Screen name="Login" component={LoginScreen} />
       
       {/* Tela de Cadastro: Formulário de entrada para novos operadores de estoque */}
       <Stack.Screen name="Signup" component={SignupScreen} />
       
       {/* Tela de Validação: Camada intermediária de auditoria via Token/Código enviado por e-mail */}
       <Stack.Screen name="Verification" component={VerificationScreen} /> 
    </Stack.Navigator>
  );
}