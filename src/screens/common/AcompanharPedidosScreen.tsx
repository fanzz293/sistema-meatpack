// src/screens/common/AcompanharPedidosScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { listarPedidos, atualizarStatusPedido, atualizarNotaFiscalPedido, Pedido, getProdutos, Produto } from '../../services/database';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import ScreenWrapper from '../../components/ScreenWrapper';
import Icon from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipagem das propriedades de navegação vinculadas à rota atual
type Props = NativeStackScreenProps<RootStackParamList, 'AcompanharPedidos'>;

export default function AcompanharPedidosScreen({ navigation }: Props) {
  // --- ESTADOS REATIVOS DA TELA ---
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'abertos' | 'concluidos'>('abertos'); // Controla a renderização condicional dos blocos de listas
  const [filtroData, setFiltroData] = useState(''); // Estado do input de pesquisa de histórico por string de data
  
  // Dicionário de Carimbos Temporais (ID Pedido -> String Data/Hora Real de Fechamento)
  // Utilizado para fins de auditoria temporal de recebimento de carga no estoque
  const [historicoDatasReais, setHistoricoDatasReais] = useState<Record<number, string>>({});

  // 1. CICLO DE INICIALIZAÇÃO DA TELA
  useEffect(() => {
    // Remove o botão de retorno nativo do cabeçalho da stack para forçar o uso do botão customizado de rodapé
    navigation.setOptions({ headerLeft: () => null });
    carregarDatasPersistidas();
    carregarDados();
  }, []);

  /**
   * Recupera do disco os horários de recebimento real das cargas já auditadas.
   */
  const carregarDatasPersistidas = async () => {
    try {
      const salvas = await AsyncStorage.getItem('@meatpack:datas_reais_entrega');
      if (salvas) setHistoricoDatasReais(JSON.parse(salvas));
    } catch (e) {
      console.error('Falha ao ler carimbos de auditoria persistidos:', e);
    }
  };

  /**
   * Dispara requisições assíncronas concorrentes (paralelas) para alimentar a tela.
   * Reduz o tempo de bloqueio de renderização (Time to Interactive) usando Promise.all.
   */
  const carregarDados = async () => {
    try { 
      const [listaPedidos, listaProdutos] = await Promise.all([listarPedidos(), getProdutos()]);
      setPedidos(listaPedidos);
      setProdutos(listaProdutos);
    } catch (error) {
      console.error('Erro na carga paralela de dados logísticos:', error);
    }
  };

  /**
   * Processa a baixa imediata da carga no armazém.
   * Comunica-se com o database.ts que incrementará o inventário e registrará a entrada no Kardex.
   */
  const handleMarcarEntregue = async (id: number) => {
    try {
      await atualizarStatusPedido(id, 'entregue'); 
      await carregarDados(); // Dá um hot-refresh nos saldos locais da FlatList
      Alert.alert('Sucesso', 'Mercadoria marcada como entregue. Movida para o histórico.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível dar baixa no pedido.');
    }
  };

  /**
   * Executa a auditoria fiscal final do ciclo de recebimento (Validação da NF).
   * Persiste o horário preciso em nível de segundo do fechamento da operação comercial.
   */
  const handleMarcarNF = async (id: number, jaRecebida: boolean) => {
    if (jaRecebida) return; // Cláusula de barreira: Impede a re-execução de validações em lotes fechados
    
    // Captura o momento exato do clique sob as regras de fuso horário de Brasília
    const momentoExatoFechamento = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    try {
      await atualizarNotaFiscalPedido(id, true);
      
      // Concatena a nova auditoria no dicionário preservando os registros anteriores
      const novosCarimbos = { ...historicoDatasReais, [id]: momentoExatoFechamento };
      setHistoricoDatasReais(novosCarimbos);
      await AsyncStorage.setItem('@meatpack:datas_reais_entrega', JSON.stringify(novosCarimbos));
      
      await carregarDados();
      
      // Força o direcionamento do fluxo do operador de volta ao estoque para conferência de saldos
      Alert.alert('Ciclo Encerrado', 'Nota Fiscal validada com sucesso!', [
        {
          text: 'Ver Estoque',
          onPress: () => {
            navigation.navigate('ConsultarEstoque', { infoMessage: 'Carga e NF auditadas com sucesso!' });
          }
        }
      ]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível validar a Nota Fiscal.');
    }
  };

  /**
   * Redutor matemático (Reduce) que varre os sub-itens agregados do pedido 
   * calculando a somatória total monetária do lote físico.
   */
  const calcularValorTotal = (pedido: Pedido): number => {
    return pedido.itens.reduce((total, item) => total + (item.quantidade * (item.precoUnitario || 0)), 0);
  };

  /**
   * Resolve em memória (Dicionário O(1)) o ID numérico do produto transformando-o
   * em sua string de descrição comercial. Evita a dependência de queries complexas com JOIN.
   */
  const getNomeProduto = (codigo: number): string => {
    const prod = produtos.find(p => p.codigo === codigo);
    return prod ? prod.descricao : `Produto #${codigo}`;
  };

  // --- FILTROS DE RENDERIZAÇÃO EM TEMPO DE EXECUÇÃO (MEMOIZAÇÃO LÓGICA) ---
  
  // Filtra em tempo de execução os pedidos que ainda encontram-se em trânsito/aguardando
  const pedidosPendentes = pedidos.filter(p => p.status === 'aguardando');
  
  // Filtra as ordens concluídas aplicando filtros cumulativos por string textuais de data
  const pedidosHistorico = pedidos.filter(p => {
    const correspondeAba = p.status === 'entregue';
    if (!correspondeAba) return false;
    
    const dataReal = historicoDatasReais[p.id] || '';
    if (filtroData) {
      const termo = filtroData.toLowerCase();
      const dataPrevisao = p.data ? p.data.toLowerCase() : '';
      // Retorna true se o termo pesquisado bater com a previsão ou com a data real de entrega
      return dataPrevisao.includes(termo) || dataReal.toLowerCase().includes(termo);
    }
    return true;
  });

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.panelCardContainer}>
          
          {/* CABEÇALHO DA TELA */}
          <AnimatedView from="top">
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Acompanhar Pedidos</Text>
              <Text style={styles.pageDescription}>Conferência de cargas pendentes e auditoria temporal.</Text>
            </View>
          </AnimatedView>

          {/* COMPONENTE COLETOR DE ABAS (TABS CONTROLLER) */}
          <AnimatedView from="top" delay={100}>
            <View style={styles.abasContainer}>
              {/* ABA: PEDIDOS EM ABERTO */}
              <TouchableOpacity style={[styles.aba, abaAtiva === 'abertos' && styles.abaAtiva]} onPress={() => setAbaAtiva('abertos')}>
                <Text style={[styles.abaTexto, abaAtiva === 'abertos' && styles.abaTextoAtiva]}>Pendentes / Em Aberto</Text>
              </TouchableOpacity>
              
              {/* ABA: HISTÓRICO CONCLUÍDO */}
              <TouchableOpacity style={[styles.aba, abaAtiva === 'concluidos' && styles.abaAtiva]} onPress={() => setAbaAtiva('concluidos')}>
                <Text style={[styles.abaTexto, abaAtiva === 'concluidos' && styles.abaTextoAtiva]}>Histórico de Entregas</Text>
              </TouchableOpacity>
            </View>
          </AnimatedView>

          {/* RENDERIZAÇÃO BIFURCADA BASEADA NA ABA ATIVA */}
          {abaAtiva === 'abertos' ? (
            // LISTA A: FLatList de Cargas Pendentes (Cards com ações de recebimento)
            <FlatList
              data={pedidosPendentes}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.pedidoCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
                      <Text style={styles.dataTexto}><Icon name="event" size={12} color="#666" /> Previsão: {item.data}</Text>
                    </View>
                    <Text style={styles.infoText}>Fornecedor: {item.fornecedor} | Total: R$ {calcularValorTotal(item).toFixed(2)}</Text>
                  </View>

                  {/* Sub-lista interna de sub-itens (Peso e especificação da carne) */}
                  <View style={styles.produtosMinilist}>
                    {item.itens.map((it, idx) => (
                      <Text key={idx} style={styles.miniItemTexto}>• {it.quantidade} kg de {getNomeProduto(it.produtoCodigo)}</Text>
                    ))}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.btnEntregue} onPress={() => handleMarcarEntregue(item.id)}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Marcar Entregue</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          ) : (
            // LISTA B: Visão de Auditoria / Tabela de Histórico Fechado com filtros de Busca
            <AnimatedView from="bottom" style={{ flex: 1 }}>
              {/* BARRA DE PESQUISA TEXTUAL DE OPERAÇÕES */}
              <View style={styles.searchBarContainer}>
                <Icon name="search" size={18} color="#666" />
                <TextInput 
                  style={styles.searchBarInput} 
                  placeholder="Pesquisar histórico por data (Ex: 18/06/2026)" 
                  value={filtroData} 
                  onChangeText={setFiltroData} 
                />
              </View>

              {/* HEADERS DA TABELA DE HISTÓRICO */}
              <View style={styles.tableHeader}>
                <Text style={[styles.hCell, { width: '15%' }]}>ID</Text>
                <Text style={[styles.hCell, { width: '35%' }]}>Entrega Real</Text>
                <Text style={[styles.hCell, { width: '25%' }]}>NF Status</Text>
                <Text style={[styles.hCell, { width: '25%' }]}>Ação</Text>
              </View>
              
              {/* LINHAS DA TABELA DO HISTÓRICO */}
              <FlatList
                data={pedidosHistorico}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum histórico encontrado.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.tableRow}>
                    <Text style={[styles.rCell, { width: '15%', fontWeight: 'bold' }]}>#{item.id}</Text>
                    <Text style={[styles.rCell, { width: '35%', color: theme.colors.success, fontWeight: '600' }]}>{item.horaEntrega || 'Entregue'}</Text>
                    <Text style={[styles.rCell, { width: '25%', fontSize: 11 }]}>{item.notaFiscalRecebida ? 'NF Recebida' : 'NF Pendente'}</Text>
                    
                    {/* Botão de Fechamento de Ciclo (Gatilho de Auditoria Fiscal) */}
                    <View style={{ width: '25%', alignItems: 'center' }}>
                      <TouchableOpacity 
                        style={[styles.btnNFTable, item.notaFiscalRecebida && styles.btnNFDesativado]} 
                        onPress={() => handleMarcarNF(item.id, item.notaFiscalRecebida)}
                        disabled={item.notaFiscalRecebida} // Trava o botão caso o lote já esteja selado/validado
                      >
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>
                          {item.notaFiscalRecebida ? 'Fechado' : 'Validar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </AnimatedView>
          )}
        </View>

        {/* BOTÃO FLUTUANTE DE RETORNO À HOMEPAGE */}
        <TouchableOpacity style={styles.floatingBottomRightBtn} onPress={() => navigation.navigate('HomeScreen')}>
          <Icon name="home" size={20} color="#FFF" />
          <Text style={styles.floatingBtnText}>Voltar ao Menu</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

