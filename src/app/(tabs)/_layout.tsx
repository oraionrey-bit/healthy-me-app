import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes } from '../../constants/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={[styles.emoji, focused && styles.emojiFocused]}>
      {emoji}
    </Text>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={[
        styles.label,
        focused ? styles.labelFocused : styles.labelInactive,
      ]}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="❤️" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: 'Food',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍽️" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Food" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="move"
        options={{
          title: 'Move',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏋️" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Move" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="skin"
        options={{
          title: 'Skin',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧴" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Skin" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔬" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Health" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBarBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
    height: 80,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabBarItem: {
    gap: 4,
  },
  emoji: {
    fontSize: 22,
    opacity: 0.6,
  },
  emojiFocused: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.xs,
    textAlign: 'center',
  },
  labelFocused: {
    color: Colors.tabBarActive,
  },
  labelInactive: {
    color: Colors.tabBarInactive,
  },
});
