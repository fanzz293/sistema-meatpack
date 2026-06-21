// src/components/AnimatedView.tsx
import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

interface AnimatedViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  from?: 'top' | 'bottom' | 'left' | 'right' | 'fade' | 'scale';
}

export default function AnimatedView({ 
  children, 
  style, 
  delay = 0, 
  duration = 800, 
  from = 'fade' 
}: AnimatedViewProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.timing(animValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [animValue, delay, duration]);

  const getAnimationStyle = () => {
    switch (from) {
      case 'top':
        return {
          opacity: animValue,
          transform: [{
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0],
            }),
          }],
        };
      case 'bottom':
        return {
          opacity: animValue,
          transform: [{
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        };
      case 'left':
        return {
          opacity: animValue,
          transform: [{
            translateX: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0],
            }),
          }],
        };
      case 'right':
        return {
          opacity: animValue,
          transform: [{
            translateX: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        };
      case 'scale':
        return {
          opacity: animValue,
          transform: [{
            scale: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            }),
          }],
        };
      case 'fade':
      default:
        return {
          opacity: animValue,
        };
    }
  };

  return (
    <Animated.View style={[style, getAnimationStyle()]}>
      {children}
    </Animated.View>
  );
}