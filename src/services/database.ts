// src/services/database.ts
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// --- INTERFACES E TIPAGENS DO SISTEMA ---
// ============================================================================

/**
 * Representa a estrutura de um produto no estoque de mercadorias.
 */
export interface Produto {
  codigo: number;         // Chave primária identificadora do produto
  descricao: string;      // Nome comercial / Especificação da carne
  quantidade: number;     // Saldo atual em estoque físico (representado em kg)
  categoria: string;      // Divisão logística (Ex: Bovina, Suína, Aves, Outros)
  precoUnitario: number;  // Valor de custo ou venda calculado por quilograma
  fornecedor: string;     // Nome da empresa ou frigorífico homologado
  ultimaEntrega?: string; // Timestamp do último recebimento bem-sucedido
}

/**
 * Representa uma Ordem de Compra/Pedido agendado no ecossistema logístico.
 */
export interface Pedido {
  id: number;
  data: string;               // Data estimada ou agendada da entrega das cargas
  horaEntrega?: string;       // Horário real em que a baixa de recebimento ocorreu
  status: 'aguardando' | 'entregue'; // Estado de controle do fluxo de recebimento
  fornecedor: string;         // Distribuidor responsável pelo lote
  notaFiscalRecebida: boolean; // Flag de auditoria e validação fiscal do manifesto
  itens: {
    produtoCodigo: number;    // FK associada ao código numérico do produto
    quantidade: number;       // Peso em kg destinado ao item do pedido
    precoUnitario?: number;   // Preço de fechamento do lote no momento da compra
  }[];
}

/**
 * Estrutura de auditoria temporal de movimentações físicas de estoque (Kardex).
 */
export interface HistoricoMovimento {
  id: number;
  produtoCodigo: number;      // Código identificador do item afetado
  quantidade: number;         // Volume em kg transferido na operação
  tipo: 'entrada' | 'saida';  // Sentido do fluxo de entrada ou saída física
  motivo: string;             // Justificativa operacional (Área de vendas, descarte, avaria)
  data: string;               // Carimbo de data/hora exato gerado pelo servidor/sistema
  pedidoId?: number;          // Vínculo opcional se a movimentação originar de um Pedido
}

// ============================================================================
// --- CONFIGURAÇÃO DE AMBIENTE E COMPORTAMENTO HÍBRIDO ---
// ============================================================================

// Instância global de conexão com o banco nativo SQLite
let db: SQLite.SQLiteDatabase | null = null;

// Determina se a aplicação roda em ambiente Web para desviar regras nativas
const isWeb = Platform.OS === 'web';

// Inicialização defensiva do SQLite em dispositivos móveis (Android/iOS)
if (!isWeb) {
  try { 
    db = SQLite.openDatabaseSync('meatpack.db'); 
  } catch (error) { 
    console.error('Erro crítico ao abrir base de dados local SQLite:', error); 
  }
}

/**
 * Recupera coleções simuladas em formato JSON armazenadas no LocalStorage da Web.
 */
const carregarDadosWeb = async (chave: string): Promise<any[]> => {
  try {
    const dados = await AsyncStorage.getItem(chave);
    return dados ? JSON.parse(dados) : [];
  } catch (e) { 
    return []; 
  }
};

/**
 * Persiste coleções convertidas em string no LocalStorage da Web.
 */
const salvarDadosWeb = async (chave: string, dados: any[]): Promise<void> => {
  try { 
    await AsyncStorage.setItem(chave, JSON.stringify(dados)); 
  } catch (e) {}
};

// ============================================================================
// --- INICIALIZAÇÃO E MODELAGEM DE TABELAS ---
// ============================================================================

/**
 * Executa as queries DDL de criação de tabelas físicas no Mobile 
 * ou popula os mocks de fornecedores iniciais caso o ambiente seja Web.
 */
