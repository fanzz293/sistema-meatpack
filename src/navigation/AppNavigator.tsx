// src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/common/HomeScreen';
import CadastrarProdutoScreen from '../screens/common/CadastrarProdutoScreen';
import ConsultarEstoqueScreen from '../screens/common/ConsultarEstoqueScreen';
import AdicionarPedidoScreen from '../screens/common/AdicionarPedidoScreen';
import AcompanharPedidosScreen from '../screens/common/AcompanharPedidosScreen';
import { Produto } from '../services/database';

export type RootStackParamList = {
  HomeScreen: undefined;
  CadastrarProduto: undefined;
  ConsultarEstoque: undefined;
  AdicionarPedido: { produtoPreSelecionado?: Produto }; // Adicione esta linha
  AcompanharPedidos: { refresh?: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Menu Principal' }} />
      <Stack.Screen name="CadastrarProduto" component={CadastrarProdutoScreen} options={{ title: 'Cadastrar Produto' }} />
      <Stack.Screen name="ConsultarEstoque" component={ConsultarEstoqueScreen} options={{ title: 'Consultar Estoque' }} />
      <Stack.Screen name="AdicionarPedido" component={AdicionarPedidoScreen} options={{ title: 'Adicionar Pedido' }} />
      <Stack.Screen name="AcompanharPedidos" component={AcompanharPedidosScreen} options={{ title: 'Acompanhar Pedidos' }} />
    </Stack.Navigator>
  );
}