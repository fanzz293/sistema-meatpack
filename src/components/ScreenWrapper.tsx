// src/components/ScreenWrapper.tsx
import React from 'react';
import { ImageBackground, StyleSheet, Platform, View, ViewStyle } from 'react-native';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  blurRadius?: number;
}

export default function ScreenWrapper({ children, style, blurRadius = 1 }: ScreenWrapperProps) {
  // Chaveia as imagens de fundo dependendo da plataforma
  const backgroundSource = Platform.select({
    web: require('../../assets/meat-web-background.png'), // Fundo para computadores
    default: require('../../assets/wood-background.jpg'), // Fundo padrão para celulares
  });

  return (
    <ImageBackground
      source={backgroundSource}
      style={styles.background}
      blurRadius={Platform.OS === 'web' ? 2 : blurRadius}
    >
      <View style={[styles.container, style]}>
        {children}
      </View>
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
});