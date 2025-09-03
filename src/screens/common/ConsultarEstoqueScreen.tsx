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
  ScrollView,
  RefreshControl,
  Animated,
  ImageBackground,
} from 'react-native';
import { getProdutos, searchProdutos, Produto, updateProduto, deleteProduto } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'ConsultarEstoque'>;

const formatCurrency = (value: number | undefined): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00';
  }
  return value.toFixed(2);
};

export default function ConsultarEstoqueScreen({ navigation }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDescricao, setEditDescricao] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const carregarProdutos = async () => {
    try {
      const lista = await getProdutos();
      setProdutos(lista);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

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

  const handleVerHistorico = () => {
    if (produtoSelecionado) {
      setModalVisible(false);
      navigation.navigate('HistoricoProduto', { produto: produtoSelecionado });
    }
  };

  const handleEditarProduto = async () => {
    if (!produtoSelecionado) return;

    try {
      const novoCodigo = parseInt(editCodigo);
      
      // Verificar se o código foi alterado
      if (novoCodigo !== produtoSelecionado.codigo) {
        // Verificar se já existe um produto com o novo código
        const todosProdutos = await getProdutos();
        const produtoComMesmoCodigo = todosProdutos.find(p => p.codigo === novoCodigo);
        
        if (produtoComMesmoCodigo && produtoComMesmoCodigo.codigo !== produtoSelecionado.codigo) {
          Alert.alert('Erro', 'Já existe um produto com este código.');
          return;
        }
      }

      const produtoAtualizado: Produto = {
        ...produtoSelecionado,
        codigo: novoCodigo,
        descricao: editDescricao
      };

      await updateProduto(produtoAtualizado);
      setEditModalVisible(false);
      carregarProdutos();
      Alert.alert('Sucesso', 'Produto atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao editar produto:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o produto.');
    }
  };

  const handleFazerPedido = () => {
    if (!produtoSelecionado) return;
    setModalVisible(false);
    navigation.navigate('AdicionarPedido', { 
      produtoPreSelecionado: produtoSelecionado 
    });
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
              console.error('Erro ao excluir produto:', error);
              Alert.alert('Erro', 'Não foi possível excluir o produto.');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item, index }: { item: Produto; index: number }) => (
    <AnimatedView from="right" delay={index * 100}>
      <TouchableOpacity 
        style={styles.tableRow}
        onPress={() => abrirModal(item)}
      >
        <Text style={[styles.tableCell, styles.codeCell]}>{item.codigo}</Text>
        <Text style={[styles.tableCell, styles.descCell]} numberOfLines={1} ellipsizeMode="tail">{item.descricao}</Text>
        <Text style={[styles.tableCell, styles.catCell]}>{item.categoria}</Text>
        <Text style={[styles.tableCell, styles.fornecedorCell]} numberOfLines={1} ellipsizeMode="tail">{item.fornecedor}</Text>
        <Text style={[styles.tableCell, styles.qtyCell]}>{item.quantidade} kg</Text>
        <Text style={[styles.tableCell, styles.priceCell]}>R$ {formatCurrency(item.precoUnitario)}</Text>
        <Text style={[styles.tableCell, styles.totalCell]}>R$ {formatCurrency(item.quantidade * item.precoUnitario)}</Text>
      </TouchableOpacity>
    </AnimatedView>
  );

  return (
    <ImageBackground 
      source={require('../../../assets/wood-background.jpg')}
      style={styles.background}
      blurRadius={1}
    >
      <View style={styles.container}>
        <AnimatedView from="top">
          <Text style={styles.title}>Consultar Estoque</Text>
        </AnimatedView>

        <AnimatedView from="top" delay={200}>
          <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
            <Icon name="search" size={20} color={theme.colors.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar produto..."
              placeholderTextColor={theme.colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>
        </AnimatedView>
        
        <AnimatedView from="top" delay={400}>
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
          data={produtos}
          keyExtractor={(item) => item.codigo.toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <AnimatedView from="fade">
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
            </AnimatedView>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
        
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <AnimatedView from="bottom">
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{produtoSelecionado?.descricao}</Text>
                
                <ScrollView style={styles.modalInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Código:</Text>
                    <Text style={styles.infoValue}>{produtoSelecionado?.codigo}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Categoria:</Text>
                    <Text style={styles.infoValue}>{produtoSelecionado?.categoria}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Quantidade:</Text>
                    <Text style={styles.infoValue}>{produtoSelecionado?.quantidade} kg</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Preço Unitário:</Text>
                    <Text style={styles.infoValue}>R$ {formatCurrency(produtoSelecionado?.precoUnitario)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Valor Total:</Text>
                    <Text style={[styles.infoValue, styles.totalValue]}>
                      R$ {formatCurrency(produtoSelecionado ? produtoSelecionado.quantidade * produtoSelecionado.precoUnitario : 0)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fornecedor:</Text>
                    <Text style={styles.infoValue}>{produtoSelecionado?.fornecedor}</Text>
                  </View>
                  {produtoSelecionado?.ultimaEntrega && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Última Entrega:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(produtoSelecionado.ultimaEntrega).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  )}
                </ScrollView>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.editButton]}
                    onPress={() => produtoSelecionado && abrirEdicaoModal(produtoSelecionado)}
                  >
                    <Icon name="edit" size={18} color="#FFF" />
                    <Text style={styles.modalButtonText}>Editar Produto</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.orderButton]}
                    onPress={handleFazerPedido}
                  >
                    <Icon name="add-shopping-cart" size={18} color="#FFF" />
                    <Text style={styles.modalButtonText}>Fazer Pedido</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalButton, styles.historyButton]}
                    onPress={handleVerHistorico}
                  >
                    <Icon name="history" size={18} color="#FFF" />
                    <Text style={styles.modalButtonText}>Ver Histórico</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={handleExcluirProduto}
                  >
                    <Icon name="delete" size={18} color="#FFF" />
                    <Text style={styles.modalButtonText}>Excluir</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Icon name="close" size={18} color="#FFF" />
                    <Text style={styles.modalButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedView>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <AnimatedView from="bottom">
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Editar Produto</Text>
                
                <Text style={styles.label}>Código</Text>
                <TextInput
                  style={styles.input}
                  value={editCodigo}
                  onChangeText={(text) => {
                    // Permitir apenas números
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setEditCodigo(numericValue);
                  }}
                  keyboardType="numeric"
                />
                
                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  style={styles.input}
                  value={editDescricao}
                  onChangeText={setEditDescricao}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleEditarProduto}
                  >
                    <Icon name="save" size={18} color="#FFF" />
                    <Text style={styles.modalButtonText}>Salvar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Icon name="close" size={18} color="#FFF" />
                    <Text style={styles.modalButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedView>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(245, 245, 220, 0.9)',
    padding: theme.spacing.m,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.m,
    textShadowColor: 'rgba(255, 255, 255, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    ...theme.shadows.s,
  },
  searchContainerFocused: {
    borderColor: theme.colors.primary,
    ...theme.shadows.m,
  },
  searchIcon: {
    marginRight: theme.spacing.s,
  },
  searchInput: {
    flex: 1,
    padding: theme.spacing.m,
    fontSize: 16,
    color: theme.colors.text,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.s,
    borderTopLeftRadius: theme.borderRadius.m,
    borderTopRightRadius: theme.borderRadius.m,
    ...theme.shadows.s,
  },
  headerCell: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.surface,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  tableCell: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.text,
  },
  codeCell: {
    width: '10%',
  },
  descCell: {
    width: '20%',
    textAlign: 'left',
  },
  catCell: {
    width: '15%',
  },
  fornecedorCell: {
    width: '15%',
    textAlign: 'left',
  },
  qtyCell: {
    width: '12%',
  },
  priceCell: {
    width: '15%',
  },
  totalCell: {
    width: '13%',
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    fontSize: 16,
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    width: '90%',
    maxHeight: '80%',
    ...theme.shadows.l,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.m,
    textAlign: 'center',
  },
  modalInfo: {
    marginBottom: theme.spacing.m,
    maxHeight: 300,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  infoValue: {
    color: theme.colors.text,
  },
  totalValue: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  modalButtons: {
    marginTop: theme.spacing.m,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.s,
    ...theme.shadows.s,
  },
  modalButtonText: {
    color: theme.colors.surface,
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
  },
  orderButton: {
    backgroundColor: theme.colors.success,
  },
  historyButton: {
    backgroundColor: theme.colors.secondary,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  cancelButton: {
    backgroundColor: theme.colors.textLight,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
    color: theme.colors.text,
  },
});