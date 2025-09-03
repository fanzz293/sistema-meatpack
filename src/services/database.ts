// src/services/database.ts
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------- Tipos ---------- */
export type Cliente = {
  apelido: string;
  senha: string;
  nomeCompleto: string;
  endereco: string;
  numero: string;
  bairro: string;
  municipio: string;
  cpf: string;
  email: string;
  telefone: string;
  aceitaTermos?: boolean;
  verificado?: boolean;
};

export type Categoria = 'Bovina' | 'Suína' | 'Aves' | 'Outros';

export type Produto = {
  codigo: number;
  descricao: string;
  quantidade: number;
  categoria: Categoria;
  precoUnitario: number;
  fornecedor: string;
  ultimaEntrega?: string;
};

export type ItemPedido = {
  produtoCodigo: number;
  quantidade: number;
  precoUnitario: number;
};

export type Pedido = {
  id: number;
  data: string;
  horaEntrega?: string;
  itens: ItemPedido[];
  status: 'aguardando' | 'entregue';
  fornecedor: string;
  notaFiscalRecebida: boolean;
};

export type HistoricoMovimento = {
  id: number;
  produtoCodigo: number;
  data: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo: string;
  pedidoId?: number;
};

/* ---------- Constantes ---------- */
const ASYNC_USERS_KEY = 'MEATPACK_USERS_V2';
const ASYNC_PRODUCTS_KEY = 'MEATPACK_PRODUCTS_V1';
const ASYNC_PEDIDOS_KEY = 'MEATPACK_PEDIDOS_V1';
const ASYNC_FORNECEDORES_KEY = 'MEATPACK_FORNECEDORES_V1';
const ASYNC_HISTORICO_KEY = 'MEATPACK_HISTORICO_V1';

const IS_WEB = Platform.OS === 'web';
const hasSQLite = !IS_WEB && typeof (SQLite as any).openDatabase === 'function';

let db: any = null;

/* ---------- Conexão Segura ---------- */
function openDBSafe() {
  if (hasSQLite) {
    try {
      return (SQLite as any).openDatabase('meatpack.db');
    } catch (err) {
      console.warn('Erro abrindo SQLite:', err);
      return null;
    }
  }
  return null;
}

/* ---------- Inicialização ---------- */
export async function initDatabase(): Promise<void> {
  db = openDBSafe();
  if (!db) return;

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        // Tabela de clientes
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT NOT NULL,
            password TEXT NOT NULL,
            fullname TEXT NOT NULL,
            address TEXT,
            numero TEXT,
            bairro TEXT,
            municipio TEXT,
            cpf TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            acceptTerms INTEGER,
            verificado INTEGER DEFAULT 1
          );`
        );

        // Tabela de produtos
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS products (
            codigo INTEGER PRIMARY KEY,
            descricao TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            categoria TEXT NOT NULL,
            precoUnitario REAL NOT NULL,
            fornecedor TEXT NOT NULL,
            ultimaEntrega TEXT
          );`
        );

        // Tabela de pedidos
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            horaEntrega TEXT,
            status TEXT NOT NULL,
            fornecedor TEXT NOT NULL,
            notaFiscalRecebida INTEGER DEFAULT 0
          );`
        );

        // Tabela de itens de pedido
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS itens_pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            produto_codigo INTEGER NOT NULL,
            quantidade REAL NOT NULL,
            precoUnitario REAL NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
            FOREIGN KEY (produto_codigo) REFERENCES products(codigo)
          );`
        );

        // Tabela de histórico de movimentos
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS historico_movimentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_codigo INTEGER NOT NULL,
            data TEXT NOT NULL,
            tipo TEXT NOT NULL,
            quantidade REAL NOT NULL,
            motivo TEXT,
            pedido_id INTEGER,
            FOREIGN KEY (produto_codigo) REFERENCES products(codigo)
          );`
        );
      },
      (err: any) => reject(err),
      () => resolve()
    );
  });
}

export const initDB = initDatabase;

/* ---------- Utilitários ---------- */
export const formatCurrency = (value: number | undefined): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00';
  }
  return value.toFixed(2);
};

// Validação de CPF
export const validateCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  
  return remainder === parseInt(cpf.charAt(10));
};

// Validação de senha
export const validatePassword = (password: string): boolean => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

/* ---------- Clientes ---------- */
export async function addCliente(cliente: Cliente): Promise<void> {
  const normalizedEmail = (cliente.email ?? '').trim().toLowerCase();
  const clienteToStore: Cliente = {
    ...cliente,
    email: normalizedEmail,
    senha: (cliente.senha ?? '').trim(),
    verificado: true
  };

  if (!validatePassword(clienteToStore.senha)) {
    throw new Error('A senha deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, 1 número e 1 símbolo.');
  }

  if (!validateCPF(clienteToStore.cpf)) {
    throw new Error('CPF inválido.');
  }

  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_USERS_KEY);
    const users: Cliente[] = raw ? JSON.parse(raw) : [];
    const duplicate = users.find(
      u => (u.email ?? '').toLowerCase() === normalizedEmail || u.cpf === clienteToStore.cpf
    );
    if (duplicate) throw new Error('Email ou CPF já cadastrado');
    users.push(clienteToStore);
    await AsyncStorage.setItem(ASYNC_USERS_KEY, JSON.stringify(users));
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT id FROM users WHERE email = ? OR cpf = ? LIMIT 1',
        [normalizedEmail, clienteToStore.cpf],
        (_tx: any, result: any) => {
          if (result.rows.length > 0) {
            reject(new Error('Email ou CPF já cadastrado'));
            return;
          }
          tx.executeSql(
            `INSERT INTO users (nickname, password, fullname, address, numero, bairro, municipio, cpf, email, phone, acceptTerms, verificado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              clienteToStore.apelido,
              clienteToStore.senha,
              clienteToStore.nomeCompleto,
              clienteToStore.endereco,
              clienteToStore.numero,
              clienteToStore.bairro,
              clienteToStore.municipio,
              clienteToStore.cpf,
              clienteToStore.email,
              clienteToStore.telefone,
              clienteToStore.aceitaTermos ? 1 : 0,
              1
            ],
            () => resolve(),
            (_tx2: any, error2: any) => {
              reject(error2);
              return false;
            }
          );
        }
      );
    }, reject);
  });
}