export const initDB = async () => {
  if (isWeb) {
    // Inicialização de fornecedores padrão para testes no ambiente de desenvolvimento Web
    const f = await AsyncStorage.getItem('@meatpack_web:fornecedores');
    if (!f) {
      await AsyncStorage.setItem('@meatpack_web:fornecedores', JSON.stringify([
        'Frigorífico Central S/A', 
        'Distribuidora Boi Gordo'
      ]));
    }
    return;
  }
  
  if (!db) return;
  
  try {
    // Modelagem relacional estrita com chaves primárias, estrangeiras e restrições de unicidade
    db.execSync(
      `CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        apelido TEXT NOT NULL, 
        senha TEXT NOT NULL, 
        nomeCompleto TEXT NOT NULL, 
        endereco TEXT, 
        numero TEXT, 
        bairro TEXT, 
        municipio TEXT, 
        email TEXT UNIQUE NOT NULL, 
        telefone TEXT
      );
      CREATE TABLE IF NOT EXISTS products (
        codigo INTEGER PRIMARY KEY NOT NULL, 
        descricao TEXT NOT NULL, 
        quantidade REAL NOT NULL, 
        categoria TEXT NOT NULL, 
        precoUnitario REAL NOT NULL, 
        fornecedor TEXT NOT NULL, 
        ultimaEntrega TEXT
      );
      CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        data TEXT NOT NULL, 
        horaEntrega TEXT, 
        status TEXT NOT NULL, 
        fornecedor TEXT NOT NULL, 
        notaFiscalRecebida INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS itens_pedido (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        pedido_id INTEGER NOT NULL, 
        produto_codigo INTEGER NOT NULL, 
        quantidade REAL NOT NULL, 
        precoUnitario REAL, 
        FOREIGN KEY (pedido_id) REFERENCES pedidos (id), 
        FOREIGN KEY (produto_codigo) REFERENCES products (codigo)
      );
      CREATE TABLE IF NOT EXISTS historico_movimentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        produto_codigo INTEGER NOT NULL, 
        quantidade REAL NOT NULL, 
        tipo TEXT NOT NULL, 
        motivo TEXT NOT NULL, 
        data TEXT NOT NULL, 
        pedido_id INTEGER, 
        FOREIGN KEY (produto_codigo) REFERENCES products (codigo)
      );`
    );
  } catch (err) {
    console.error('Falha ao executar DDL de inicialização:', err);
  }
};

// ============================================================================
// --- MÓDULO: PRODUTOS E GESTÃO DE INVENTÁRIO (ESTOQUE) ---
// ============================================================================

/**
 * Retorna a listagem completa de produtos cadastrados no inventário.
 */
export async function getProdutos(): Promise<Produto[]> {
  if (isWeb) return await carregarDadosWeb('@meatpack_web:produtos');
  if (!db) return [];
  try { 
    return await db.getAllAsync<Produto>('SELECT * FROM products'); 
  } catch (error) { 
    return []; 
  }
}

/**
 * Realiza buscas textuais ou numéricas filtrando por descrição ou código do item.
 */
export async function searchProdutos(query: string): Promise<Produto[]> {
  const lower = query.toLowerCase();
  if (isWeb) {
    const produtos = await carregarDadosWeb('@meatpack_web:produtos');
    return produtos.filter(p => p.descricao.toLowerCase().includes(lower) || p.codigo.toString().includes(lower));
  }
  if (!db) return [];
  return await db.getAllAsync<Produto>(
    'SELECT * FROM products WHERE LOWER(descricao) LIKE ? OR CAST(codigo AS TEXT) LIKE ?', 
    [`%${lower}%`, `%${lower}%`]
  );
}

/**
 * Insere um novo produto no estoque. Lança um erro caso o código identificador já exista.
 */
export async function addProduto(produto: Produto): Promise<void> {
  const codigoLimpo = Number(produto.codigo);
  
  if (isWeb) {
    const produtos = await carregarDadosWeb('@meatpack_web:produtos');
    if (produtos.find(p => p.codigo === codigoLimpo)) throw new Error('Produto já cadastrado.');
    
    produtos.push({ 
      ...produto, 
      codigo: codigoLimpo, 
      quantidade: Number(produto.quantidade), 
      precoUnitario: Number(produto.precoUnitario), 
      fornecedor: produto.fornecedor.trim() 
    });
    await salvarDadosWeb('@meatpack_web:produtos', produtos);
    
    // Alimenta dinamicamente a lista de fornecedores se o fornecedor do produto for inédito
    const fornecedores = await carregarDadosWeb('@meatpack_web:fornecedores');
    if (!fornecedores.includes(produto.fornecedor.trim())) {
      fornecedores.push(produto.fornecedor.trim());
      await salvarDadosWeb('@meatpack_web:fornecedores', fornecedores);
    }
    return;
  }
  
  if (!db) return;
  // Bloco transacional para garantir a atomicidade da verificação e da inserção
  await db.withTransactionAsync(async () => {
    if (await db!.getFirstAsync('SELECT codigo FROM products WHERE codigo = ?', [codigoLimpo])) {
      throw new Error('Produto já cadastrado.');
    }
    await db!.runAsync(
      `INSERT INTO products (codigo, descricao, quantidade, categoria, precoUnitario, fornecedor) VALUES (?, ?, ?, ?, ?, ?)`, 
      [codigoLimpo, produto.descricao.trim(), Number(produto.quantidade), produto.categoria, Number(produto.precoUnitario), produto.fornecedor.trim()]
    );
  });
}

