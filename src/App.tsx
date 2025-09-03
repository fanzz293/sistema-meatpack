// src/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthNavigator from './navigation/AuthNavigator';
import AppNavigator from './navigation/AppNavigator';
import { View, Text, ActivityIndicator, StatusBar, SafeAreaView } from 'react-native';

function MainNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#d00707ff' }}>
        <StatusBar barStyle="light-content" backgroundColor="#cc0000" />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ marginTop: 10, color: '#ffffff' }}>Verificando autenticação...</Text>
      </SafeAreaView>
    );
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <MainNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}