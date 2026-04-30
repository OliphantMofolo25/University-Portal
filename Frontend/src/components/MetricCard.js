import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../styles/colors';
import { RoundContainer } from './RoundContainer';

export const MetricCard = ({ title, value, icon, onPress, color = COLORS.navy }) => {
  const CardWrapper = onPress ? TouchableOpacity : View;
  
  return (
    <CardWrapper onPress={onPress} activeOpacity={0.8}>
      <RoundContainer glow style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          {icon}
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </RoundContainer>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    minWidth: 110,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});