/**
 * Modifica os atributos de um produto. Suporta a alteração do próprio código chave primária 
 * mapeando o registro anterior através do parâmetro 'codigoAntigo'.
 */
export async function updateProduto(produto: Produto, codigoAntigo?: number): Promise<void> {
  const idBusca = codigoAntigo !== undefined ? Number(codigoAntigo) : Number(produto.codigo);
  
  if (isWeb) {
    const produtos = await carregarDadosWeb('@meatpack_web:produtos');
    const index = produtos.findIndex(p => p.codigo === idBusca);
    if (index !== -1) {
      produtos[index] = { 
        ...produto, 
        codigo: Number(produto.codigo), 
        quantidade: Number(produto.quantidade), 
        precoUnitario: Number(produto.precoUnitario) 
      };
      await salvarDadosWeb('@meatpack_web:produtos', produtos);
    }
    return;
  }
  
  if (!db) return;
  await db.runAsync(
    `UPDATE products SET codigo = ?, descricao = ?, quantidade = ?, categoria = ?, precoUnitario = ?, fornecedor = ?, ultimaEntrega = ? WHERE codigo = ?`, 
    [Number(produto.codigo), produto.descricao, Number(produto.quantidade), produto.categoria, Number(produto.precoUnitario), produto.fornecedor, produto.ultimaEntrega || null, idBusca]
  );
}

/**
 * Remove um produto permanentemente do inventário com base no código informado.
 */
export async function deleteProduto(codigo: number): Promise<void> {
  if (isWeb) {
    const produtos = await carregarDadosWeb('@meatpack_web:produtos');
    await salvarDadosWeb('@meatpack_web:produtos', produtos.filter(p => p.codigo !== codigo));
    return;
  }
  if (!db) return;
  await db.runAsync('DELETE FROM products WHERE codigo = ?', [Number(codigo)]);
}

/**
 * Registra a saída imediata de mercadorias por consumo, venda direta ou avaria,
 * decrementando o saldo atual e gravando uma linha no histórico de auditoria (Kardex).
 */
export async function registrarSaidaProduto(codigo: number, quantidadeSaida: number, motivo: string): Promise<void> {
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  if (isWeb) {
    const produtos = await carregarDadosWeb('@meatpack_web:produtos');
    const historico = await carregarDadosWeb('@meatpack_web:historico');
    const index = produtos.findIndex(p => p.codigo === codigo);
    
    if (index !== -1) {
      // Impede saldo negativo em nível lógico de aplicação
      produtos[index].quantidade = Math.max(0, produtos[index].quantidade - quantidadeSaida);
      historico.push({ id: Date.now(), produtoCodigo: codigo, quantidade: quantidadeSaida, tipo: 'saida', motivo, data: timestamp });
      
      await salvarDadosWeb('@meatpack_web:produtos', produtos);
      await salvarDadosWeb('@meatpack_web:historico', historico);
    }
    return;
  }
  
  if (!db) return;
  // Garante de forma atômica o decremento e a escrita do log histórico
  await db.withTransactionAsync(async () => {
    await db!.runAsync(`UPDATE products SET quantidade = MAX(0, quantidade - ?) WHERE codigo = ?`, [Number(quantidadeSaida), Number(codigo)]);
    await db!.runAsync(`INSERT INTO historico_movimentos (produto_codigo, quantidade, tipo, motivo, data) VALUES (?, ?, 'saida', ?, ?)`, [Number(codigo), Number(quantidadeSaida), motivo, timestamp]);
  });
}

