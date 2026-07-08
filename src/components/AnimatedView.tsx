// src/components/AnimatedView.tsx
import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

// ============================================================================
// --- INTERFACE DE PROPRIEDADES (PROPS) ---
// ============================================================================
interface AnimatedViewProps {
  children: ReactNode;                  // Elementos filhos que serão renderizados dentro da view animada
  style?: StyleProp<ViewStyle>;          // Estilos CSS/StyleSheet adicionais passados pelo componente pai
  delay?: number;                       // Tempo de espera (em milissegundos) antes da animação iniciar
  duration?: number;                    // Duração total (em milissegundos) da transição da animação
  from?: 'top' | 'bottom' | 'left' | 'right' | 'fade' | 'scale'; // Direção ou comportamento de entrada
}

/**
 * Componente Wrapper responsável por aplicar animações fluidas de entrada (micro-interações)
 * nos elementos da interface, melhorando a experiência do usuário (UX).
 */
export default function AnimatedView({ 
  children, 
  style, 
  delay = 0, 
  duration = 800, 
  from = 'fade' 
}: AnimatedViewProps) {
  
  // 1. VALOR REFERENCIAL DA ANIMAÇÃO
  // Inicializa o valor da animação em 0 e o mantém persistente entre as renderizações do componente.
  // Usar o `.current` garante que a instância do Animated.Value nunca seja recriada involuntariamente.
  const animValue = useRef(new Animated.Value(0)).current;

  // 2. CICLO DE VIDA E DISPARO DA ANIMAÇÃO
  useEffect(() => {
    // Configura um temporizador para respeitar o atraso (delay) solicitado antes do início
    const timeout = setTimeout(() => {
      Animated.timing(animValue, {
        toValue: 1,           // Alvo final da animação (conclusão do estado 0 para 1)
        duration,            // Tempo de execução configurado por prop
        useNativeDriver: true, // Crucial: Executa a animação diretamente no ecossistema nativo (UI Thread),
                              // liberando a thread do JavaScript para manter o app estável a 60 FPS.
      }).start();
    }, delay);

    // Função de limpeza (cleanup): Cancela o timeout caso o componente seja desmontado
    // antes da animação iniciar, evitando vazamento de memória (memory leaks).
    return () => clearTimeout(timeout);
  }, [animValue, delay, duration]);

  // 3. MAPEAMENTO DINÂMICO DE ATRIBUTOS VISUAIS (INTERPOLAÇÃO)
  // Traduz o valor linear de 0 a 1 em deslocamentos em pixels (X/Y), opacidade ou escala.
  const getAnimationStyle = () => {
    switch (from) {
      case 'top':
        return {
          opacity: animValue, // Transição suave de opacidade (0 Invisível -> 1 Totalmente Visível)
          transform: [{
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0], // Move o elemento 50px de cima para baixo até sua posição original
            }),
          }],
        };
      case 'bottom':
        return {
          opacity: animValue,
          transform: [{
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],  // Move o elemento 50px de baixo para cima até sua posição original
            }),
          }],
        };
      case 'left':
        return {
          opacity: animValue,
          transform: [{
            translateX: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0], // Move o elemento 50px da esquerda para a direita
            }),
          }],
        };
      case 'right':
        return {
          opacity: animValue,
          transform: [{
            translateX: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],  // Move o elemento 50px da direita para a esquerda
            }),
          }],
        };
      case 'scale':
        return {
          opacity: animValue,
          transform: [{
            scale: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1], // Inicia o elemento com 80% do tamanho e expande até 100% (Pop effect)
            }),
          }],
        };
      case 'fade':
      default:
        // Caso padrão: Apenas esmaecimento de opacidade (Fade In) simples
        return {
          opacity: animValue,
        };
    }
  };

  // 4. COMPONENTE DE RENDERIZAÇÃO ANIMADA
  // Injeta o array de estilos combinando o estilo customizado do componente pai com a interpolação calculada
  return (
    <Animated.View style={[style, getAnimationStyle()]}>
      {children}
    </Animated.View>
  );
}