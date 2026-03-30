import { Tabs } from 'expo-router';
import { Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { Colors, Fonts, FontSizes } from '../../constants/theme';

function TabIcon({ source, focused }: { source: ImageSourcePropType; focused: boolean }) {
  return (
    <Image
      source={source}
      style={[styles.icon, focused ? styles.iconFocused : styles.iconInactive]}
    />
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
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../../../assets/images/icons/heart.png')} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: 'Food',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../../../assets/images/icons/plate.png')} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Food" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="move"
        options={{
          title: 'Move',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../../../assets/images/icons/dumbbell.png')} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Move" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="skin"
        options={{
          title: 'Skin',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../../../assets/images/icons/bottle.png')} focused={focused} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Skin" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../../../assets/images/icons/microscope.png')} focused={focused} />
          ),
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
  icon: {
    width: 24,
    height: 24,
  },
  iconFocused: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  iconInactive: {
    opacity: 0.5,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    textAlign: 'center',
  },
  labelFocused: {
    color: Colors.tabBarActive,
  },
  labelInactive: {
    color: Colors.tabBarInactive,
  },
});