/**
 * Extrai uma lista unificada de strings contendo as empresas fornecedoras que possuem
 * produtos cadastrados no sistema. Resolve problemas de espaços em branco (duplicatas).
 */
export async function getFornecedores(): Promise<string[]> {
  if (isWeb) return await carregarDadosWeb('@meatpack_web:fornecedores');
  if (!db) return [];
  try {
    // NOTA OPERACIONAL: O TRIM foi removido de dentro da query nativa (SELECT) para afastar falhas estruturais 
    // com aliases complexos no motor interno do expo-sqlite, sendo tratado diretamente no mapa de dados do JS.
    const result = await db.getAllAsync<any>('SELECT DISTINCT fornecedor FROM products WHERE fornecedor IS NOT NULL');
    const listaLimpa = result.map(r => r.fornecedor ? r.fornecedor.trim() : '').filter(f => f !== '');
    return [...new Set(listaLimpa)]; // Elimina duplicidades causadas por espaçamento inconsistente no banco
  } catch (error) {
    return [];
  }
}

/**
 * Recupera o log completo de movimentações (entradas e saídas) filtrado por um produto específico.
 */
export async function getHistoricoProduto(produtoCodigo: number): Promise<HistoricoMovimento[]> {
  if (isWeb) {
    const historico = await carregarDadosWeb('@meatpack_web:historico');
    return historico.filter(h => h.produtoCodigo === produtoCodigo);
  }
  if (!db) return [];
  return await db.getAllAsync<HistoricoMovimento>(
    'SELECT id, produto_codigo as produtoCodigo, quantidade, tipo, motivo, data, pedido_id as pedidoId FROM historico_movimentos WHERE produto_codigo = ? ORDER BY id DESC', 
    [Number(produtoCodigo)]
  );
}

// ============================================================================
// --- MÓDULO: GESTÃO E AGENDAMENTO DE PEDIDOS COMERCIAIS ---
// ============================================================================

/**
 * Registra um agendamento de compra logística e vincula em lote seus respectivos itens.
 */
export async function adicionarPedido(pedido: Omit<Pedido, 'id'>): Promise<number> {
  if (isWeb) {
    const pedidos = await carregarDadosWeb('@meatpack_web:pedidos');
    const novoId = pedidos.length + 1;
    pedidos.push({ id: novoId, ...pedido });
    await salvarDadosWeb('@meatpack_web:pedidos', pedidos);
    return novoId;
  }
  
  if (!db) return 0;
  let pedidoId = 0;
  
  // Transação mestre: Registra a cabeçalho do pedido e faz o loop de inserção na tabela de junção (N:M)
  await db.withTransactionAsync(async () => {
    const result = await db!.runAsync(
      `INSERT INTO pedidos (data, horaEntrega, status, fornecedor, notaFiscalRecebida) VALUES (?, ?, ?, ?, ?)`, 
      [pedido.data, pedido.horaEntrega || null, pedido.status, pedido.fornecedor.trim(), pedido.notaFiscalRecebida ? 1 : 0]
    );
    pedidoId = result.lastInsertRowId;
    
    for (const item of pedido.itens) {
      await db!.runAsync(
        `INSERT INTO itens_pedido (pedido_id, produto_codigo, Drug, quantidade, precoUnitario) VALUES (?, ?, ?, ?)`, 
        [pedidoId, Number(item.produtoCodigo), Number(item.quantidade), item.precoUnitario ? Number(item.precoUnitario) : null]
      );
    }
  });
  return pedidoId;
}

/**
 * Lista todos os pedidos gerando uma junção virtual (Hydration) entre a tabela 
 * de pedidos e as linhas vinculadas na tabela itens_pedido.
 */