// ============================================================================
// --- FOLHA DE ESTILOS DA INTERFACE (STYLESHEET) ---
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)', padding: theme.spacing.m },
  panelCardContainer: { flex: 1, width: '100%', maxWidth: 800, alignSelf: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.m },
  title: { fontSize: 26, fontWeight: 'bold', color: theme.colors.primary },
  pageDescription: { fontSize: 13, color: theme.colors.textLight, fontStyle: 'italic', marginTop: 2 },
  abasContainer: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 8, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#dcdcdc' },
  aba: { flex: 1, padding: 12, alignItems: 'center' },
  abaAtiva: { backgroundColor: theme.colors.primary },
  abaTexto: { fontWeight: '600', color: theme.colors.text, fontSize: 13 },
  abaTextoAtiva: { color: '#FFF' },
  listContent: { paddingBottom: 100 },
  pedidoCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e3e3e3' },
  cardHeader: { flexDirection: 'column', paddingBottom: 6, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pedidoId: { fontSize: 15, fontWeight: 'bold', color: theme.colors.primary },
  dataTexto: { fontSize: 12, color: '#555', marginTop: 2 },
  infoText: { fontSize: 13, color: '#444', fontWeight: '500', marginTop: 4 },
  produtosMinilist: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 6, marginBottom: 10 },
  miniItemTexto: { fontSize: 12, color: '#555' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  btnEntregue: { backgroundColor: theme.colors.success, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  btnNFTable: { backgroundColor: theme.colors.warning, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4 },
  btnNFDesativado: { backgroundColor: '#90a4ae', opacity: 0.6 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 12, marginBottom: 15, height: 40 },
  searchBarInput: { flex: 1, marginLeft: 8, fontSize: 13 },
  tableHeader: { flexDirection: 'row', backgroundColor: theme.colors.primary, padding: 10, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  hCell: { color: '#FFF', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  tableRow: { flexDirection: 'row', backgroundColor: '#FFF', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  rCell: { fontSize: 12, color: '#333', textAlign: 'center' },
  emptyText: { textAlign: 'center', padding: 20, color: theme.colors.textLight, fontStyle: 'italic' },
  floatingBottomRightBtn: { position: 'absolute', bottom: 15, right: 15, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, zIndex: 9999 },
  floatingBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 13 }
});