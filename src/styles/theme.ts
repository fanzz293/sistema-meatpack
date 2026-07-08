// src/styles/theme.ts

/**
 * Token Central do Design System - Meatpack App.
 * Centraliza as diretrizes visuais e tokens de estilo para assegurar a consistência da interface.
 * O uso deste tema evita "valores mágicos" (hardcoded) espalhados nos componentes e folhas de estilo.
 */
export const theme = {
  
  // ============================================================================
  // --- PALETA DE CORES (PALETTE TOKENS) ---
  // ============================================================================
  colors: {
    // Cores de Identidade e Branding (Temática rústica/frigorífica)
    primary: '#8B0000',       // Vermelho escuro (sangue) - Cor predominante em headers, CTAs e botões mestres
    primaryLight: '#A52A2A',  // Vermelho terroso - Utilizado em bordas, focos e variações secundárias
    secondary: '#D2691E',     // Marrom chocolate - Tom complementar para realces pontuais
    accent: '#FFD700',        // Dourado - Destinado a destaques de alta prioridade ou selos especiais

    // Cores de Superfície e Layout
    background: '#F5F5DC',    // Bege claro - Tom de fundo padrão para mitigar o cansaço visual
    surface: '#FFFFFF',       // Branco puro - Cor de fundo para cards, modais e inputs de texto

    // Tipografia Corporativa
    text: '#2E2E2E',          // Cinza escuro - Alto contraste para corpos de texto, títulos e rótulos
    textLight: '#757575',     // Cinza médio - Destinado a placeholders, dicas e legendas

    // Cores Semânticas de Status Operacional
    error: '#B22222',         // Vermelho firebrick - Sinalização de falhas, erros ou exclusões
    success: '#228B22',       // Verde floresta - Sinalização de ciclos concluídos, validações e entradas
    warning: '#FF8C00',       // Laranja escuro - Alertas de atenção, pendências ou auditorias fiscais
  },

  // ============================================================================
  // --- ESCALA DE ESPAÇAMENTOS (SPACING SYSTEM) ---
  // ============================================================================
  // Sistema baseado em múltiplos e submúltiplos de 8px, garantindo proporcionalidade
  // de grids e layouts responsivos em diferentes tamanhos de tela.
  spacing: {
    xs: 4,   // Micro-ajustes (margens internas de badges, pequenos gaps)
    s: 8,    // Espaçamentos compactos (gaps entre inputs e rótulos)
    m: 16,   // Espaçamento padrão/universal (paddings de telas e cartões)
    l: 24,   // Espaçamento expandido (margens entre seções ou blocos lógicos)
    xl: 32,  // Grandes agrupamentos (espaçamentos de cabeçalhos de autenticação)
    xxl: 40, // Margens de rodapé de formulários extensos
  },

  // ============================================================================
  // --- RAIOS DE ARREDONDAMENTO (BORDER RADIUS) ---
  // ============================================================================
  borderRadius: {
    s: 4,    // Suave curvatura (Badges de status, pequenos seletores)
    m: 8,    // Padrão do sistema (Botões, inputs de texto, pequenas linhas de listas)
    l: 12,   // Arredondamento médio (Modais compactos e cards operacionais)
    xl: 16,  // Curvatura acentuada (Containers de formulários principais e grandes painéis)
  },

  // ============================================================================
  // --- DIRETRIZES TIPOGRÁFICAS (TYPOGRAPHY TOKENS) ---
  // ============================================================================
  // NOTA DO COMPILADOR: O uso do 'as const' assegura ao TypeScript que o valor da string
  // da propriedade 'fontWeight' deve ser tratado como um tipo literal estrito (ex: 'bold'),
  // e não como uma string genérica, evitando erros de compilação no motor de estilos do React Native.
  typography: {
    title: {
      fontSize: 28,
      fontWeight: 'bold' as const,
    },
    subtitle: {
      fontSize: 22,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal' as const,
    },
    caption: {
      fontSize: 14,
      fontWeight: '300' as const,
    },
  },

  // ============================================================================
  // --- CAMADA DE PROFUNDIDADE (SHADOWS & ELEVATION) ---
  // ============================================================================
  // Estrutura híbrida de relevo. Mapeia propriedades complexas de sombreamento para o iOS
  // (shadowColor, shadowOpacity, etc.) e utiliza a propriedade 'elevation' exigida nativamente pelo Android.
  shadows: {
    s: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1, // Elevação leve para cartões de listas comuns
    },
    m: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4, // Elevação média para botões flutuantes ou cabeçalhos destacados
    },
    l: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8, // Profundidade máxima destinada a janelas modais suspensas
    },
  },
};