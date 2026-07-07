// src/screens/common/ConsultarEstoqueScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { getProdutos, searchProdutos, deleteProduto, updateProduto, Produto } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import ScreenWrapper from '../../components/ScreenWrapper';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'ConsultarEstoque'>;
type AtributoOrdenacao = 'codigo' | 'descricao' | 'categoria' | 'valorTotal';
type DirecaoOrdenacao = 'asc' | 'desc';

const formatCurrency = (value: number | undefined): string => {
  return (value === undefined || value === null || isNaN(value)) ? '0,00' : value.toFixed(2);
};

const ConsultarEstoqueScreen: React.FC<Props> = ({ navigation, route }) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [ordenarPor, setOrdenarPor] = useState<AtributoOrdenacao>('descricao');
  const [direcao, setDirecao] = useState<DirecaoOrdenacao>('asc');
  const [animationKey, setAnimationKey] = useState(0);

  // CONTROLES DOS MODAIS CUSTOMIZADOS
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [modalOpcoesVisivel, setModalOpcoesVisivel] = useState(false);
  const [modalConfirmacaoVisivel, setModalConfirmacaoVisivel] = useState(false);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);

  // ESTADOS FORMULÁRIO DE EDIÇÃO INLINE
  const [editCodigo, setEditCodigo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editFornecedor, setEditFornecedor] = useState('');

  const carregarProdutos = async () => {
    try {
      const lista = await getProdutos();
      setProdutos(lista);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregarProdutos();
      setAnimationKey(prev => prev + 1);
    }, [])
  );

  useEffect(() => {
    const params = route.params as any;
    if (params?.infoMessage) {
      exibirToast(params.infoMessage);
      navigation.setParams({ infoMessage: undefined } as any);
    }
  }, [route.params]);

  const exibirToast = (mensagem: string) => {
    setToastMessage(mensagem);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarProdutos();
    setAnimationKey(prev => prev + 1);
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query) {
      const resultados = await searchProdutos(query);
      setProdutos(resultados);
    } else {
      carregarProdutos();
    }
  };

  const handleAbreOpcoesItem = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setModalOpcoesVisivel(true);
  };

  // Abre o Modal de Edição populando os campos controlados
  const handleAcaoEditar = () => {
    setModalOpcoesVisivel(false);
    if (produtoSelecionado) {
      setEditCodigo(produtoSelecionado.codigo.toString());
      setEditDescricao(produtoSelecionado.descricao);
      setEditFornecedor(produtoSelecionado.fornecedor || '');
      setTimeout(() => setModalEdicaoVisivel(true), 150);
    }
  };

  // Executa o update persistindo as alterações no SQLite / WebStorage
  const handleSalvarEdicao = async () => {
    if (!produtoSelecionado) return;
    
    const codigoNovo = parseInt(editCodigo.trim(), 10);
    if (isNaN(codigoNovo) || !editDescricao.trim() || !editFornecedor.trim()) {
      exibirToast('Erro: Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const produtoAtualizado: Produto = {
        ...produtoSelecionado,
        codigo: codigoNovo,
        descricao: editDescricao.trim(),
        fornecedor: editFornecedor.trim(),
      };

      // Dispara a query passando o objeto e a chave de busca original secundária
      await updateProduto(produtoAtualizado, produtoSelecionado.codigo);
      
      setModalEdicaoVisivel(false);
      exibirToast('produto updated com sucesso!'); // Feedback visual solicitado
      carregarProdutos(); // Hot-reload da FlatList
    } catch (error) {
      console.error(error);
      exibirToast('Erro: Não foi possível atualizar o produto.');
    } finally {
      setProdutoSelecionado(null);
    }
  };

  const handleAcaoAbrirConfirmacao = () => {
    setModalOpcoesVisivel(false);
    setTimeout(() => setModalConfirmacaoVisivel(true), 150);
  };

  const executarExclusao = async () => {
    if (!produtoSelecionado) return;
    setModalConfirmacaoVisivel(false);
    try {
      await deleteProduto(produtoSelecionado.codigo);
      exibirToast('Item excluído com sucesso!');
      carregarProdutos();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      exibirToast('Erro: Falha ao tentar excluir o produto.');
    } finally {
      setProdutoSelecionado(null);
    }
  };

  const obterProdutosProcessados = () => {
    let resultado = [...produtos];
    resultado.sort((a, b) => {
      let valorA: any = a[ordenarPor as keyof Produto];
      let valorB: any = b[ordenarPor as keyof Produto];

      if (ordenarPor === 'valorTotal') {
        valorA = a.quantidade * a.precoUnitario;
        valorB = b.quantidade * b.precoUnitario;
      }

      if (typeof valorA === 'string' && typeof valorB === 'string') {
        return direcao === 'asc' ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
      }
      return direcao === 'asc' ? valorA - valorB : valorB - valorA;
    });
    return resultado;
  };

  const renderItem = ({ item, index }: { item: Produto; index: number }) => (
    <AnimatedView key={`${animationKey}-${item.codigo}`} from="right" delay={index * 30} duration={350}>
      <TouchableOpacity style={styles.tableRow} onPress={() => handleAbreOpcoesItem(item)} activeOpacity={0.7}>
        <Text style={[styles.tableCell, styles.codeCell]}>{item.codigo}</Text>
        <Text style={[styles.tableCell, styles.descCell]} numberOfLines={1}>{item.descricao}</Text>
        <Text style={[styles.tableCell, styles.catCell]}>{item.categoria}</Text>
        <Text style={[styles.tableCell, styles.qtyCell]}>{item.quantidade} kg</Text>
        <Text style={[styles.tableCell, styles.priceCell]}>R$ {formatCurrency(item.precoUnitario)}</Text>
        <Text style={[styles.tableCell, styles.totalCell]}>R$ {formatCurrency(item.quantidade * item.precoUnitario)}</Text>
      </TouchableOpacity>
    </AnimatedView>
  );

  return (
    <ScreenWrapper>
      {toastMessage && (
        <AnimatedView from="top" style={styles.toastBanner}>
          <Icon name="check-circle" size={20} color="#FFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </AnimatedView>
      )}

      <View style={styles.container}>
        <View style={styles.panelCardContainer}>
          
          <AnimatedView key={`header-${animationKey}`} from="top" duration={400}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Consultar Estoque</Text>
              <Text style={styles.pageDescription}>
                Clique em uma linha da tabela para gerenciar ou apagar o item correspondente.
              </Text>
            </View>
          </AnimatedView>

          <AnimatedView key={`btn-cadastro-${animationKey}`} from="fade" delay={50} duration={350}>
            <TouchableOpacity style={styles.btnAcessoRapidoCadastro} onPress={() => navigation.navigate('CadastrarProduto')}>
              <Icon name="add-box" size={20} color="#FFF" />
              <Text style={styles.btnAcessoRapidoTexto}>Cadastrar Novo Produto</Text>
            </TouchableOpacity>
          </AnimatedView>

          <AnimatedView key={`toolbar-${animationKey}`} from="fade" delay={100} duration={350}>
            <View style={styles.toolbarRow}>
              <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
                <Icon name="search" size={18} color={theme.colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filtrar descrição..."
                  placeholderTextColor={theme.colors.textLight}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </View>

              <View style={styles.orderingContainer}>
                <Text style={styles.orderLabel}>Ordenar por:</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={ordenarPor}
                    onValueChange={(itemValue) => setOrdenarPor(itemValue as AtributoOrdenacao)}
                    style={styles.inlinePicker}
                  >
                    <Picker.Item label="Nome (A-Z)" value="descricao" />
                    <Picker.Item label="Código" value="codigo" />
                    <Picker.Item label="Categoria" value="categoria" />
                    <Picker.Item label="Valor Total" value="valorTotal" />
                  </Picker>
                </View>

                <TouchableOpacity 
                  style={styles.directionBtn} 
                  onPress={() => setDirecao(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <Icon name={direcao === 'asc' ? 'swap-vert' : 'swap-vertical-circle'} size={20} color={theme.colors.primary} />
                  <Text style={styles.directionBtnText}>{direcao === 'asc' ? 'Crescente' : 'Decrescente'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedView>
          
          <AnimatedView key={`th-${animationKey}`} from="top" delay={150} duration={350}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.codeCell]}>Código</Text>
              <Text style={[styles.headerCell, styles.descCell]}>Descrição</Text>
              <Text style={[styles.headerCell, styles.catCell]}>Categoria</Text>
              <Text style={[styles.headerCell, styles.qtyCell]}>Qtd (kg)</Text>
              <Text style={[styles.headerCell, styles.priceCell]}>Preço Uni.</Text>
              <Text style={[styles.headerCell, styles.totalCell]}>Valor Total</Text>
            </View>
          </AnimatedView>
          
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={obterProdutosProcessados()} 
              keyExtractor={(item) => item.codigo.toString()}
              renderItem={renderItem}
              ListEmptyComponent={<Text style={styles.emptyText}>Nenhum produto em estoque</Text>}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
              contentContainerStyle={styles.listContent}
            />
          )}

          <TouchableOpacity style={styles.backToMenuBtn} onPress={() => navigation.navigate('HomeScreen')}>
            <Icon name="home" size={20} color="#FFF" />
            <Text style={styles.backToMenuText}>Voltar ao Menu Principal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL 1: MENU DE OPÇÕES DO PRODUTO */}
      <Modal visible={modalOpcoesVisivel} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Opções do Produto</Text>
            <Text style={styles.modalTexto}>
              O que deseja fazer com o item <Text style={{ fontWeight: 'bold' }}>"{produtoSelecionado?.descricao}"</Text>?
            </Text>
            
            <TouchableOpacity style={[styles.modalBtnVertical, styles.modalBtnEdit]} onPress={handleAcaoEditar}>
              <Icon name="edit" size={20} color="#FFF" />
              <Text style={styles.modalBtnEditText}>Editar Produto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalBtnVertical, styles.modalBtnDelete]} onPress={handleAcaoAbrirConfirmacao}>
              <Icon name="delete" size={20} color="#FFF" />
              <Text style={styles.modalBtnDeleteText}>Excluir Produto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalBtnVertical, styles.modalBtnCancel]} onPress={() => setModalOpcoesVisivel(false)}>
              <Text style={styles.modalBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal visible={modalConfirmacaoVisivel} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={[styles.modalCard, { maxWidth: 350 }]}>
            <Icon name="warning" size={48} color="#d32f2f" style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitulo}>Atenção!</Text>
            <Text style={styles.modalTexto}>Você tem certeza que deseja excluir este item?</Text>
            
            <View style={styles.modalRowButtons}>
              <TouchableOpacity style={[styles.modalBtnHorizontal, styles.modalBtnCancel]} onPress={() => setModalConfirmacaoVisivel(false)}>
                <Text style={styles.modalBtnCancelText}>Não</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnHorizontal, styles.modalBtnDelete]} onPress={executarExclusao}>
                <Text style={styles.modalBtnDeleteText}>Sim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: JANELA DE EDIÇÃO DOS ATRIBUTOS (CÓDIGO, DESCRIÇÃO, FORNECEDOR) */}
      <Modal visible={modalEdicaoVisivel} transparent animationType="fade" onRequestClose={() => setModalEdicaoVisivel(false)}>
        <View style={styles.modalFundo}>
          <View style={[styles.modalCard, { maxWidth: 450 }]}>
            <Text style={styles.modalTitulo}>Alterar Atributos do Produto</Text>
            
            <View style={styles.inputModalGroup}>
              <Text style={styles.modalInputLabel}>Código do Produto</Text>
              <TextInput 
                style={styles.modalTextInput} 
                value={editCodigo} 
                onChangeText={setEditCodigo} 
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputModalGroup}>
              <Text style={styles.modalInputLabel}>Descrição / Nome</Text>
              <TextInput 
                style={styles.modalTextInput} 
                value={editDescricao} 
                onChangeText={editDescricao => setEditDescricao(editDescricao)}
              />
            </View>

            <View style={styles.inputModalGroup}>
              <Text style={styles.modalInputLabel}>Fornecedor Comercial</Text>
              <TextInput 
                style={styles.modalTextInput} 
                value={editFornecedor} 
                onChangeText={setEditFornecedor}
              />
            </View>

            <View style={[styles.modalRowButtons, { marginTop: 15 }]}>
              <TouchableOpacity 
                style={[styles.modalBtnHorizontal, styles.modalBtnCancel]} 
                onPress={() => setModalEdicaoVisivel(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalBtnHorizontal, styles.modalBtnSave]} 
                onPress={handleSalvarEdicao}
              >
                <Icon name="save" size={18} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.modalBtnSaveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScreenWrapper>
  );
};

