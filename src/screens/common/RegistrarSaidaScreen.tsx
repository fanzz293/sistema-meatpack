// src/screens/common/RegistrarSaidaScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getProdutos, registrarSaidaProduto, Produto } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'RegistrarSaida'>;

interface ItemSaida {
  produto: Produto | null;
  quantidade: string;
  motivo: string;
}

// Opções de motivo para o dropdown
const MOTIVOS_SAIDA = [
  'Preparo para a área de vendas',
  'Troca com fornecedor por avaria',
  'Troca com fornecedor por erro na entrega',
  'Reservado para cliente'
];

export default function RegistrarSaidaScreen({ navigation }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosComEstoque, setProdutosComEstoque] = useState<Produto[]>([]);
  const [itensSaida, setItensSaida] = useState<ItemSaida[]>([
    { produto: null, quantidade: '', motivo: '' },
  ]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState<number>(0);
  const [termoBusca, setTermoBusca] = useState('');

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      const lista = await getProdutos();
      setProdutos(lista);
      
      // Filtrar apenas produtos com estoque disponível
      const comEstoque = lista.filter(produto => produto.quantidade > 0);
      setProdutosComEstoque(comEstoque);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos.');
    }
  };

  const adicionarItem = () => {
    setItensSaida([...itensSaida, { produto: null, quantidade: '', motivo: '' }]);
  };

  const removerItem = (index: number) => {
    if (itensSaida.length > 1) {
      const novosItens = [...itensSaida];
      novosItens.splice(index, 1);
      setItensSaida(novosItens);
    }
  };

  const abrirModalSelecao = (index: number) => {
    setIndiceAtivo(index);
    setTermoBusca('');
    setModalVisivel(true);
  };

  const selecionarProduto = (produto: Produto) => {
    const novosItens = [...itensSaida];
    novosItens[indiceAtivo] = { ...novosItens[indiceAtivo], produto };
    setItensSaida(novosItens);
    setModalVisivel(false);
  };

  const atualizarItem = (index: number, campo: 'quantidade' | 'motivo', valor: string) => {
    const novosItens = [...itensSaida];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    setItensSaida(novosItens);
  };

  const handleRegistrarSaida = async () => {
    // Validar todos os itens
    for (const [index, item] of itensSaida.entries()) {
      if (!item.produto) {
        Alert.alert('Erro', `Selecione um produto para o item ${index + 1}.`);
        return;
      }
      
      if (!item.quantidade || !item.motivo) {
        Alert.alert('Erro', `Preencha todos os campos do item ${index + 1}.`);
        return;
      }

      const quantidadeNum = parseFloat(item.quantidade);
      if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
        Alert.alert('Erro', `Quantidade inválida no item ${index + 1}.`);
        return;
      }

      if (quantidadeNum > item.produto.quantidade) {
        Alert.alert('Erro', `Quantidade maior que o estoque disponível no item ${index + 1}.`);
        return;
      }
    }

    try {
      // Registrar cada saída
      for (const item of itensSaida) {
        if (item.produto) {
          await registrarSaidaProduto(
            item.produto.codigo,
            parseFloat(item.quantidade),
            item.motivo
          );
        }
      }
      
      Alert.alert(
        'Sucesso', 
        'Saída(s) registrada(s) com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navegar para a tela ConsultarEstoque após o alerta
              navigation.navigate('ConsultarEstoque');
            }
          }
        ]
      );
      
      // Recarregar produtos para atualizar estoque
      await carregarProdutos();
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
      Alert.alert('Erro', 'Não foi possível registrar a(s) saída(s).');
    }
  };

  // Filtrar produtos com base no termo de busca
  const produtosFiltrados = termoBusca
    ? produtosComEstoque.filter(produto =>
        produto.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
        produto.codigo.toString().includes(termoBusca)
      )
    : produtosComEstoque;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ImageBackground 
        source={require('../../../assets/wood-background.jpg')}
        style={styles.background}
        blurRadius={1}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <AnimatedView from="top">
            <Text style={styles.title}>Registrar Saída</Text>
          </AnimatedView>

          {itensSaida.map((item, index) => (
            <AnimatedView key={index} from="bottom" delay={200 + index * 100}>
              <View style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>Item {index + 1}</Text>
                  {itensSaida.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeItemButton}
                      onPress={() => removerItem(index)}
                    >
                      <Icon name="close" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.label}>Produto</Text>
                <TouchableOpacity 
                  style={styles.selecionarProdutoButton}
                  onPress={() => abrirModalSelecao(index)}
                >
                  <Text style={item.produto ? styles.produtoSelecionadoText : styles.selecionarProdutoPlaceholder}>
                    {item.produto ? item.produto.descricao : 'Selecionar produto'}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                {item.produto && (
                  <View style={styles.infoProdutoContainer}>
                    <Text style={styles.infoProdutoText}>
                      Código: {item.produto.codigo} | Estoque: {item.produto.quantidade} kg
                    </Text>
                  </View>
                )}

                <Text style={styles.label}>Quantidade (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Quantidade"
                  value={item.quantidade}
                  onChangeText={(text) => atualizarItem(index, 'quantidade', text)}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Motivo</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={item.motivo}
                    onValueChange={(value) => atualizarItem(index, 'motivo', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Selecione o motivo" value="" />
                    {MOTIVOS_SAIDA.map((motivo, idx) => (
                      <Picker.Item key={idx} label={motivo} value={motivo} />
                    ))}
                  </Picker>
                </View>
              </View>
            </AnimatedView>
          ))}

          <AnimatedView from="bottom" delay={400}>
            <TouchableOpacity style={styles.addButton} onPress={adicionarItem}>
              <Icon name="add" size={20} color={theme.colors.surface} />
              <Text style={styles.addButtonText}>Adicionar Item</Text>
            </TouchableOpacity>
          </AnimatedView>

          <AnimatedView from="bottom" delay={600}>
            <TouchableOpacity 
              style={[styles.button, !itensSaida.every(item => item.produto && item.quantidade && item.motivo) && styles.buttonDisabled]}
              onPress={handleRegistrarSaida}
              disabled={!itensSaida.every(item => item.produto && item.quantidade && item.motivo)}
            >
              <Icon name="remove-shopping-cart" size={24} color="#FFF" />
              <Text style={styles.buttonText}>Registrar Saída(s)</Text>
            </TouchableOpacity>
          </AnimatedView>
        </ScrollView>

        {/* Modal de seleção de produtos */}
        <Modal
          visible={modalVisivel}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisivel(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecionar Produto</Text>
                <TouchableOpacity onPress={() => setModalVisivel(false)}>
                  <Icon name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.buscaInput}
                placeholder="Buscar produto..."
                value={termoBusca}
                onChangeText={setTermoBusca}
              />

              <FlatList
                data={produtosFiltrados}
                keyExtractor={(item) => item.codigo.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.produtoItem}
                    onPress={() => selecionarProduto(item)}
                  >
                    <View>
                      <Text style={styles.produtoNome}>{item.descricao}</Text>
                      <Text style={styles.produtoDetalhes}>
                        Código: {item.codigo} | Estoque: {item.quantidade} kg
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.listaVaziaText}>
                    {produtosComEstoque.length === 0 
                      ? 'Nenhum produto com estoque disponível' 
                      : 'Nenhum produto encontrado'}
                  </Text>
                }
              />
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
}

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
  },
  contentContainer: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    textShadowColor: 'rgba(255, 255, 255, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  itemContainer: {
    marginBottom: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    ...theme.shadows.s,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  removeItemButton: {
    padding: theme.spacing.s,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  selecionarProdutoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    backgroundColor: theme.colors.surface,
  },
  selecionarProdutoPlaceholder: {
    color: theme.colors.textLight,
    fontSize: 16,
  },
  produtoSelecionadoText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  infoProdutoContainer: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
  },
  infoProdutoText: {
    color: theme.colors.surface,
    fontSize: 14,
  },
  input: {
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
    color: theme.colors.text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.m,
  },
  addButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.l,
    borderRadius: theme.borderRadius.m,
    marginTop: theme.spacing.m,
    ...theme.shadows.m,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textLight,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  buscaInput: {
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
    color: theme.colors.text,
  },
  produtoItem: {
    padding: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  produtoDetalhes: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  listaVaziaText: {
    textAlign: 'center',
    padding: theme.spacing.m,
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },
});