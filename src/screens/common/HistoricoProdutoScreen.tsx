// src/screens/common/HistoricoProdutoScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';
import { getHistoricoProduto, HistoricoMovimento } from '../../services/database';

// Tipagem das propriedades de navegação herdadas do stack mestre da aplicação
type Props = NativeStackScreenProps<RootStackParamList, 'HistoricoProduto'>;

export default function HistoricoProdutoScreen({ route, navigation }: Props) {
  // Captura o objeto do produto encaminhado via parâmetro de rota pelo componente pai
  const { produto } = route.params;
  
  // --- ESTADOS REATIVOS DA INTERFACE ---
  const [historico, setHistorico] = useState<HistoricoMovimento[]>([]);

  // 1. CICLO DE INICIALIZAÇÃO DA TELA
  useEffect(() => {
    carregarHistorico();
  }, []);

  /**
   * Consulta a linha do tempo de movimentações (Kardex) do produto específico.
   * Alimenta a query utilizando o 'codigo' como chave identificadora única.
   */
  const carregarHistorico = async () => {
    try {
      const historicoData = await getHistoricoProduto(produto.codigo);
      setHistorico(historicoData);
    } catch (error) {
      console.error('Erro ao carregar histórico de movimentações:', error);
    }
  };

  /**
   * Função de renderização atômica para cada linha do histórico.
   * Aplica um crachá (Badge) visual colorido para diferenciar instantaneamente Entradas de Saídas.
   */
  const renderItem = ({ item }: { item: HistoricoMovimento }) => (
    <AnimatedView from="right">
      <View style={styles.historicoItem}>
        
        {/* CABEÇALHO DO ITEM: DATA DA OPERAÇÃO E CRACHÁ DE TIPO */}
        <View style={styles.itemHeader}>
          <Text style={styles.data}>{new Date(item.data).toLocaleDateString('pt-BR')}</Text>
          
          {/* Aplica estilização condicional (Verde Floresta para Entrada / Vermelho para Saída) */}
          <View style={[styles.tipoBadge, item.tipo === 'entrada' ? styles.entradaBadge : styles.saidaBadge]}>
            <Text style={styles.tipoText}>
              {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
            </Text>
          </View>
        </View>
        
        {/* CORPO DO ITEM: VOLUME MOVIMENTADO E MOTIVAÇÃO OPERACIONAL */}
        <View style={styles.itemInfo}>
          <Text style={styles.quantidade}>{item.quantidade} kg</Text>
          <Text style={styles.motivo}>{item.motivo}</Text>
        </View>
        
        {/* SEÇÃO OPCIONAL: VÍNCULO LOGÍSTICO COMPLEMENTAR */}
        {/* Caso a entrada tenha sido gerada por um recebimento de pedido, renderiza o ID de rastreio */}
        {item.pedidoId && (
          <Text style={styles.pedidoInfo}>Pedido #{item.pedidoId}</Text>
        )}
        
      </View>
    </AnimatedView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* TEXTURA VISUAL COMPLEMENTAR DE FUNDO (TEXTURA DE MADEIRA) */}
      <ImageBackground 
        source={require('../../../assets/wood-background.jpg')}
        style={styles.background}
        blurRadius={1}
      >
        <View style={styles.container}>
          
          {/* CABEÇALHO DA TELA */}
          <AnimatedView from="top">
            <View style={styles.header}>
              <Text style={styles.title}>Histórico</Text>
              <Text style={styles.subtitle}>{produto.descricao}</Text>
            </View>
          </AnimatedView>

          {/* LISTAGEM PRINCIPAL: CRONOGRAMA DE OPERAÇÕES */}
          <FlatList
            data={historico}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            // 'ListEmptyComponent' gerencia de forma elegante o estado visual caso o produto não possua registros
            ListEmptyComponent={
              <AnimatedView from="fade">
                <View style={styles.emptyContainer}>
                  <Icon name="history" size={64} color={theme.colors.textLight} />
                  <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
                </View>
              </AnimatedView>
            }
          />
          
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

// ============================================================================
// --- FOLHA DE ESTILOS DA INTERFACE (STYLESHEET) ---
// ============================================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(245, 245, 220, 0.9)', // Aplica uma máscara bege clara semitransparente sobre a textura
    padding: theme.spacing.m,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.s,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  historicoItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    ...theme.shadows.s,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  data: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  tipoBadge: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.s,
  },
  entradaBadge: {
    backgroundColor: theme.colors.success, // Verde Floresta para entradas fiscais/logísticas
  },
  saidaBadge: {
    backgroundColor: theme.colors.error,   // Vermelho para saídas físicas/avarias
  },
  tipoText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  quantidade: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  motivo: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  pedidoInfo: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.m,
    textAlign: 'center',
  },
});