export async function loginCliente(email: string, senha: string): Promise<Cliente> {
  const normalizedEmail = (email ?? '').trim().toLowerCase();
  const passwordTrimmed = (senha ?? '').trim();

  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_USERS_KEY);
    const users: Cliente[] = raw ? JSON.parse(raw) : [];
    const user = users.find(
      u => (u.email ?? '').trim().toLowerCase() === normalizedEmail && (u.senha ?? '').trim() === passwordTrimmed
    );
    if (!user) throw new Error('Credenciais inválidas');
    return user;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail],
        (_tx: any, result: any) => {
          if (result.rows.length === 0) {
            reject(new Error('Credenciais inválidas'));
            return;
          }
          const row = result.rows.item(0);
          if ((row.password ?? '').trim() !== passwordTrimmed) {
            reject(new Error('Credenciais inválidas'));
            return;
          }
          resolve({
            apelido: row.nickname,
            senha: row.password,
            nomeCompleto: row.fullname,
            endereco: row.address,
            numero: row.numero,
            bairro: row.bairro,
            municipio: row.municipio,
            cpf: row.cpf,
            email: row.email,
            telefone: row.phone,
            aceitaTermos: !!row.acceptTerms,
            verificado: !!row.verificado
          });
        }
      );
    }, reject);
  });
}

