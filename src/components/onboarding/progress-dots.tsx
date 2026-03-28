import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

interface ProgressDotsProps {
  current: number;
  total: number;
}

export function ProgressDots({ current, total }: ProgressDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i < current ? styles.dotFilled : styles.dotOutlined]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotFilled: {
    backgroundColor: Colors.purple,
  },
  dotOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.purple,
  },
});
