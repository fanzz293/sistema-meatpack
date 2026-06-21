// src/screens/common/ConsultarEstoqueScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Modal,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getProdutos, searchProdutos, Produto, updateProduto, deleteProduto } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import ScreenWrapper from '../../components/ScreenWrapper';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'ConsultarEstoque'>;

// Tipos para controle de ordenação flexível
type AtributoOrdenacao = 'codigo' | 'descricao' | 'categoria' | 'valorTotal';
type DirecaoOrdenacao = 'asc' | 'desc';

const formatCurrency = (value: number | undefined): string => {
  return (value === undefined || value === null || isNaN(value)) ? '0,00' : value.toFixed(2);
};

const ConsultarEstoqueScreen: React.FC<Props> = ({ navigation, route }) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDescricao, setEditDescricao] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // NOVOS ESTADOS PARA ORDENAÇÃO CUSTOMIZADA
  const [ordenarPor, setOrdenarPor] = useState<AtributoOrdenacao>('descricao');
  const [direcao, setDirecao] = useState<DirecaoOrdenacao>('asc');

  const carregarProdutos = async () => {
    try {
      const lista = await getProdutos();
      setProdutos(lista);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  useEffect(() => { carregarProdutos(); }, []);

  useEffect(() => {
    if (route.params?.infoMessage) {
      setToastMessage(route.params.infoMessage);
      const timer = setTimeout(() => {
        setToastMessage(null);
        navigation.setParams({ infoMessage: undefined } as any);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [route.params]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarProdutos();
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

  const abrirModal = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setModalVisible(true);
  };

  const abrirEdicaoModal = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setEditDescricao(produto.descricao);
    setEditCodigo(produto.codigo.toString());
    setEditModalVisible(true);
    setModalVisible(false);
  };

  const handleEditarProduto = async () => {
    if (!produtoSelecionado) return;
    try {
      const novoCodigo = parseInt(editCodigo);
      if (novoCodigo !== produtoSelecionado.codigo) {
        const todosProdutos = await getProdutos();
        if (todosProdutos.find(p => p.codigo === novoCodigo)) {
          Alert.alert('Erro', 'Já existe um produto com este código.');
          return;
        }
      }

      await updateProduto({ ...produtoSelecionado, codigo: novoCodigo, descricao: editDescricao }, produtoSelecionado.codigo);
      setEditModalVisible(false);
      carregarProdutos();
      Alert.alert('Sucesso', 'Produto atualizado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o produto.');
    }
  };

  const handleExcluirProduto = async () => {
    if (!produtoSelecionado) return;
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir o produto "${produtoSelecionado.descricao}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduto(produtoSelecionado.codigo);
              setModalVisible(false);
              carregarProdutos();
              Alert.alert('Sucesso', 'Produto excluído com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o produto.');
            }
          }
        }
      ]
    );
  };

  // LÓGICA DE PROCESSAMENTO E ORDENAÇÃO DA JUGULAR DOS DADOS
  const obterProdutosProcessados = () => {
    let resultado = [...produtos];

    // Aplica a ordenação escolhida na barra de ferramentas
    resultado.sort((a, b) => {
      let valorA: any = a[ordenarPor as keyof Produto];
      let valorB: any = b[ordenarPor as keyof Produto];

      // Caso especial: cálculo dinâmico do valor total para ordenação
      if (ordenarPor === 'valorTotal') {
        valorA = a.quantidade * a.precoUnitario;
        valorB = b.quantidade * b.precoUnitario;
      }

      // Tratamento de strings para evitar problemas de case sensitivity (A-Z / a-z)
      if (typeof valorA === 'string' && typeof valorB === 'string') {
        return direcao === 'asc' 
          ? valorA.localeCompare(valorB) 
          : valorB.localeCompare(valorA);
      }

      // Ordenação numérica (Código ou Valor Total)
      return direcao === 'asc' ? valorA - valorB : valorB - valorA;
    });

    return resultado;
  };

  const renderItem = ({ item, index }: { item: Produto; index: number }) => (
    <AnimatedView from="right" delay={index * 30}>
      <TouchableOpacity style={styles.tableRow} onPress={() => abrirModal(item)} activeOpacity={0.7}>
        <Text style={[styles.tableCell, styles.codeCell]}>{item.codigo}</Text>
        <Text style={[styles.tableCell, styles.descCell]} numberOfLines={1}>{item.descricao}</Text>
        <Text style={[styles.tableCell, styles.catCell]}>{item.categoria}</Text>
        <Text style={[styles.tableCell, styles.fornecedorCell]} numberOfLines={1}>{item.fornecedor}</Text>
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
          <AnimatedView from="top">
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Consultar Estoque</Text>
              <Text style={styles.pageDescription}>
                Filtre e ordene o inventário conforme a necessidade da sua operação.
              </Text>
            </View>
          </AnimatedView>

          {/* CONTROLADORES: BARRA DE PESQUISA + FERRAMENTAS DE ORDENAÇÃO EM LINHA */}
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

            {/* SELETORES ADICIONADOS DE ATRIBUTO DE FILTRO */}
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

              {/* BOTAO PARA ALTERNAR DIREÇÃO (ASCENDENTE / DESCENDENTE) */}
              <TouchableOpacity 
                style={styles.directionBtn} 
                onPress={() => setDirecao(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                <Icon 
                  name={direcao === 'asc' ? 'swap-vert' : 'swap-vertical-circle'} 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.directionBtnText}>{direcao === 'asc' ? 'Crescente' : 'Decrescente'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <AnimatedView from="top" delay={200}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.codeCell]}>Código</Text>
              <Text style={[styles.headerCell, styles.descCell]}>Descrição</Text>
              <Text style={[styles.headerCell, styles.catCell]}>Categoria</Text>
              <Text style={[styles.headerCell, styles.fornecedorCell]}>Fornecedor</Text>
              <Text style={[styles.headerCell, styles.qtyCell]}>Qtd (kg)</Text>
              <Text style={[styles.headerCell, styles.priceCell]}>Preço Uni.</Text>
              <Text style={[styles.headerCell, styles.totalCell]}>Valor Total</Text>
            </View>
          </AnimatedView>
          
          <FlatList
            data={obterProdutosProcessados()} // Roda a listagem com os ordenadores injetados
            keyExtractor={(item) => item.codigo.toString()}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum produto encontrado</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
            contentContainerStyle={styles.listContent}
          />

          <TouchableOpacity style={styles.backToMenuBtn} onPress={() => navigation.navigate('HomeScreen')}>
            <Icon name="home" size={20} color="#FFF" />
            <Text style={styles.backToMenuText}>Voltar ao Menu Principal</Text>
          </TouchableOpacity>
        </View>

        {/* MODAL DE AÇÕES */}
        <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalMeta}>AÇÕES DO PRODUTO</Text>
              <Text style={styles.modalTitle}>{produtoSelecionado?.descricao}</Text>
              <Text style={styles.modalSubtitle}>Código interno: #{produtoSelecionado?.codigo}</Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.orderButton]} onPress={() => { setModalVisible(false); navigation.navigate('AdicionarPedido', { produtoPreSelecionado: produtoSelecionado || undefined }); }}>
                  <Icon name="add-shopping-cart" size={18} color="#FFF" />
                  <Text style={styles.modalButtonText}>Adicionar Pedido</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.editButton]} onPress={() => produtoSelecionado && abrirEdicaoModal(produtoSelecionado)}>
                  <Icon name="edit" size={18} color="#FFF" />
                  <Text style={styles.modalButtonText}>Editar Produto</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={handleExcluirProduto}>
                  <Icon name="delete" size={18} color="#FFF" />
                  <Text style={styles.modalButtonText}>Excluir Produto</Text>
                </TouchableOpacity>
                
                <View style={styles.divider} />

                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                  <Icon name="close" size={18} color={theme.colors.text} />
                  <Text style={styles.cancelButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL DE EDIÇÃO */}
        <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Produto</Text>
              
              <Text style={styles.label}>Código</Text>
              <TextInput style={styles.input} value={editCodigo} onChangeText={setEditCodigo} keyboardType="numeric" />
              
              <Text style={styles.label}>Descrição</Text>
              <TextInput style={styles.input} value={editDescricao} onChangeText={setEditDescricao} />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleEditarProduto}>
                  <Icon name="save" size={18} color="#FFF" />
                  <Text style={styles.modalButtonText}>Salvar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </ScreenWrapper>
  );
};

