import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingIndicatorProps {
  message?: string;
}

export function LoadingIndicator({ message = 'Loading...' }: LoadingIndicatorProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00d4ff" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    gap: 16,
  },
  message: {
    fontSize: 16,
    color: '#a0a0a0',
  },
});
