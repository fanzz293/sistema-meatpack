// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// --- DEFINIÇÃO DE TIPOS E CONTRATOS DE DADOS ---
// ============================================================================

/**
 * Modelagem do objeto de usuário autenticado no ecossistema do aplicativo.
 */
type User = {
  nome: string;  // Nome completo ou apelido do operador comercial logado
  email: string; // E-mail de acesso e identificador exclusivo do perfil
};

/**
 * Contrato de propriedades e métodos expostos globalmente pelo Contexto de Autenticação.
 */
type AuthContextType = {
  isAuthenticated: boolean;             // Flag indicativa se há uma sessão de login ativa
  user: User | null;                    // Dados do operador ativo ou null caso esteja deslogado
  login: (userData: User) => void;      // Função para inicializar a sessão e persistir credenciais
  logout: () => void;                   // Função para encerrar a sessão e limpar as chaves de memória
  isLoading: boolean;                   // Flag de controle para travar a renderização de telas durante a leitura do storage
};

// ============================================================================
// --- CRIAÇÃO DO CONTEXTO DE SESSÃO ---
// ============================================================================

// Instancia o canal de comunicação global (Contexto) com valores padrão para o TypeScript.
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true, // Inicia em True para assegurar o ciclo de checagem do token na inicialização
});

// ============================================================================
// --- PROVEDOR DE ESTADO DE AUTENTICAÇÃO (PROVIDER) ---
// ============================================================================

/**
 * Componente Provedor (Wrapper) que deve envelopar a raiz do projeto (App.tsx).
 * Ele distribui centralizadamente os estados de sessão para qualquer árvore de componentes filha.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Estados reativos locais que espelham o estado global de segurança do app
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. CICLO DE HIDRATAÇÃO DO ESTADO DE SESSÃO
  // Executado uma única vez assim que a aplicação é aberta para buscar dados persistidos em disco.
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // Tenta coletar os registros de token e metadados salvos no dispositivo
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        
        // Coerção lógica rápida: Se houver token, define isAuthenticated como true (!!string -> true)
        setIsAuthenticated(!!token);
        
        // Se houver dados textuais do usuário, faz o parse de JSON de volta para Objeto estruturado
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Erro ao verificar status de login durante a inicialização:', error);
        setIsAuthenticated(false);
      } finally {
        // Conclui a checagem e libera o fluxo visual das telas (desativa loaders/splash screens)
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // 2. MÉTODO: PERSISTÊNCIA E DISPARO DE LOGIN
  const login = async (userData: User) => {
    try {
      // Salva de forma assíncrona os dados em disco para evitar novos logins nas próximas aberturas
      await AsyncStorage.setItem('userToken', 'authenticated');
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Atualiza os estados reativos para forçar o React a reconstruir as rotas protegidas
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erro ao gravar dados de login no AsyncStorage:', error);
    }
  };

  // 3. MÉTODO: LIMPEZA E ENCERRAMENTO DE SESSÃO
  const logout = async () => {
    try {
      // Limpa as chaves físicas de armazenamento do dispositivo
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      // Reseta os estados reativos locais enviando o usuário de volta para o fluxo de autenticação
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Erro ao remover chaves de login do AsyncStorage:', error);
    }
  };

  // 4. DISTRIBUIÇÃO DO CONTEXTO VISUAL
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// --- HOOK CUSTOMIZADO PARA CONSUMO DE SESSÃO ---
// ============================================================================

/**
 * Abstração de consumo para evitar chamadas repetitivas ao 'useContext(AuthContext)'.
 * Pode ser chamado em qualquer tela usando: const { isAuthenticated, login, user } = useAuth();
 */
export const useAuth = () => useContext(AuthContext);