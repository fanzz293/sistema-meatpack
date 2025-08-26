// src/screens/common/AdicionarPedidoScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ImageBackground,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { adicionarPedido, getFornecedores, getProdutos, Produto } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'AdicionarPedido'>;

interface ItemPedido {
  produto: Produto | null;
  quantidade: string;
  textoProduto: string;
}

export default function AdicionarPedidoScreen({ navigation, route }: Props) {
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [fornecedor, setFornecedor] = useState('');
  const [dataEntrega, setDataEntrega] = useState(new Date());
  const [horaEntrega, setHoraEntrega] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [itens, setItens] = useState<ItemPedido[]>([
    { produto: null, quantidade: '', textoProduto: '' },
  ]);
  const [showFornecedorSuggestions, setShowFornecedorSuggestions] = useState(false);
  const [showProdutoSuggestions, setShowProdutoSuggestions] = useState([false]);
  const [fornecedorInputFocused, setFornecedorInputFocused] = useState(false);

  // Verificar se há um produto pré-selecionado
  useEffect(() => {
    if (route.params && 'produtoPreSelecionado' in route.params && route.params.produtoPreSelecionado) {
      const produto = route.params.produtoPreSelecionado as Produto;
      setItens([{ produto, quantidade: '', textoProduto: produto.descricao }]);
      
      // Se o produto tiver fornecedor, preencher automaticamente
      if (produto.fornecedor) {
        setFornecedor(produto.fornecedor);
      }
    }
  }, [route.params]);

  useEffect(() => {
    const carregarDados = async () => {
      const fornecedoresLista = await getFornecedores();
      const produtosLista = await getProdutos();
      setFornecedores(fornecedoresLista);
      setProdutosDisponiveis(produtosLista);
    };
    carregarDados();
  }, []);

  const handleAdicionarItem = () => {
    setItens([...itens, { produto: null, quantidade: '', textoProduto: '' }]);
    setShowProdutoSuggestions([...showProdutoSuggestions, false]);
  };

  const handleRemoverItem = (index: number) => {
    const novosItens = [...itens];
    const novasSugestoes = [...showProdutoSuggestions];
    novosItens.splice(index, 1);
    novasSugestoes.splice(index, 1);
    setItens(novosItens);
    setShowProdutoSuggestions(novasSugestoes);
  };

  const handleProdutoChange = (index: number, text: string) => {
    const novosItens = [...itens];
    if (!novosItens[index].produto || novosItens[index].produto?.descricao !== text) {
      novosItens[index] = {
        ...novosItens[index],
        produto: null,
        textoProduto: text
      };
    }
    setItens(novosItens);
    
    // Mostrar sugestões enquanto digita
    const novasSugestoes = [...showProdutoSuggestions];
    novasSugestoes[index] = true;
    setShowProdutoSuggestions(novasSugestoes);
  };

  const focarCampoProduto = (index: number) => {
    const novasSugestoes = [...showProdutoSuggestions];
    novasSugestoes[index] = true;
    setShowProdutoSuggestions(novasSugestoes);
  };

  const selecionarProduto = (index: number, produto: Produto) => {
    const novosItens = [...itens];
    novosItens[index] = {
      produto: produto,
      quantidade: novosItens[index].quantidade,
      textoProduto: produto.descricao
    };
    setItens(novosItens);
    
    // Ocultar sugestões após seleção
    const novasSugestoes = [...showProdutoSuggestions];
    novasSugestoes[index] = false;
    setShowProdutoSuggestions(novasSugestoes);
    
    // Se for o primeiro item e o fornecedor estiver vazio, preencher com o fornecedor do produto
    if (index === 0 && !fornecedor && produto.fornecedor) {
      setFornecedor(produto.fornecedor);
    }
  };

  const handleQuantidadeChange = (index: number, quantidade: string) => {
    const novosItens = [...itens];
    novosItens[index] = {
      ...novosItens[index],
      quantidade: quantidade
    };
    setItens(novosItens);
  };

  const handleDataChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Validar se a data é pelo menos amanhã
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataSelecionada = new Date(selectedDate);
      dataSelecionada.setHours(0, 0, 0, 0);
      
      if (dataSelecionada <= hoje) {
        Alert.alert('Erro', 'A data de entrega deve ser a partir de amanhã.');
        return;
      }
      
      setDataEntrega(selectedDate);
    }
  };

  const handleHoraChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setHoraEntrega(selectedTime);
    }
  };

  const selecionarFornecedor = (fornecedorSelecionado: string) => {
    setFornecedor(fornecedorSelecionado);
    setShowFornecedorSuggestions(false);
  };

  const handleAdicionarPedido = async () => {
    if (!fornecedor) {
      Alert.alert('Erro', 'Selecione um fornecedor.');
      return;
    }

    const itensValidos = itens.filter(item => item.produto && item.quantidade && parseFloat(item.quantidade) > 0);
    if (itensValidos.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um item ao pedido.');
      return;
    }

    // Formatar data e hora
    const dataFormatada = dataEntrega.toISOString().split('T')[0];
    const horaFormatada = horaEntrega.toTimeString().split(' ')[0].substring(0, 5);

    const pedido = {
      data: dataFormatada,
      horaEntrega: horaFormatada,
      itens: itensValidos.map(item => ({
        produtoCodigo: item.produto!.codigo,
        quantidade: parseFloat(item.quantidade),
        precoUnitario: item.produto!.precoUnitario,
      })),
      status: 'aguardando' as const,
      fornecedor,
      notaFiscalRecebida: false,
    };

    try {
      await adicionarPedido(pedido);
      Alert.alert('Sucesso', 'Pedido adicionado com sucesso!');
      navigation.navigate('AcompanharPedidos', { refresh: true });
    } catch (error) {
      console.error('Erro ao adicionar pedido:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o pedido.');
    }
  };

  return (
    <ImageBackground 
      source={require('../../../assets/wood-background.jpg')}
      style={styles.background}
      blurRadius={1}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <AnimatedView from="top">
          <Text style={styles.title}>Adicionar Pedido</Text>
        </AnimatedView>

        <AnimatedView from="bottom" delay={200}>
          <Text style={styles.sectionTitle}>Itens do Pedido</Text>
          {itens.map((item, index) => (
            <View key={index} style={styles.itemContainer}>
              <Text style={styles.label}>Produto {index + 1}</Text>
              <View style={styles.pickerContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Digite o nome do produto"
                  value={item.textoProduto}
                  onChangeText={(text) => handleProdutoChange(index, text)}
                  onFocus={() => focarCampoProduto(index)}
                  onBlur={() => setTimeout(() => {
                    const novasSugestoes = [...showProdutoSuggestions];
                    novasSugestoes[index] = false;
                    setShowProdutoSuggestions(novasSugestoes);
                  }, 300)}
                />
                {showProdutoSuggestions[index] && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView style={styles.suggestions}>
                      {produtosDisponiveis
                        .filter(p => p.descricao.toLowerCase().includes((item.textoProduto || '').toLowerCase()))
                        .map((p, i) => (
                          <TouchableOpacity 
                            key={i} 
                            onPress={() => selecionarProduto(index, p)}
                            style={styles.suggestionItemContainer}
                          >
                            <Text style={styles.suggestionItem}>{p.descricao}</Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <Text style={styles.label}>Quantidade (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Quantidade"
                value={item.quantidade}
                onChangeText={(text) => handleQuantidadeChange(index, text)}
                keyboardType="numeric"
              />

              {itens.length > 1 && (
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => handleRemoverItem(index)}
                >
                  <Icon name="remove" size={20} color={theme.colors.error} />
                  <Text style={styles.removeButtonText}>Remover Item</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={handleAdicionarItem}>
            <Icon name="add" size={20} color={theme.colors.surface} />
            <Text style={styles.addButtonText}>Adicionar Item</Text>
          </TouchableOpacity>
        </AnimatedView>

        <AnimatedView from="bottom" delay={400}>
          <Text style={styles.sectionTitle}>Fornecedor</Text>
          <View style={styles.pickerContainer}>
            <TextInput
              style={styles.input}
              placeholder="Digite o nome do fornecedor"
              value={fornecedor}
              onChangeText={setFornecedor}
              onFocus={() => {
                setShowFornecedorSuggestions(true);
                setFornecedorInputFocused(true);
              }}
              onBlur={() => {
                setFornecedorInputFocused(false);
                setTimeout(() => setShowFornecedorSuggestions(false), 300);
              }}
            />
            {showFornecedorSuggestions && fornecedorInputFocused && (
              <View style={styles.suggestionsContainer}>
                <ScrollView style={styles.suggestions}>
                  {fornecedores
                    .filter(f => f.toLowerCase().includes(fornecedor.toLowerCase()))
                    .map((f, index) => (
                      <TouchableOpacity 
                        key={index} 
                        onPress={() => selecionarFornecedor(f)}
                        style={styles.suggestionItemContainer}
                      >
                        <Text style={styles.suggestionItem}>{f}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}
          </View>
        </AnimatedView>

        <AnimatedView from="bottom" delay={600}>
          <Text style={styles.sectionTitle}>Data e Hora de Entrega</Text>
          
          <Text style={styles.label}>Data de Entrega</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
            <Icon name="event" size={20} color={theme.colors.primary} style={styles.dateIcon} />
            <Text style={styles.dateText}>{dataEntrega.toLocaleDateString('pt-BR')}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dataEntrega}
              mode="date"
              display="default"
              onChange={handleDataChange}
              minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} // Amanhã
            />
          )}

          <Text style={styles.label}>Hora de Entrega</Text>
          <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.dateButton}>
            <Icon name="access-time" size={20} color={theme.colors.primary} style={styles.dateIcon} />
            <Text style={styles.dateText}>{horaEntrega.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={horaEntrega}
              mode="time"
              display="default"
              onChange={handleHoraChange}
            />
          )}
        </AnimatedView>

        <AnimatedView from="bottom" delay={800}>
          <TouchableOpacity style={styles.concluirButton} onPress={handleAdicionarPedido}>
            <Icon name="check-circle" size={24} color={theme.colors.surface} />
            <Text style={styles.concluirButtonText}>Concluir Pedido</Text>
          </TouchableOpacity>
        </AnimatedView>
      </ScrollView>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.m,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.s,
  },
  itemContainer: {
    marginBottom: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    ...theme.shadows.s,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
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
    marginBottom: theme.spacing.m,
    position: 'relative',
    zIndex: 1,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    maxHeight: 150,
    ...theme.shadows.m,
  },
  suggestions: {
    maxHeight: 150,
  },
  suggestionItemContainer: {
    padding: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionItem: {
    fontSize: 16,
    color: theme.colors.text,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.s,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    backgroundColor: theme.colors.surface,
  },
  dateIcon: {
    marginRight: theme.spacing.s,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  concluirButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    padding: theme.spacing.l,
    borderRadius: theme.borderRadius.m,
    marginTop: theme.spacing.m,
    ...theme.shadows.m,
  },
  concluirButtonText: {
    color: theme.colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
});