// src/screens/common/ConfiguracoesScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import { listarClientes, deleteCliente, updateCliente, Cliente } from '../../services/database';
import ScreenWrapper from '../../components/ScreenWrapper';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';

// Tipagem das propriedades de navegação vinculadas à rota de Configurações
type Props = NativeStackScreenProps<RootStackParamList, 'Configuracoes'>;

// Contrato de interface local para renderização segura na listagem de usuários do painel
interface UsuarioSistema {
  id: number;
  nomeCompleto: string;
  email: string;
  apelido: string; // Obrigatório no estado interno da View
}

/**
 * Utilitário multiplataforma para exibição de diálogos visuais.
 * Redireciona a chamada para janelas nativas do navegador se rodando em ambiente Web.
 */
const exibirAlerta = (titulo: string, mensagem: string, botoes?: { text: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    const botaoOk = botoes?.find(b => b.onPress);
    if (botaoOk && botaoOk.onPress) botaoOk.onPress();
  } else {
    Alert.alert(titulo, mensagem, botoes);
  }
};

/**
 * Tela de Configurações e Gestão de Contas de Operadores.
 * Permite a visualização, exclusão e edição cadastral de perfis de usuários homologados no sistema.
 */
export default function ConfiguracoesScreen({ route, navigation }: Props) {
  // Coleta os dados do usuário autenticado enviados através dos parâmetros da rota
  const usuarioLogado = route.params?.usuarioAtual;

  // --- ESTADOS REATIVOS DA INTERFACE ---
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [emailEditado, setEmailEditado] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. CARGA DINÂMICA DE USUÁRIOS (HOOK DE FOCO)
  // Orquestra a busca de operadores cadastrados no banco de dados SQLite / LocalStorage
  useFocusEffect(
    useCallback(() => {
      const carregarOperadores = async () => {
        try {
          const listaDados: Cliente[] = await listarClientes();
          
          // CORRIGIDO: Mapeia os dados da base garantindo que propriedades opcionais (?.) 
          // satisfaçam o contrato estrito da interface local 'UsuarioSistema'
          const listaTratada: UsuarioSistema[] = listaDados.map((u: Cliente) => ({
            id: u.id ?? 0,
            nomeCompleto: u.nomeCompleto,
            email: u.email,
            apelido: u.apelido || u.nomeCompleto.split(' ')[0] // Fallback amigável caso não exista apelido
          }));

          setUsuarios(listaTratada);
        } catch (error) {
          console.error('Falha ao sincronizar operadores do sistema:', error);
        }
      };

      carregarOperadores();
    }, [])
  );

  /**
   * Ativa o modo de edição em linha para o card de usuário selecionado.
   */
  const iniciarEdicao = (usuario: UsuarioSistema) => {
    setEditandoId(usuario.id);
    setNomeEditado(usuario.nomeCompleto);
    setEmailEditado(usuario.email);
  };

  /**
   * Cancela as alterações em linha e limpa os buffers de texto.
   */
  const cancelarEdicao = () => {
    setEditandoId(null);
    setNomeEditado('');
    setEmailEditado('');
  };

  /**
   * Salva as alterações cadastrais do operador no banco de dados.
   */
  const salvarAlteracoes = async (id: number) => {
    if (!nomeEditado.trim() || !emailEditado.trim()) {
      exibirAlerta('Aviso', 'Todos os campos cadastrais obrigatórios devem ser preenchidos.');
      return;
    }

    setLoading(true);
    try {
      // Envia os dados higienizados para a camada de persistência
      await updateCliente(id, {
        nomeCompleto: nomeEditado.trim(),
        email: emailEditado.trim()
      });

      // Atualiza o estado em memória local para refletir a mudança imediatamente na UI
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, nomeCompleto: nomeEditado.trim(), email: emailEditado.trim() } : u));
      setEditandoId(null);
      exibirAlerta('Sucesso', 'Dados cadastrais do operador atualizados com sucesso.');
    } catch (error) {
      exibirAlerta('Erro', 'Não foi possível salvar as alterações cadastrais.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove o cadastro de um operador do sistema de forma definitiva.
   * Cláusula de barreira impede o auto-desligamento do usuário ativo.
   */
  const confirmarExclusaoOperador = (id: number, emailOperador: string) => {
    if (usuarioLogado && usuarioLogado.email === emailOperador) {
      exibirAlerta('Operação Recusada', 'Por motivos de segurança, você não pode excluir sua própria conta enquanto estiver conectado.');
      return;
    }

    const processarExclusao = async () => {
      try {
        await deleteCliente(id);
        setUsuarios(prev => prev.filter(u => u.id !== id));
        exibirAlerta('Sucesso', 'Operador removido das credenciais de acesso do sistema.');
      } catch (error) {
        exibirAlerta('Erro', 'Falha ao processar a exclusão do usuário.');
      }
    };

    if (Platform.OS === 'web') {
      const confirmacao = window.confirm('Atenção: Esta ação é irreversível. Deseja realmente remover este operador?');
      if (confirmacao) processarExclusao();
    } else {
      Alert.alert(
        'Confirmar Exclusão',
        'Tem certeza que deseja remover este operador do sistema? Ele perderá acesso imediato ao painel logístico.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Remover', style: 'destructive', onPress: processarExclusao }
        ]
      );
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        {/* CONTAINER DO TOPO - PERFIL ATIVO */}
        <AnimatedView from="top" duration={400}>
          <View style={styles.profileSectionCard}>
            <Icon name="account-box" size={64} color={theme.colors.primary} />
            <Text style={styles.userNameText}>{usuarioLogado?.nomeCompleto || 'Operador Meatpack'}</Text>
            <Text style={styles.userEmailText}>{usuarioLogado?.email || 'logistica@meatpack.com.br'}</Text>
            <View style={styles.badgeSession}>
              <Text style={styles.badgeSessionText}>Sessão Autenticada</Text>
            </View>
          </View>
        </AnimatedView>

        {/* CONTAINER DA LISTAGEM E CONVITES DE CONTAS */}
        <AnimatedView from="bottom" delay={150} duration={450}>
          <View style={styles.managementPanelCard}>
            <Text style={styles.panelTitle}>Gerenciamento de Operadores</Text>
            <Text style={styles.panelSubtitle}>Visualize e gerencie quem possui credenciais de acesso ao terminal.</Text>

            {usuarios.length === 0 ? (
              <Text style={styles.txtEmptyList}>Nenhum operador alternativo localizado na base.</Text>
            ) : (
              <View style={styles.listWrapper}>
                {usuarios.map((item) => (
                  <View key={item.id} style={styles.userRowCard}>
                    
                    {editandoId === item.id ? (
                      /* FORMULÁRIO DE EDIÇÃO EM LINHA */
                      <View style={styles.editFormContainer}>
                        <TextInput 
                          style={styles.inputField} 
                          value={nomeEditado} 
                          onChangeText={setNomeEditado} 
                          placeholder="Nome Completo" 
                        />
                        <TextInput 
                          style={styles.inputField} 
                          value={emailEditado} 
                          onChangeText={setEmailEditado} 
                          placeholder="E-mail de Acesso" 
                          keyboardType="email-address" 
                          autoCapitalize="none"
                        />
                        <View style={styles.rowActionsContainer}>
                          <TouchableOpacity 
                            style={[styles.btnAction, styles.btnSave, loading && { opacity: 0.6 }]} 
                            onPress={() => salvarAlteracoes(item.id)}
                            disabled={loading}
                          >
                            <Text style={styles.btnActionText}>Salvar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.btnAction, styles.btnCancel]} onPress={cancelarEdicao}>
                            <Text style={styles.btnActionText}>Cancelar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* VISUALIZAÇÃO PADRÃO DO CARD */
                      <View style={styles.viewRowContainer}>
                        <View style={styles.userInfoTextGroup}>
                          <Text style={styles.txtOperatorName}>{item.nomeCompleto} ({item.apelido})</Text>
                          <Text style={styles.txtOperatorEmail}>{item.email}</Text>
                        </View>
                        
                        <View style={styles.rowControlButtons}>
                          <TouchableOpacity style={styles.iconControlButton} onPress={() => iniciarEdicao(item)}>
                            <Icon name="edit" size={20} color="#0288d1" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.iconControlButton} onPress={() => confirmarExclusaoOperador(item.id, item.email)}>
                            <Icon name="person-remove" size={20} color="#d32f2f" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                  </View>
                ))}
              </View>
            )}

          </View>
        </AnimatedView>

      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================================================
// --- FOLHA DE ESTILOS DA INTERFACE (STYLESHEET) ---
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)' },
  contentContainer: { padding: theme.spacing.m, paddingBottom: 40, alignItems: 'center' },
  profileSectionCard: { backgroundColor: '#FFF', width: '100%', maxWidth: 650, padding: 24, borderRadius: theme.borderRadius.m, alignItems: 'center', marginBottom: theme.spacing.m, ...theme.shadows.s, borderWidth: 1, borderColor: '#e6e6e6' },
  userNameText: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginTop: 8 },
  userEmailText: { fontSize: 14, color: theme.colors.textLight, marginBottom: 12 },
  badgeSession: { backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeSessionText: { color: '#2e7d32', fontSize: 12, fontWeight: '600' },
  managementPanelCard: { backgroundColor: '#FFF', width: '100%', maxWidth: 650, padding: 20, borderRadius: theme.borderRadius.m, ...theme.shadows.s, borderWidth: 1, borderColor: '#e6e6e6' },
  panelTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 4 },
  panelSubtitle: { fontSize: 13, color: theme.colors.textLight, marginBottom: 16 },
  txtEmptyList: { textAlign: 'center', color: '#888', fontStyle: 'italic', marginVertical: 20 },
  listWrapper: { width: '100%' },
  userRowCard: { backgroundColor: '#fdfdfd', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  viewRowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfoTextGroup: { flex: 1, paddingRight: 10 },
  txtOperatorName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  txtOperatorEmail: { fontSize: 13, color: theme.colors.textLight, marginTop: 2 },
  rowControlButtons: { flexDirection: 'row', gap: 12 },
  iconControlButton: { padding: 6 },
  editFormContainer: { width: '100%', gap: 8 },
  inputField: { borderWidth: 1, borderColor: theme.colors.primaryLight, padding: 10, borderRadius: 6, backgroundColor: '#FFF', fontSize: 14, height: 44 },
  rowActionsContainer: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnAction: { flex: 1, height: 38, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  btnSave: { backgroundColor: '#2e7d32' },
  btnCancel: { backgroundColor: '#757575' },
  btnActionText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 }
});