export default ConsultarEstoqueScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)', padding: theme.spacing.m },
  panelCardContainer: { flex: 1, width: '100%', maxWidth: 850, alignSelf: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.s },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center' },
  pageDescription: { fontSize: 14, color: theme.colors.textLight, textAlign: 'center', fontStyle: 'italic' },
  btnAcessoRapidoCadastro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B0000', padding: 11, borderRadius: 6, marginBottom: 15, width: '100%', ...theme.shadows.s },
  btnAcessoRapidoTexto: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  toolbarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.m, paddingHorizontal: theme.spacing.m, borderWidth: 1, borderColor: '#dcdcdc', width: '100%', maxWidth: 320, height: 38, ...theme.shadows.s },
  searchContainerFocused: { borderColor: theme.colors.primary },
  searchIcon: { marginRight: theme.spacing.s },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  orderingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderLabel: { fontSize: 13, fontWeight: '600', color: '#444' },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, backgroundColor: '#FFF', overflow: 'hidden', height: 38, justifyContent: 'center', width: 140 },
  inlinePicker: { height: 38, fontSize: 13 },
  directionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', height: 38 },
  directionBtnText: { fontSize: 12, fontWeight: '600', marginLeft: 4, color: '#333' },
  tableHeader: { flexDirection: 'row', backgroundColor: theme.colors.primary, paddingVertical: 10, paddingHorizontal: theme.spacing.s, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  headerCell: { fontWeight: 'bold', textAlign: 'center', fontSize: 12, color: theme.colors.surface },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: theme.spacing.s, borderBottomWidth: 1, borderBottomColor: '#ddd', alignItems: 'center', backgroundColor: theme.colors.surface },
  tableCell: { textAlign: 'center', fontSize: 12, color: theme.colors.text },
  codeCell: { width: '12%' }, descCell: { width: '28%', textAlign: 'left' }, catCell: { width: '16%' }, qtyCell: { width: '14%' }, priceCell: { width: '15%' }, totalCell: { width: '15%', fontWeight: 'bold' },
  listContent: { paddingBottom: 20 },
  emptyText: { textAlign: 'center', marginTop: theme.spacing.xl, color: theme.colors.textLight, fontStyle: 'italic' },
  backToMenuBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, padding: 14, borderRadius: 8, marginTop: 15 },
  backToMenuText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 15 },
  toastBanner: { position: 'absolute', top: 20, alignSelf: 'center', backgroundColor: theme.colors.success, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', zIndex: 99999, ...theme.shadows.m },
  toastText: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 10 },

  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 12, width: '100%', maxWidth: 400, alignItems: 'center', ...theme.shadows.m },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 12, textAlign: 'center' },
  modalTexto: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBtnVertical: { flexDirection: 'row', width: '100%', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalRowButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12, marginTop: 8 },
  modalBtnHorizontal: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  
  modalBtnEdit: { backgroundColor: '#1976D2' },
  modalBtnEditText: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  modalBtnDelete: { backgroundColor: '#d32f2f' },
  modalBtnDeleteText: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  modalBtnCancel: { backgroundColor: '#e0e0e0' },
  modalBtnCancelText: { color: '#333', fontSize: 15, fontWeight: 'bold' },

  // NOVOS COMPONENTES ESTILIZADOS PARA O FORMULÁRIO DE EDIÇÃO INLINE
  inputModalGroup: { width: '100%', marginBottom: 14, alignItems: 'flex-start' },
  modalInputLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 4 },
  modalTextInput: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, backgroundColor: '#fafafa', fontSize: 14, color: '#000' },
  modalBtnSave: { backgroundColor: '#2E7D32' },
  modalBtnSaveText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }
});