export default ConsultarEstoqueScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)', padding: theme.spacing.m },
  panelCardContainer: { flex: 1, width: '100%', maxWidth: 800, alignSelf: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.m },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center' },
  pageDescription: { fontSize: 14, color: theme.colors.textLight, textAlign: 'center', fontStyle: 'italic' },
  
  // ESTILOS DA TOOLBAR EM FLEX PARA WEB/MOBILE
  toolbarRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, gap: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.m, paddingHorizontal: theme.spacing.m, borderWidth: 1, borderColor: '#dcdcdc', width: '100%', maxWidth: 320, ...theme.shadows.s },
  searchContainerFocused: { borderColor: theme.colors.primary, ...theme.shadows.m },
  searchIcon: { marginRight: theme.spacing.s },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 14, color: theme.colors.text },
  
  orderingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderLabel: { fontSize: 13, fontWeight: '600', color: '#444' },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, backgroundColor: '#FFF', overflow: 'hidden', height: 38, justifyContent: 'center', width: 150 },
  inlinePicker: { height: 38, fontSize: 13 },
  directionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', height: 38 },
  directionBtnText: { fontSize: 12, fontWeight: '600', marginLeft: 4, color: '#333' },

  tableHeader: { flexDirection: 'row', backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.s, borderTopLeftRadius: theme.borderRadius.m, borderTopRightRadius: theme.borderRadius.m },
  headerCell: { fontWeight: 'bold', textAlign: 'center', fontSize: 12, color: theme.colors.surface },
  tableRow: { flexDirection: 'row', paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.s, borderBottomWidth: 1, borderBottomColor: '#ddd', alignItems: 'center', backgroundColor: theme.colors.surface },
  tableCell: { textAlign: 'center', fontSize: 12, color: theme.colors.text },
  codeCell: { width: '10%' },
  descCell: { width: '20%', textAlign: 'left' },
  catCell: { width: '15%' },
  fornecedorCell: { width: '15%', textAlign: 'left' },
  qtyCell: { width: '12%' },
  priceCell: { width: '15%' },
  totalCell: { width: '13%', fontWeight: 'bold' },
  listContent: { paddingBottom: 20 },
  emptyText: { textAlign: 'center', marginTop: theme.spacing.xl, color: theme.colors.textLight, fontStyle: 'italic' },
  backToMenuBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, padding: 14, borderRadius: 8, marginTop: 15, ...theme.shadows.s },
  backToMenuText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 15 },
  toastBanner: { position: 'absolute', top: 20, alignSelf: 'center', backgroundColor: theme.colors.success, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', zIndex: 99999 },
  toastText: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 10 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  modalContent: { backgroundColor: theme.colors.surface, padding: 24, borderRadius: theme.borderRadius.l, width: '90%', maxWidth: 400, ...theme.shadows.l },
  modalMeta: { fontSize: 11, fontWeight: '700', color: theme.colors.textLight, textAlign: 'center', letterSpacing: 1.5, marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: theme.colors.textLight, textAlign: 'center', marginBottom: 16 },
  modalButtons: { gap: 10 },
  modalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 6, height: 46 },
  modalButtonText: { color: '#FFF', fontWeight: '600', marginLeft: 8 },
  orderButton: { backgroundColor: theme.colors.success },
  editButton: { backgroundColor: theme.colors.primaryLight },
  deleteButton: { backgroundColor: theme.colors.error },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { color: theme.colors.text, fontWeight: '600' },
  saveButton: { backgroundColor: theme.colors.primary },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 6, marginBottom: 12, backgroundColor: '#FFF' }
});


