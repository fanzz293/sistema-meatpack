// C:/Users/fabri/system-meatpack/src/App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native'; // IMPORTAÇÃO OBRIGATÓRIA
import { initDB } from './services/database'; 
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    try {
      // Inicializa o banco de dados e cria a tabela 'clientes' antes do login
      initDB();
      console.log('Banco de dados Meatpack inicializado com sucesso.');
    } catch (error) {
      console.error('Erro ao inicializar o banco:', error);
    }
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}