/* ---------- Produtos ---------- */
export async function addProduto(produto: Produto): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    const produtos: Produto[] = raw ? JSON.parse(raw) : [];
    
    if (produtos.find(p => p.codigo === produto.codigo)) {
      throw new Error('Código já cadastrado');
    }
    
    const nomeNormalizado = produto.descricao.trim().toLowerCase();
    if (produtos.find(p => p.descricao.trim().toLowerCase() === nomeNormalizado)) {
      throw new Error('Já existe um produto com esse nome');
    }
    
    produtos.push(produto);
    await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));
    
    const fornecedoresRaw = await AsyncStorage.getItem(ASYNC_FORNECEDORES_KEY);
    const fornecedores: string[] = fornecedoresRaw ? JSON.parse(fornecedoresRaw) : [];
    if (!fornecedores.includes(produto.fornecedor)) {
      fornecedores.push(produto.fornecedor);
      await AsyncStorage.setItem(ASYNC_FORNECEDORES_KEY, JSON.stringify(fornecedores));
    }
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT codigo, descricao FROM products WHERE codigo = ? OR LOWER(descricao) = LOWER(?) LIMIT 1',
        [produto.codigo, produto.descricao],
        (_tx: any, result: any) => {
          if (result.rows.length > 0) {
            const row = result.rows.item(0);
            if (row.codigo === produto.codigo) {
              reject(new Error('Código já cadastrado'));
            } else {
              reject(new Error('Já existe um produto com esse nome'));
            }
            return;
          }
          tx.executeSql(
            `INSERT INTO products (codigo, descricao, quantidade, categoria, precoUnitario, fornecedor, ultimaEntrega) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              produto.codigo,
              produto.descricao,
              produto.quantidade,
              produto.categoria,
              produto.precoUnitario,
              produto.fornecedor,
              produto.ultimaEntrega || null
            ],
            () => resolve(),
            (_tx2: any, error2: any) => {
              reject(error2);
              return false;
            }
          );
        }
      );
    }, reject);
  });
}

// src/services/database.ts
// ... (código anterior)

export async function getProdutos(): Promise<Produto[]> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql('SELECT * FROM products', [], (_tx: any, result: any) => {
        const arr: Produto[] = [];
        for (let i = 0; i < result.rows.length; i++) {
          const item = result.rows.item(i);
          arr.push({
            codigo: item.codigo,
            descricao: item.descricao,
            quantidade: item.quantidade,
            categoria: item.categoria,
            precoUnitario: item.precoUnitario,
            fornecedor: item.fornecedor,
            ultimaEntrega: item.ultimaEntrega
          });
        }
        resolve(arr);
      }, (error: any) => {
        reject(error);
        return false;
      });
    }, reject);
  });
}


export async function searchProdutos(query: string): Promise<Produto[]> {
  try {
    const produtos = await getProdutos();
    const lowerQuery = query.toLowerCase();
    
    return produtos.filter(p => {
      const descricao = p.descricao ? p.descricao.toLowerCase() : '';
      const fornecedor = p.fornecedor ? p.fornecedor.toLowerCase() : '';
      const categoria = p.categoria ? p.categoria.toLowerCase() : '';
      
      return (
        p.codigo.toString().includes(lowerQuery) ||
        descricao.includes(lowerQuery) ||
        fornecedor.includes(lowerQuery) ||
        categoria.includes(lowerQuery)
      );
    });
  } catch (error) {
    console.error('Erro na pesquisa:', error);
    return [];
  }
}

export async function getFornecedores(): Promise<string[]> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_FORNECEDORES_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql('SELECT DISTINCT fornecedor FROM products', [], (_tx: any, result: any) => {
        const arr: string[] = [];
        for (let i = 0; i < result.rows.length; i++) {
          arr.push(result.rows.item(i).fornecedor);
        }
        resolve(arr);
      });
    }, reject);
  });
}

// src/services/database.ts
// ... (código anterior)

export async function updateProduto(produto: Produto): Promise<void> {
  if (!db) {
    // Modo AsyncStorage
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    let produtos: Produto[] = raw ? JSON.parse(raw) : [];
    
    // Encontrar o índice do produto
    const index = produtos.findIndex(p => p.codigo === produto.codigo);
    
    if (index === -1) {
      throw new Error('Produto não encontrado');
    }
    
    // Atualizar o produto
    produtos[index] = produto;
    await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));
    return;
  }

  // Modo SQLite
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `UPDATE products SET codigo = ?, descricao = ?, quantidade = ?, categoria = ?, precoUnitario = ?, fornecedor = ?, ultimaEntrega = ? WHERE codigo = ?`,
        [
          produto.codigo,
          produto.descricao,
          produto.quantidade,
          produto.categoria,
          produto.precoUnitario,
          produto.fornecedor,
          produto.ultimaEntrega || null,
          produto.codigo // Usando o novo código como condição WHERE
        ],
        () => resolve(),
        (_tx: any, error: any) => {
          reject(error);
          return false;
        }
      );
    }, reject);
  });
}

// ... (código posterior)

export async function updateProdutoUltimaEntrega(codigo: number, data: string): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    let produtos: Produto[] = raw ? JSON.parse(raw) : [];
    produtos = produtos.map(p => {
      if (p.codigo === codigo) {
        return { ...p, ultimaEntrega: data };
      }
      return p;
    });
    await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `UPDATE products SET ultimaEntrega = ? WHERE codigo = ?`,
        [data, codigo],
        () => resolve(),
        (_tx: any, error: any) => {
          reject(error);
          return false;
        }
      );
    }, reject);
  });
}

export async function deleteProduto(codigo: number): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    const produtos: Produto[] = raw ? JSON.parse(raw) : [];
    const updated = produtos.filter(p => p.codigo !== codigo);
    await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(updated));
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `DELETE FROM products WHERE codigo = ?`,
        [codigo],
        () => resolve(),
        (_tx: any, error: any) => {
          reject(error);
          return false;
        }
      );
    }, reject);
  });
}

/* ---------- Pedidos ---------- */
export async function adicionarPedido(pedido: Omit<Pedido, 'id'>): Promise<number> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PEDIDOS_KEY);
    const pedidos: Pedido[] = raw ? JSON.parse(raw) : [];
    const novoId = pedidos.length > 0 ? Math.max(...pedidos.map(p => p.id)) + 1 : 1;
    const novoPedido: Pedido = { ...pedido, id: novoId };
    pedidos.push(novoPedido);
    await AsyncStorage.setItem(ASYNC_PEDIDOS_KEY, JSON.stringify(pedidos));
    return novoId;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `INSERT INTO pedidos (data, horaEntrega, status, fornecedor, notaFiscalRecebida) VALUES (?, ?, ?, ?, ?)`,
        [pedido.data, pedido.horaEntrega || null, pedido.status, pedido.fornecedor, pedido.notaFiscalRecebida ? 1 : 0],
        (_tx: any, result: any) => {
          const pedidoId = result.insertId;
          let itemIndex = 0;
          const insertNextItem = () => {
            if (itemIndex >= pedido.itens.length) {
              resolve(pedidoId);
              return;
            }
            const item = pedido.itens[itemIndex];
            tx.executeSql(
              `INSERT INTO itens_pedido (pedido_id, produto_codigo, quantidade, precoUnitario) VALUES (?, ?, ?, ?)`,
              [pedidoId, item.produtoCodigo, item.quantidade, item.precoUnitario],
              () => {
                itemIndex++;
                insertNextItem();
              },
              (_txItem: any, errorItem: any) => {
                reject(errorItem);
                return false;
              }
            );
          };
          insertNextItem();
        },
        (_tx: any, error: any) => {
          reject(error);
          return false;
        }
      );
    }, reject);
  });
}

export async function listarPedidos(): Promise<Pedido[]> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PEDIDOS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `SELECT pedidos.*, 
                itens_pedido.produto_codigo as produtoCodigo, 
                itens_pedido.quantidade as quantidade,
                itens_pedido.precoUnitario as precoUnitario
         FROM pedidos
         LEFT JOIN itens_pedido ON pedidos.id = itens_pedido.pedido_id`,
        [],
        (_tx: any, result: any) => {
          const pedidosMap: Record<number, Pedido> = {};
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows.item(i);
            if (!pedidosMap[row.id]) {
              pedidosMap[row.id] = {
                id: row.id,
                data: row.data,
                horaEntrega: row.horaEntrega,
                status: row.status,
                fornecedor: row.fornecedor,
                notaFiscalRecebida: !!row.notaFiscalRecebida,
                itens: []
              };
            }
            if (row.produtoCodigo) {
              pedidosMap[row.id].itens.push({
                produtoCodigo: row.produtoCodigo,
                quantidade: row.quantidade,
                precoUnitario: row.precoUnitario
              });
            }
          }
          resolve(Object.values(pedidosMap));
        }
      );
    }, reject);
  });
}

export async function atualizarStatusPedido(id: number, status: 'aguardando' | 'entregue'): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PEDIDOS_KEY);
    let pedidos: Pedido[] = raw ? JSON.parse(raw) : [];
    
    const pedido = pedidos.find(p => p.id === id);
    
    pedidos = pedidos.map(p => {
      if (p.id === id) {
        if (status === 'entregue' && pedido) {
          p.itens.forEach(async item => {
            const produtosRaw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
            let produtos: Produto[] = produtosRaw ? JSON.parse(produtosRaw) : [];
            const produtoIndex = produtos.findIndex(prod => prod.codigo === item.produtoCodigo);
            if (produtoIndex !== -1) {
              produtos[produtoIndex].quantidade += item.quantidade;
              produtos[produtoIndex].ultimaEntrega = pedido.data;
              
              // Registrar entrada no histórico
              await registrarEntradaProduto(
                item.produtoCodigo,
                item.quantidade,
                `Entrada via pedido #${id}`,
                id
              );
            }
            await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));
          });
        }
        return { ...p, status };
      }
      return p;
    });
    
    await AsyncStorage.setItem(ASYNC_PEDIDOS_KEY, JSON.stringify(pedidos));
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM pedidos WHERE id = ?',
        [id],
        async (_tx: any, result: any) => {
          if (result.rows.length === 0) {
            reject(new Error('Pedido não encontrado'));
            return;
          }
          
          const pedido = result.rows.item(0);
          
          tx.executeSql(
            `UPDATE pedidos SET status = ? WHERE id = ?`,
            [status, id],
            async () => {
              if (status === 'entregue') {
                tx.executeSql(
                  'SELECT * FROM itens_pedido WHERE pedido_id = ?',
                  [id],
                  async (_tx2: any, result2: any) => {
                    for (let i = 0; i < result2.rows.length; i++) {
                      const item = result2.rows.item(i);
                      tx.executeSql(
                        'SELECT * FROM products WHERE codigo = ?',
                        [item.produto_codigo],
                        async (_tx3: any, result3: any) => {
                          if (result3.rows.length > 0) {
                            const produto = result3.rows.item(0);
                            const novaQuantidade = produto.quantidade + item.quantidade;
                            tx.executeSql(
                              `UPDATE products SET quantidade = ?, ultimaEntrega = ? WHERE codigo = ?`,
                              [novaQuantidade, pedido.data, item.produto_codigo],
                              async () => {
                                // Registrar entrada no histórico
                                await registrarEntradaProduto(
                                  item.produto_codigo,
                                  item.quantidade,
                                  `Entrada via pedido #${id}`,
                                  id
                                );
                              },
                              (error: any) => {
                                reject(error);
                                return false;
                              }
                            );
                          }
                        },
                        (error: any) => {
                          reject(error);
                          return false;
                        }
                      );
                    }
                    resolve();
                  },
                  (error: any) => {
                    reject(error);
                    return false;
                  }
                );
              } else {
                resolve();
              }
            },
            (_tx: any, error: any) => {
              reject(error);
              return false;
            }
          );
        },
        (error: any) => {
          reject(error);
          return false;
        }
      );
    }, reject);
  });
}