export async function listarPedidos(): Promise<Pedido[]> {
  if (isWeb) return await carregarDadosWeb('@meatpack_web:pedidos');
  if (!db) return [];
  
  const pedidosRows = await db.getAllAsync<any>('SELECT * FROM pedidos ORDER BY id DESC');
  const pedidosMap = new Map<number, Pedido>();
  const ids: number[] = [];

  // Mapeia os cabeçalhos dos pedidos para estruturação do dicionário de dados
  for (const row of pedidosRows) {
    pedidosMap.set(row.id, { 
      id: row.id, 
      data: row.data, 
      horaEntrega: row.horaEntrega, 
      status: row.status, 
      fornecedor: row.fornecedor, 
      notaFiscalRecebida: row.notaFiscalRecebida === 1, 
      itens: [] 
    });
    ids.push(row.id);
  }
  
  if (ids.length === 0) return [];
  
  // Técnica de injeção dinâmica de placeholders (?,?,?) para evitar a query N+1 e ler os itens de uma só vez
  const placeholders = ids.map(() => '?').join(',');
  const itensRows = await db.getAllAsync<any>(`SELECT * FROM itens_pedido WHERE pedido_id IN (${placeholders})`, ids);
  
  // Distribui os sub-itens coletados de volta para as instâncias dos seus respectivos pais (pedidos)
  for (const itemRow of itensRows) {
    const pedido = pedidosMap.get(itemRow.pedido_id);
    if (pedido) {
      pedido.itens.push({ 
        produtoCodigo: itemRow.produto_codigo, 
        quantidade: itemRow.quantidade, 
        precoUnitario: itemRow.precoUnitario 
      });
    }
  }
  return Array.from(pedidosMap.values());
}

/**
 * Altera o status do pedido para entregue. Dispara um gatilho sistêmico em lote 
 * que incrementa a quantidade do estoque físico do produto e escreve logs no Kardex.
 */
export async function atualizarStatusPedido(id: number, status: 'aguardando' | 'entregue'): Promise<void> {
  const timestampAtualDoSistema = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  if (isWeb) {
    const pedidos = await carregarDadosWeb('@meatpack_web:pedidos');
    const produtos = await carregarDadosWeb('@meatpack_web:produtos');
    const historico = await carregarDadosWeb('@meatpack_web:historico');
    const index = pedidos.findIndex(p => p.id === id);
    
    if (index !== -1 && status === 'entregue') {
      pedidos[index].status = 'entregue'; 
      pedidos[index].horaEntrega = timestampAtualDoSistema;
      
      for (const item of pedidos[index].itens) {
        const pIndex = produtos.findIndex(p => p.codigo === item.produtoCodigo);
        if (pIndex !== -1) { 
          produtos[pIndex].quantidade += item.quantidade; 
          produtos[pIndex].ultimaEntrega = timestampAtualDoSistema; 
        }
        historico.push({ id: Date.now(), produtoCodigo: item.produtoCodigo, quantidade: item.quantidade, tipo: 'entrada', motivo: 'Recebimento de Pedido', data: timestampAtualDoSistema, pedidoId: id });
      }
      await salvarDadosWeb('@meatpack_web:pedidos', pedidos); 
      await salvarDadosWeb('@meatpack_web:produtos', produtos); 
      await salvarDadosWeb('@meatpack_web:historico', historico);
    }
    return;
  }
  
  if (!db) return;
  if (status === 'entregue') {
    // Transação de segurança: Garante consistência total entre o status da carga, a atualização do estoque e a gravação do histórico fiscal
    await db.withTransactionAsync(async () => {
      await db!.runAsync(`UPDATE pedidos SET status = ?, horaEntrega = ? WHERE id = ?`, [status, timestampAtualDoSistema, id]);
      const itens = await db!.getAllAsync<any>('SELECT * FROM itens_pedido WHERE pedido_id = ?', [id]);
      
      for (const item of itens) {
        await db!.runAsync(`UPDATE products SET quantidade = quantidade + ?, ultimaEntrega = ? WHERE codigo = ?`, [Number(item.quantidade), timestampAtualDoSistema, Number(item.produto_codigo)]);
        await db!.runAsync(`INSERT INTO historico_movimentos (produto_codigo, quantidade, tipo, motivo, data, pedido_id) VALUES (?, ?, 'entrada', 'Recebimento de Pedido', ?, ?)`, [Number(item.produto_codigo), Number(item.quantidade), timestampAtualDoSistema, id]);
      }
    });
  }
}

/**
 * Atualiza o status de validação fiscal (Nota Fiscal Recebida) de um determinado pedido.
 */
