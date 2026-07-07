// src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen'; 
import HomeScreen from '../screens/common/HomeScreen';
import ConsultarEstoqueScreen from '../screens/common/ConsultarEstoqueScreen';
import AcompanharPedidosScreen from '../screens/common/AcompanharPedidosScreen';
import ConfiguracoesScreen from '../screens/common/ConfiguracoesScreen';
import AdicionarPedidoScreen from '../screens/common/AdicionarPedidoScreen';
import RegistrarSaidaScreen from '../screens/common/RegistrarSaidaScreen';
import CadastrarProdutoScreen from '../screens/common/CadastrarProdutoScreen'; // Certifique-se de que o arquivo no disco tem este nome exato
import HistoricoProdutoScreen from '../screens/common/HistoricoProdutoScreen';

export type RootStackParamList = {
  Login: undefined;
  HomeScreen: { usuarioLogado: any } | undefined;
  ConsultarEstoque: { infoMessage?: string; abrirCadastroAutomatico?: boolean } | undefined;
  AcompanharPedidos: { refresh?: boolean } | undefined;
  Configuracoes: { usuarioAtual: any };
  AdicionarPedido: { produtoPreSelecionado: any } | undefined;
  RegistrarSaida: undefined;
  CadastrarProduto: undefined; 
  HistoricoProduto: { produto: any }; 
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Menu Principal', headerShown: false }} />
      <Stack.Screen name="ConsultarEstoque" component={ConsultarEstoqueScreen} options={{ title: 'Consultar Estoque' }} />
      <Stack.Screen name="AcompanharPedidos" component={AcompanharPedidosScreen} options={{ title: 'Acompanhar Pedidos' }} />
      <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} options={{ title: 'Configurações de Conta' }} />
      <Stack.Screen name="AdicionarPedido" component={AdicionarPedidoScreen} options={{ title: 'Novo Pedido' }} />
      <Stack.Screen name="RegistrarSaida" component={RegistrarSaidaScreen} options={{ title: 'Registrar Saída' }} />
      <Stack.Screen name="CadastrarProduto" component={CadastrarProdutoScreen} options={{ title: 'Cadastrar Produto' }} />
      <Stack.Screen name="HistoricoProduto" component={HistoricoProdutoScreen} options={{ title: 'Histórico do Produto' }} />
    </Stack.Navigator>
  );
}