export async function atualizarNotaFiscalPedido(id: number, notaFiscalRecebida: boolean): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PEDIDOS_KEY);
    let pedidos: Pedido[] = raw ? JSON.parse(raw) : [];
    pedidos = pedidos.map(p => p.id === id ? { ...p, notaFiscalRecebida } : p);
    await AsyncStorage.setItem(ASYNC_PEDIDOS_KEY, JSON.stringify(pedidos));
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `UPDATE pedidos SET notaFiscalRecebida = ? WHERE id = ?`,
        [notaFiscalRecebida ? 1 : 0, id],
        () => resolve(),
        (_tx: any, error: any) => {
          reject(error);
          return false;
        }
      );
    }, reject);
  });
}

export async function listarPedidosPorStatus(status: 'aguardando' | 'entregue'): Promise<Pedido[]> {
  const todosPedidos = await listarPedidos();
  return todosPedidos.filter(p => p.status === status);
}

/* ---------- Histórico de Movimentos ---------- */
export async function registrarEntradaProduto(
  produtoCodigo: number, 
  quantidade: number, 
  motivo: string,
  pedidoId?: number
): Promise<void> {
  const data = new Date().toISOString().split('T')[0];
  
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_HISTORICO_KEY);
    const historico: HistoricoMovimento[] = raw ? JSON.parse(raw) : [];
    
    historico.push({
      id: historico.length + 1,
      produtoCodigo,
      data,
      tipo: 'entrada',
      quantidade,
      motivo,
      pedidoId
    });
    
    await AsyncStorage.setItem(ASYNC_HISTORICO_KEY, JSON.stringify(historico));
    return;
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `INSERT INTO historico_movimentos (produto_codigo, data, tipo, quantidade, motivo, pedido_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [produtoCodigo, data, 'entrada', quantidade, motivo, pedidoId || null],
        () => resolve(),
        (_tx: any, error: any) => {
          reject(error);
          return false;
        }
      );
    }, reject);
  });
}

// src/services/database.ts
// ... (código anterior)

export async function registrarSaidaProduto(
  produtoCodigo: number, 
  quantidade: number, 
  motivo: string
): Promise<void> {
  const data = new Date().toISOString().split('T')[0];
  
  if (!db) {
    // Modo AsyncStorage
    try {
      // Buscar produtos
      const rawProdutos = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
      let produtos: Produto[] = rawProdutos ? JSON.parse(rawProdutos) : [];
      
      // Encontrar o produto e atualizar o estoque
      const produtoIndex = produtos.findIndex(p => p.codigo === produtoCodigo);
      if (produtoIndex === -1) {
        throw new Error('Produto não encontrado');
      }

      const produto = produtos[produtoIndex];
      const novaQuantidade = produto.quantidade - quantidade;

      if (novaQuantidade < 0) {
        throw new Error('Quantidade em estoque insuficiente');
      }

      // Atualizar o produto
      produtos[produtoIndex] = {
        ...produto,
        quantidade: novaQuantidade
      };

      // Salvar produtos atualizados
      await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));

      // Registrar no histórico
      const rawHistorico = await AsyncStorage.getItem(ASYNC_HISTORICO_KEY);
      const historico: HistoricoMovimento[] = rawHistorico ? JSON.parse(rawHistorico) : [];
      
      historico.push({
        id: historico.length + 1,
        produtoCodigo,
        data,
        tipo: 'saida',
        quantidade,
        motivo
      });
      
      await AsyncStorage.setItem(ASYNC_HISTORICO_KEY, JSON.stringify(historico));
    } catch (error) {
      console.error('Erro ao registrar saída (AsyncStorage):', error);
      throw error;
    }
  } else {
    // Modo SQLite
    return new Promise((resolve, reject) => {
      db.transaction((tx: any) => {
        // Primeiro, atualizar o estoque do produto
        tx.executeSql(
          `UPDATE products SET quantidade = quantidade - ? WHERE codigo = ?`,
          [quantidade, produtoCodigo],
          (tx: any, results: any) => {
            if (results.rowsAffected === 0) {
              reject(new Error('Produto não encontrado'));
              return;
            }
            
            // Depois, inserir no histórico
            tx.executeSql(
              `INSERT INTO historico_movimentos (produto_codigo, data, tipo, quantidade, motivo) VALUES (?, ?, ?, ?, ?)`,
              [produtoCodigo, data, 'saida', quantidade, motivo],
              () => resolve(),
              (tx: any, error: any) => {
                reject(error);
                return false;
              }
            );
          },
          (tx: any, error: any) => {
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }
}

// ... (restante do código)

export async function getHistoricoProduto(codigo: number): Promise<HistoricoMovimento[]> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_HISTORICO_KEY);
    const historico: HistoricoMovimento[] = raw ? JSON.parse(raw) : [];
    return historico.filter(item => item.produtoCodigo === codigo);
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM historico_movimentos WHERE produto_codigo = ? ORDER BY data DESC, id DESC',
        [codigo],
        (_tx: any, result: any) => {
          const arr: HistoricoMovimento[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            arr.push(result.rows.item(i));
          }
          resolve(arr);
        }
      );
    }, reject);
  });
}

/* ---------- Debug ---------- */
export function debugPrintAllUsers(): void {
  if (!db) {
    getAllUsersAsyncStorage().then(u => console.log('[debug] users AsyncStorage:', u));
    return;
  }
  db.transaction((tx: any) => {
    tx.executeSql('SELECT * FROM users', [], (_t: any, result: any) => {
      const arr = [];
      for (let i = 0; i < result.rows.length; i++) arr.push(result.rows.item(i));
      console.log('[debug] users SQLite:', arr);
    });
  });
}

export async function getAllUsersAsyncStorage(): Promise<Cliente[]> {
  const raw = await AsyncStorage.getItem(ASYNC_USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function debugPrintAllPedidos(): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PEDIDOS_KEY);
    const pedidos = raw ? JSON.parse(raw) : [];
    console.log('[debug] pedidos AsyncStorage:', pedidos);
    return;
  }
  
  const pedidos = await listarPedidos();
  console.log('[debug] pedidos SQLite:', pedidos);
}