export async function atualizarNotaFiscalPedido(id: number, recebida: boolean): Promise<void> {
  if (isWeb) {
    const pedidos = await carregarDadosWeb('@meatpack_web:pedidos');
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) { 
      pedidos[index].notaFiscalRecebida = recebida; 
      await salvarDadosWeb('@meatpack_web:pedidos', pedidos); 
    }
    return;
  }
  if (!db) return;
  await db.runAsync(`UPDATE pedidos SET notaFiscalRecebida = ? WHERE id = ?`, [recebida ? 1 : 0, id]);
}

// ============================================================================
// --- MÓDULO: SEGURANÇA E GERENCIAMENTO DE OPERADORES (CLIENTES) ---
// ============================================================================

/**
 * Insere as credenciais e dados de cadastro de um novo funcionário/operador.
 */
export async function addCliente(cliente: any): Promise<void> {
  if (isWeb) {
    const clientes = await carregarDadosWeb('@meatpack_web:clientes');
    if (clientes.some((c: any) => c.email.toLowerCase() === cliente.email.trim().toLowerCase())) {
      throw new Error('E-mail já cadastrado no sistema Web.');
    }
    clientes.push({ id: Date.now(), apelido: cliente.email.trim(), senha: cliente.senha, nomeCompleto: cliente.nomeCompleto, email: cliente.email.trim(), telefone: cliente.telefone || '' });
    await salvarDadosWeb('@meatpack_web:clientes', clientes);
    return;
  }
  if (!db) return;
  await db.runAsync(
    `INSERT INTO clientes (apelido, senha, nomeCompleto, email, telefone) VALUES (?, ?, ?, ?, ?)`, 
    [cliente.email.trim(), cliente.senha, cliente.nomeCompleto, cliente.email.trim(), cliente.telefone || '']
  );
}

/**
 * Lista todos os operadores do sistema, filtrando e omitindo as credenciais master do 'admin'.
 */
export async function listarClientes(): Promise<any[]> {
  if (isWeb) return await carregarDadosWeb('@meatpack_web:clientes');
  if (!db) return [];
  return await db.getAllAsync('SELECT * FROM clientes WHERE email != "admin" AND email != "admin@meatpack.com"');
}

/**
 * Atualiza os dados de perfil de um operador, permitindo ou não a redefinição de sua senha.
 */
export async function updateCliente(id: number, dados: any): Promise<void> {
  if (isWeb) {
    const clientes = await carregarDadosWeb('@meatpack_web:clientes');
    const index = clientes.findIndex((c: any) => c.id === id);
    if (index !== -1) { 
      clientes[index] = { ...clientes[index], ...dados }; 
      await salvarDadosWeb('@meatpack_web:clientes', clientes); 
    }
    return;
  }
  if (!db) return;
  if (dados.senha) { 
    await db.runAsync('UPDATE clientes SET nomeCompleto = ?, email = ?, senha = ?, apelido = ? WHERE id = ?', [dados.nomeCompleto, dados.email.trim(), dados.senha, dados.email.trim(), id]); 
  } else { 
    await db.runAsync('UPDATE clientes SET nomeCompleto = ?, email = ?, apelido = ? WHERE id = ?', [dados.nomeCompleto, dados.email.trim(), dados.email.trim(), id]); 
  }
}

/**
 * Deleta permanentemente a conta de um operador do sistema através do ID de registro.
 */
export async function deleteCliente(id: number): Promise<void> {
  if (isWeb) {
    const clientes = await carregarDadosWeb('@meatpack_web:clientes');
    await salvarDadosWeb('@meatpack_web:clientes', clientes.filter((c: any) => c.id !== id));
    return;
  }
  if (!db) return;
  await db.runAsync('DELETE FROM clientes WHERE id = ?', [id]);
}

/**
 * Altera exclusivamente a string correspondente à senha do operador localizado pelo e-mail.
 */
export async function updateSenhaOperador(email: string, novaSenha: string): Promise<void> {
  if (isWeb) {
    const clientes = await carregarDadosWeb('@meatpack_web:clientes');
    const index = clientes.findIndex((c: any) => c.email === email);
    if (index !== -1) { 
      clientes[index].senha = novaSenha; 
      await salvarDadosWeb('@meatpack_web:clientes', clientes); 
    }
    return;
  }
  if (!db) return;
  await db.runAsync('UPDATE clientes SET senha = ? WHERE email = ?', [novaSenha, email]);
}