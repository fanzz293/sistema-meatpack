// src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- IMPORTAÇÃO DOS COMPONENTES DE TELA (SCREENS) ---
import LoginScreen from '../screens/auth/LoginScreen'; 
import HomeScreen from '../screens/common/HomeScreen';
import ConsultarEstoqueScreen from '../screens/common/ConsultarEstoqueScreen';
import AcompanharPedidosScreen from '../screens/common/AcompanharPedidosScreen';
import ConfiguracoesScreen from '../screens/common/ConfiguracoesScreen';
import AdicionarPedidoScreen from '../screens/common/AdicionarPedidoScreen';
import RegistrarSaidaScreen from '../screens/common/RegistrarSaidaScreen';
import CadastrarProdutoScreen from '../screens/common/CadastrarProdutoScreen'; 
import HistoricoProdutoScreen from '../screens/common/HistoricoProdutoScreen';

// ============================================================================
// --- DEFINIÇÃO DO PARAM LIST (TIPAGEM DE ROTAS) ---
// ============================================================================
/**
 * O RootStackParamList define estritamente quais telas existem na navegação principal
 * e quais parâmetros cada rota espera receber ou carregar ao ser invocada.
 * Isso garante segurança (Type Safety) e autocomplete em chamadas como: navigation.navigate('Tela', { ... })
 */
export type RootStackParamList = {
  Login: undefined; // 'undefined' significa que a rota não exige nem recebe parâmetros de inicialização
  
  HomeScreen: { usuarioLogado: any } | undefined; // Carrega os metadados brutos do operador autenticado no login
  
  ConsultarEstoque: { 
    infoMessage?: string;               // Mensagem de feedback opcional (ex: "Produto atualizado com sucesso!")
    abrirCadastroAutomatico?: boolean;  // Trigger opcional para fluxos automatizados de entrada
  } | undefined;
  
  AcompanharPedidos: { refresh?: boolean } | undefined; // Força a releitura de pedidos pendentes
  
  Configuracoes: { usuarioAtual: any }; // Exige obrigatoriamente os dados do usuário para controle de permissões (Admin/Operador)
  
  AdicionarPedido: { produtoPreSelecionado: any } | undefined; // Permite abrir a tela já vinculando um item específico do estoque
  
  RegistrarSaida: undefined;
  
  CadastrarProduto: undefined; 
  
  HistoricoProduto: { produto: any }; // Exige obrigatoriamente o objeto do produto para renderizar o Kardex correspondente
};

// ============================================================================
// --- INSTANCIAÇÃO DO NAVEGADOR NATIVO ---
// ============================================================================
// Cria o par de componentes Stack (Navigator e Screen) injetando as tipagens de rotas configuradas acima.
// O 'native-stack' utiliza os componentes nativos de navegação do iOS e Android (Performance superior ao JS Stack)
const Stack = createNativeStackNavigator<RootStackParamList>();

// ============================================================================
// --- COMPONENTE DE NAVEGAÇÃO PRINCIPAL (APP NAVIGATOR) ---
// ============================================================================
export default function AppNavigator() {
  return (
    // 'initialRouteName' define o ponto de entrada visual padrão assim que o container é montado
    <Stack.Navigator initialRouteName="Login">
      
      {/* Fluxo de Segurança: Login inicial sem barras de cabeçalho nativas */}
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }} 
      />
      
      {/* Menu Principal: Controle logístico centralizado (Cabeçalho oculto em favor do header customizado da tela) */}
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen} 
        options={{ title: 'Menu Principal', headerShown: false }} 
      />
      
      {/* --- ROTAS OPERACIONAIS E OPERAÇÕES DE ESTOQUE --- */}
      <Stack.Screen 
        name="ConsultarEstoque" 
        component={ConsultarEstoqueScreen} 
        options={{ title: 'Consultar Estoque' }} 
      />
      
      <Stack.Screen 
        name="AcompanharPedidos" 
        component={AcompanharPedidosScreen} 
        options={{ title: 'Acompanhar Pedidos' }} 
      />
      
      <Stack.Screen 
        name="Configuracoes" 
        component={ConfiguracoesScreen} 
        options={{ title: 'Configurações de Conta' }} 
      />
      
      <Stack.Screen 
        name="AdicionarPedido" 
        component={AdicionarPedidoScreen} 
        options={{ title: 'Novo Pedido' }} 
      />
      
      <Stack.Screen 
        name="RegistrarSaida" 
        component={RegistrarSaidaScreen} 
        options={{ title: 'Registrar Saída' }} 
      />
      
      <Stack.Screen 
        name="CadastrarProduto" 
        component={CadastrarProdutoScreen} 
        options={{ title: 'Cadastrar Produto' }} 
      />
      
      <Stack.Screen 
        name="HistoricoProduto" 
        component={HistoricoProdutoScreen} 
        options={{ title: 'Histórico do Produto' }} 
      />
      
    </Stack.Navigator>
  );
}