// src/styles/theme.ts
export const theme = {
  colors: {
    primary: '#8B0000', // Vermelho escuro (sangue)
    primaryLight: '#A52A2A', // Vermelho terroso
    secondary: '#D2691E', // Marrom chocolate
    accent: '#FFD700', // Dourado
    background: '#F5F5DC', // Bege claro
    surface: '#FFFFFF', // Branco
    text: '#2E2E2E', // Cinza escuro
    textLight: '#757575', // Cinza
    error: '#B22222', // Vermelho firebrick
    success: '#228B22', // Verde floresta
    warning: '#FF8C00', // Laranja escuro
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    s: 4,
    m: 8,
    l: 12,
    xl: 16,
  },
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
  shadows: {
    s: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    m: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    l: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};