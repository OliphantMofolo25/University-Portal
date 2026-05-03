// src/components/RoundContainer.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';

export const RoundContainer = ({ children, style, glow = false }) => {
  return (
    <View style={[
      styles.container, 
      glow && styles.glowContainer,
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  glowContainer: {
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.glowBlue,
    elevation: 4,
  },
});