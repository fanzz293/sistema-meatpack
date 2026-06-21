// src/screens/common/RegistrarSaidaScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getProdutos, registrarSaidaProduto, Produto } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import ScreenWrapper from '../../components/ScreenWrapper';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'RegistrarSaida'>;

const MOTIVOS_SAIDA = [
  'Preparo para a área de vendas',
  'Troca com fornecedor por avaria',
  'Troca com fornecedor por erro na entrega',
  'Reservado para cliente'
];

const RegistrarSaidaScreen: React.FC<Props> = ({ navigation, route }) => {
  const [produtosComEstoque, setProdutosComEstoque] = useState<Produto[]>([]);
  const [itensSaida, setItensSaida] = useState([{ produto: null as Produto | null, quantidade: '', motivo: '' }]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

  const carregarProdutos = async () => {
    const lista = await getProdutos();
    setProdutosComEstoque(lista.filter(p => p.quantidade > 0));
  };

  useEffect(() => { 
    carregarProdutos(); 
  }, []);

  const handleRegistrarSaida = async () => {
    for (const item of itensSaida) {
      if (!item.produto || !item.quantidade || !item.motivo) {
        Alert.alert('Erro', 'Preencha todos os campos de cada item.');
        return;
      }
    }

    try {
      for (const item of itensSaida) {
        if (item.produto) {
          await registrarSaidaProduto(item.produto.codigo, parseFloat(item.quantidade), item.motivo);
        }
      }
      
      // Redireciona instantaneamente injetando o parâmetro da mensagem de liberação
      navigation.navigate('ConsultarEstoque', { infoMessage: 'Mercadoria liberada para saída' });

    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar.');
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <AnimatedView from="top">
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Registrar Saída</Text>
            <Text style={styles.pageDescription}>
              Realize baixas e descartes imediatos no inventário físico.
            </Text>
          </View>
        </AnimatedView>

        <AnimatedView from="bottom" delay={150}>
          <View style={styles.panelCardContainer}>
            {itensSaida.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={styles.label}>Produto Selecionado</Text>
                <TouchableOpacity style={styles.selecionarButton} onPress={() => setModalVisivel(true)}>
                  <Text style={item.produto ? styles.txtBtnAtivo : styles.txtBtnPlaceholder}>
                    {item.produto ? `${item.produto.descricao} (Disponível: ${item.produto.quantidade} kg)` : 'Selecionar Produto de Estoque'}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, styles.flex4]}>
                    <Text style={styles.label}>Quantidade (kg)</Text>
                    <TextInput style={styles.input} placeholder="0.00" value={item.quantidade} onChangeText={(text) => {
                      const novos = [...itensSaida];
                      novos[index].quantidade = text;
                      setItensSaida(novos);
                    }} keyboardType="numeric" />
                  </View>

                  <View style={[styles.inputGroup, styles.flex6]}>
                    <Text style={styles.label}>Motivo do Descarte / Saída</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={item.motivo}
                        onValueChange={(value) => {
                          const novos = [...itensSaida];
                          novos[index].motivo = value;
                          setItensSaida(novos);
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="Selecione o motivo" value="" />
                        {MOTIVOS_SAIDA.map((motivo, idx) => (
                          <Picker.Item key={idx} label={motivo} value={motivo} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.button} onPress={handleRegistrarSaida}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Confirmar e Salvar Saída</Text>
            </TouchableOpacity>
          </View>
        </AnimatedView>
      </ScrollView>

      {/* MODAL DE SELEÇÃO */}
      <Modal visible={modalVisivel} transparent={true} animationType="fade" onRequestClose={() => setModalVisivel(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Produto</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}><Icon name="close" size={24} /></TouchableOpacity>
            </View>
            <TextInput style={styles.buscaInput} placeholder="Buscar por código ou descrição..." value={termoBusca} onChangeText={setTermoBusca} />
            <FlatList
              data={produtosComEstoque.filter(p => p.descricao.toLowerCase().includes(termoBusca.toLowerCase()))}
              keyExtractor={(item) => item.codigo.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.produtoItem} onPress={() => {
                  const novos = [...itensSaida];
                  novos[0].produto = item;
                  setItensSaida(novos);
                  setModalVisivel(false);
                }}>
                  <Text style={styles.produtoNome}>{item.descricao}</Text>
                  <Text style={styles.produtoDetalhes}>Código: #{item.codigo} | Estoque: {item.quantidade} kg</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

export default RegistrarSaidaScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)' },
  contentContainer: { padding: theme.spacing.m, paddingBottom: 40 },
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.l, maxWidth: 700, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center', marginBottom: theme.spacing.xs },
  pageDescription: { fontSize: 14, color: theme.colors.textLight, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
  panelCardContainer: { backgroundColor: '#FFF', padding: 24, borderRadius: theme.borderRadius.m, width: '100%', maxWidth: 800, alignSelf: 'center', ...theme.shadows.s, borderWidth: 1, borderColor: '#dcdcdc' },
  itemContainer: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  selecionarButton: { borderWidth: 1, borderColor: theme.colors.primaryLight, padding: 12, borderRadius: 6, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', height: 48 },
  txtBtnPlaceholder: { color: theme.colors.textLight, fontSize: 15 },
  txtBtnAtivo: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  formRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16 },
  inputGroup: { marginBottom: 10, flex: 1 },
  flex4: { flex: Platform.OS === 'web' ? 4 : undefined },
  flex6: { flex: Platform.OS === 'web' ? 6 : undefined },
  input: { borderWidth: 1, borderColor: theme.colors.primaryLight, padding: 12, borderRadius: 6, backgroundColor: '#FFF', fontSize: 15, height: 48 },
  pickerContainer: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, backgroundColor: '#FFF', overflow: 'hidden', height: 48, justifyContent: 'center' },
  picker: { height: 48, width: '100%' },
  button: { backgroundColor: theme.colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 15, ...theme.shadows.m, height: 50, justifyContent: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  modalContent: { width: '90%', maxWidth: 440, backgroundColor: '#FFF', borderRadius: 8, padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary },
  buscaInput: { padding: 10, borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, marginBottom: 12, backgroundColor: '#FFF' },
  produtoItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  produtoNome: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  produtoDetalhes: { fontSize: 14, color: theme.colors.textLight }
});