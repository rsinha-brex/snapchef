import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { BookOpen, Layers, Grid2x2, Bookmark } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { useCounterStore } from '@/stores/counter';

export default function TabsLayout() {
  const counterCount = useCounterStore((s) => s.items.length);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tc600,
        tabBarInactiveTintColor: colors.inkMute,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.hairline,
          paddingTop: 8,
          paddingBottom: 12,
          height: 72,
        },
        headerStyle: { backgroundColor: colors.cream },
        headerTitleStyle: { fontFamily: 'Fraunces', fontSize: 20, fontWeight: '400', color: colors.ink },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          headerShown: false,
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="counter"
        options={{
          title: 'Counter',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View>
              <Layers size={22} color={color} />
              {counterCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: colors.tc600, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.cream, fontSize: 10, fontWeight: '700' }}>{counterCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          headerShown: false,
          tabBarIcon: ({ color }) => <Grid2x2 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          headerShown: false,
          tabBarIcon: ({ color }) => <Bookmark size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
