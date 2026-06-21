// src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { theme } from '../styles/theme';
import HomeScreen from '../screens/common/HomeScreen';
import CadastrarProdutoScreen from '../screens/common/CadastrarProdutoScreen';
import ConsultarEstoqueScreen from '../screens/common/ConsultarEstoqueScreen';
import AdicionarPedidoScreen from '../screens/common/AdicionarPedidoScreen';
import AcompanharPedidosScreen from '../screens/common/AcompanharPedidosScreen';
import RegistrarSaidaScreen from '../screens/common/RegistrarSaidaScreen';
import HistoricoProdutoScreen from '../screens/common/HistoricoProdutoScreen';
import { Produto } from '../services/database';

export type RootStackParamList = {
  HomeScreen: undefined;
  CadastrarProduto: undefined;
  ConsultarEstoque: { infoMessage?: string } | undefined; // Permite receber o Toast temporário
  AdicionarPedido: { produtoPreSelecionado?: Produto };
  AcompanharPedidos: { refresh?: boolean };
  RegistrarSaida: undefined;
  HistoricoProduto: { produto: Produto };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen} 
        options={{ 
          title: 'Menu Principal',
          headerTransparent: Platform.OS === 'web',
          headerTintColor: Platform.OS === 'web' ? '#ffffff' : theme.colors.text,
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen name="CadastrarProduto" component={CadastrarProdutoScreen} options={{ title: 'Cadastrar Produto' }} />
      <Stack.Screen name="ConsultarEstoque" component={ConsultarEstoqueScreen} options={{ title: 'Consultar Estoque' }} />
      <Stack.Screen name="AdicionarPedido" component={AdicionarPedidoScreen} options={{ title: 'Adicionar Pedido' }} />
      <Stack.Screen name="AcompanharPedidos" component={AcompanharPedidosScreen} options={{ title: 'Acompanhar Pedidos' }} />
      <Stack.Screen name="RegistrarSaida" component={RegistrarSaidaScreen} options={{ title: 'Registrar Saída' }} />
      <Stack.Screen name="HistoricoProduto" component={HistoricoProdutoScreen} options={{ title: 'Histórico do Produto' }} />
    </Stack.Navigator>
  );
}