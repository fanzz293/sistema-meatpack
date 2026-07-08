// src/components/ScreenWrapper.tsx
import React from 'react';
import { ImageBackground, StyleSheet, Platform, View, ViewStyle } from 'react-native';

// ============================================================================
// --- INTERFACE DE PROPRIEDADES (PROPS) ---
// ============================================================================
interface ScreenWrapperProps {
  children: React.ReactNode; // Elementos filhos (inputs, cards, listas) que ficarão sobrepostos ao fundo
  style?: ViewStyle;         // Estilos customizados adicionais para o container interno (View)
  blurRadius?: number;       // Intensidade do efeito de desfoque (blur) aplicado à imagem de fundo
}

/**
 * Componente Wrapper de Layout Mestre.
 * Garante uma identidade visual unificada em todas as telas da aplicação, aplicando
 * um plano de fundo estilizado de forma responsiva de acordo com a plataforma (Web ou Mobile).
 */
export default function ScreenWrapper({ children, style, blurRadius = 1 }: ScreenWrapperProps) {
  
  // 1. SELEÇÃO DINÂMICA DE RENDERIZADOR POR PLATAFORMA
  // O método Platform.select avalia o ambiente em tempo de execução para injetar o asset correto.
  // Isso otimiza o carregamento, evitando o download de imagens pesadas ou desproporcionais.
  const backgroundSource = Platform.select({
    web: require('../../assets/meat-web-background.png'),    // Imagem horizontalizada e otimizada para monitores/computadores
    default: require('../../assets/wood-background.jpg'),   // Imagem vertical em textura de madeira rústica padrão para smartphones (Android/iOS)
  });

  // 2. COMPOSIÇÃO ESTRUTURAL DE TELAS
  // Renderiza primeiro o ImageBackground (plano de fundo) e, em seguida, uma View segura 
  // para encapsular e posicionar os elementos da interface sem interferir na proporção do fundo.
  return (
    <ImageBackground
      source={backgroundSource}
      style={styles.background}
      // Aplica uma trava física de desfoque (2) no ambiente Web para melhorar a legibilidade 
      // em telas grandes, ou aceita a prop customizada em smartphones.
      blurRadius={Platform.OS === 'web' ? 2 : blurRadius}
    >
      {/* Combina o estilo padrão de expansão total (flex: 1) com estilos inline opcionais passados pelo pai */}
      <View style={[styles.container, style]}>
        {children}
      </View>
    </ImageBackground>
  );
}

// ============================================================================
// --- FOLHA DE ESTILOS (STYLESHEET) ---
// ============================================================================
const styles = StyleSheet.create({
  background: {
    flex: 1,               // Expande o plano de fundo para ocupar 100% da viewport da tela visível
    resizeMode: 'cover',   // Redimensiona o asset de forma proporcional preenchendo as bordas sem distorcer o aspecto da imagem
  },
  container: {
    flex: 1,               // Garante que a View de conteúdo também ocupe toda a área útil interna da imagem de fundo
  },
});