// src/screens/common/AdicionarPedidoScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ImageBackground,
  Animated,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
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
}

export default function AdicionarPedidoScreen({ navigation, route }: Props) {
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('');
  const [dataEntrega, setDataEntrega] = useState(new Date());
  const [horaEntrega, setHoraEntrega] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [itens, setItens] = useState<ItemPedido[]>([
    { produto: null, quantidade: '' },
  ]);

  useEffect(() => {
    if (route.params && 'produtoPreSelecionado' in route.params && route.params.produtoPreSelecionado) {
      const produto = route.params.produtoPreSelecionado as Produto;
      setItens([{ produto, quantidade: '' }]);
      
      if (produto.fornecedor) {
        setFornecedorSelecionado(produto.fornecedor);
        filtrarProdutosPorFornecedor(produto.fornecedor);
      }
    }
  }, [route.params]);

  useEffect(() => {
    const carregarDados = async () => {
      const fornecedoresLista = await getFornecedores();
      const produtosLista = await getProdutos();
      setFornecedores(fornecedoresLista);
      setProdutosDisponiveis(produtosLista);
      
      // Se já tiver um fornecedor selecionado, filtrar produtos
      if (fornecedorSelecionado) {
        filtrarProdutosPorFornecedor(fornecedorSelecionado);
      }
    };
    carregarDados();
  }, []);

  const filtrarProdutosPorFornecedor = (fornecedor: string) => {
    const produtosFiltrados = produtosDisponiveis.filter(
      produto => produto.fornecedor === fornecedor
    );
    setProdutosFiltrados(produtosFiltrados);
  };

  const handleFornecedorChange = (fornecedor: string) => {
    setFornecedorSelecionado(fornecedor);
    filtrarProdutosPorFornecedor(fornecedor);
    
    // Limpar produtos selecionados quando mudar o fornecedor
    setItens([{ produto: null, quantidade: '' }]);
  };

  const handleAdicionarItem = () => {
    setItens([...itens, { produto: null, quantidade: '' }]);
  };

  const handleRemoverItem = (index: number) => {
    const novosItens = [...itens];
    novosItens.splice(index, 1);
    setItens(novosItens);
  };

  const handleProdutoChange = (index: number, produtoCodigo: number) => {
    const novosItens = [...itens];
    const produtoSelecionado = produtosFiltrados.find(p => p.codigo === produtoCodigo);
    novosItens[index] = {
      ...novosItens[index],
      produto: produtoSelecionado || null
    };
    setItens(novosItens);
  };

  const handleQuantidadeChange = (index: number, quantidade: string) => {
    // Validar se é um número válido
    if (quantidade === '' || /^\d*\.?\d*$/.test(quantidade)) {
      const novosItens = [...itens];
      novosItens[index] = {
        ...novosItens[index],
        quantidade: quantidade
      };
      setItens(novosItens);
    }
  };

  const adjustQuantidade = (index: number, amount: number) => {
    const novosItens = [...itens];
    const currentValue = parseFloat(novosItens[index].quantidade || '0');
    const newValue = Math.max(0, currentValue + amount);
    novosItens[index] = {
      ...novosItens[index],
      quantidade: newValue.toFixed(1)
    };
    setItens(novosItens);
  };

  const handleDataChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
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

  const handleAdicionarPedido = async () => {
    if (!fornecedorSelecionado) {
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
      fornecedor: fornecedorSelecionado,
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <AnimatedView from="top">
            <Text style={styles.title}>Adicionar Pedido</Text>
          </AnimatedView>

          <AnimatedView from="bottom" delay={200}>
            <Text style={styles.sectionTitle}>Fornecedor</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={fornecedorSelecionado}
                onValueChange={handleFornecedorChange}
                style={styles.picker}
              >
                <Picker.Item label="Selecione um fornecedor" value="" />
                {fornecedores.map((fornecedor, index) => (
                  <Picker.Item key={index} label={fornecedor} value={fornecedor} />
                ))}
              </Picker>
            </View>
          </AnimatedView>

          <AnimatedView from="bottom" delay={400}>
            <Text style={styles.sectionTitle}>Itens do Pedido</Text>
            {itens.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={styles.label}>Produto {index + 1}</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={item.produto?.codigo || ''}
                    onValueChange={(value) => handleProdutoChange(index, Number(value))}
                    style={styles.picker}
                    enabled={!!fornecedorSelecionado}
                  >
                    <Picker.Item label="Selecione um produto" value="" />
                    {produtosFiltrados.map((produto) => (
                      <Picker.Item 
                        key={produto.codigo} 
                        label={produto.descricao} 
                        value={produto.codigo} 
                      />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>Quantidade (kg)</Text>
                <View style={styles.quantidadeContainer}>
                  <TouchableOpacity 
                    style={styles.quantidadeButton}
                    onPress={() => adjustQuantidade(index, -0.5)}
                  >
                    <Icon name="remove" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.quantidadeInput}
                    value={item.quantidade}
                    onChangeText={(text) => handleQuantidadeChange(index, text)}
                    keyboardType="numeric"
                    placeholder="0.0"
                    textAlign="center"
                  />
                  
                  <TouchableOpacity 
                    style={styles.quantidadeButton}
                    onPress={() => adjustQuantidade(index, 0.5)}
                  >
                    <Icon name="add" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                {itens.length > 1 && (
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => handleRemoverItem(index)}
                  >
                    <Icon name="delete" size={20} color={theme.colors.error} />
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
                minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
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
            <TouchableOpacity 
              style={[
                styles.concluirButton, 
                (!fornecedorSelecionado || itens.some(item => !item.produto || !item.quantidade)) && 
                  styles.concluirButtonDisabled
              ]} 
              onPress={handleAdicionarPedido}
              disabled={!fornecedorSelecionado || itens.some(item => !item.produto || !item.quantidade)}
            >
              <Icon name="check-circle" size={24} color={theme.colors.surface} />
              <Text style={styles.concluirButtonText}>Concluir Pedido</Text>
            </TouchableOpacity>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>
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
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.m,
  },
  quantidadeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantidadeInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
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
  concluirButtonDisabled: {
    backgroundColor: theme.colors.textLight,
  },
  concluirButtonText: {
    color: theme.colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
});