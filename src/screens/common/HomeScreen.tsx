// src/screens/common/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import ScreenWrapper from '../../components/ScreenWrapper';

// Ignora checagens estritas do TypeScript para pacotes externos de ícones sem declaração de tipos global
// @ts-ignore
import Icon from '@expo/vector-icons/MaterialIcons';

// Tipagem das propriedades de navegação herdadas do Stack principal
type Props = NativeStackScreenProps<RootStackParamList, 'HomeScreen'>;

/**
 * Menu Principal (Home Dashboard).
 * Atua como o centro de comando tático do aplicativo, distribuindo atalhos estruturados 
 * para todas as vertentes operacionais e exibindo informações de identificação do perfil logado.
 */
export default function HomeScreen({ navigation, route }: Props) {
  // 1. DESESTRUTURAÇÃO DEFENSIVA DE PARÂMETROS DE ROTA
  // Captura o objeto do usuário enviado no ato do login bem-sucedido
  const usuario = route.params?.usuarioLogado;
  
  // Cláusula Fallback: Tenta ler o nome completo, senão usa o apelido, e por fim define uma string padrão
  const nomeExibicao = usuario ? usuario.nomeCompleto || usuario.apelido : 'Operador';

  // Importação direta de asset local para renderização de plano de fundo interno complementar
  const fundoMadeira = require('../../../assets/wood-background.jpg'); 

  return (
    <ScreenWrapper>
      <ImageBackground source={fundoMadeira} style={styles.background} resizeMode="cover">
        {/* 'overlayContainer' insere um filtro escurecido sutil sobre a imagem para destacar os textos */}
        <View style={styles.overlayContainer}>
          
          {/* 'contentLimiter' atua como barreira de largura responsiva para layouts abertos na Web */}
          <View style={styles.contentLimiter}>
            
            {/* ============================================================================
                --- SEÇÃO A: HEADER DE BOAS-VINDAS E IDENTIFICAÇÃO DE PERFIL ---
                ============================================================================ */}
            <View style={styles.welcomeHeader}>
              <View>
                <Text style={styles.welcomeText}>Olá, {nomeExibicao}!</Text>
                <Text style={styles.subWelcome}>Painel Logístico Meatpack</Text>
              </View>
              {/* Ícone representativo de avatar/conta corporativa */}
              <Icon name="account-circle" size={40} color={theme?.colors?.primary || '#7A1E1E'} />
            </View>

            {/* ============================================================================
                --- SEÇÃO B: GRID OPERACIONAL DE DIRECIONAMENTO (MENU ATALHOS) ---
                ============================================================================ */}
            <View style={styles.menuGrid}>
              
              {/* 1. CONSULTAR PRODUTO (INVENTÁRIO) */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('ConsultarEstoque')}
              >
                <Icon name="inventory" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Consultar Produto</Text>
              </TouchableOpacity>

              {/* 2. CADASTRAR PRODUTO (ENTRADA DE LOTES) */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('CadastrarProduto')}
              >
                <Icon name="add-box" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Cadastrar Produto</Text>
              </TouchableOpacity>

              {/* 3. ADICIONAR PEDIDO (ORDENS DE COMPRA) */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('AdicionarPedido')}
              >
                <Icon name="add-shopping-cart" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Adicionar Pedido</Text>
              </TouchableOpacity>

              {/* 4. ACOMPANHAR PEDIDOS (CONFERÊNCIA DE CARGAS) */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('AcompanharPedidos')}
              >
                <Icon name="assignment" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Acompanhar Pedidos</Text>
              </TouchableOpacity>

              {/* 5. REGISTRAR SAÍDA (BAIXAS IMEDIATAS / MOVIMENTAÇÃO) */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('RegistrarSaida')}
              >
                <Icon name="local-shipping" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Registrar Saída</Text>
              </TouchableOpacity>

              {/* 6. CONFIGURAÇÕES / SENHA (PAINEL ADMINISTRATIVO DE OPERADORES) */}
              {/* Repassa dinamicamente o objeto do usuário logado para validação de privilégios de Admin na tela de destino */}
              <TouchableOpacity 
                style={[styles.menuItem, styles.configItem]} 
                onPress={() => navigation.navigate('Configuracoes', { usuarioAtual: usuario })}
              >
                <Icon name="settings" size={26} color="#555" style={styles.iconSpacing} />
                <Text style={styles.menuText}>Configurações de contas</Text>
              </TouchableOpacity>

            </View>

            {/* ============================================================================
                --- SEÇÃO C: ENCERRAMENTO DE SESSÃO (LOGOUT SEGURANÇA) ---
                ============================================================================ */}
            {/* NOTA OPERACIONAL: O método '.replace()' é utilizado estrategicamente no lugar do '.navigate()'.
                Isso destrói completamente o histórico da pilha anterior, impedindo que o operador consiga 
                clicar no botão 'Voltar' físico do aparelho (Android) para retornar ao painel sem credenciais válidas. */}
            <TouchableOpacity 
              style={styles.btnLogout} 
              onPress={() => navigation.replace('Login')}
            >
              <Icon name="logout" size={18} color="#FFF" />
              <Text style={styles.btnLogoutTexto}>Desconectar do Sistema</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ImageBackground>
    </ScreenWrapper>
  );
}

// ============================================================================
// --- FOLHA DE ESTILOS DA INTERFACE (STYLESHEET) ---
// ============================================================================
const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlayContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: theme?.spacing?.m || 16, justifyContent: 'center' },
  
  // Limita a largura em 550px no ambiente de navegadores desktop (Web) para manter a coerência visual do dashboard
  contentLimiter: { width: '100%', maxWidth: Platform.OS === 'web' ? 550 : '100%', alignSelf: 'center' },
  
  welcomeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#e3e3e3',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4
  },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: theme?.colors?.primary || '#7A1E1E' },
  subWelcome: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  menuGrid: { flexDirection: 'column', gap: 10 },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    padding: 16, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#e0e0e0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
  },
  // Injeta uma cor de fundo ligeiramente diferenciada (cinza neutro) para sinalizar o bloco de parametrizações do sistema
  configItem: { backgroundColor: 'rgba(242, 242, 242, 0.98)', borderColor: '#ccc' },
  iconSpacing: { marginRight: 14 },
  menuText: { fontSize: 16, fontWeight: '600', color: theme?.colors?.text || '#333' },
  btnLogout: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#c62828', // Alerta em tom vermelho vivo para sinalizar saída
    padding: 12, 
    borderRadius: 6, 
    marginTop: 20, 
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 24
  },
  btnLogoutTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 }
});