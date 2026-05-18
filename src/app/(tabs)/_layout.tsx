import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useAppTheme } from '../../context/ThemeContext'; // 🌟 Import your theme hook

export default function TabsLayout() {
  const { colors } = useAppTheme(); // 🌟 Grab active dynamic colors

  return (
    <Tabs
      screenOptions={{
        // Removes the default native headers since we built our custom GlobalHeader component
        headerShown: false,
        
        // Tab bar styling fully matched to the active theme tokens
        tabBarStyle: {
          backgroundColor: colors.background, // 🌟 Dynamic background color
          borderTopWidth: 1,
          borderTopColor: colors.border,       // 🌟 Dynamic top divider line
          height: 75,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#3b82f6',   // Active blue state
        tabBarInactiveTintColor: colors.textMuted, // 🌟 Muted text/icon state shifts based on theme
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="add-game"
        options={{
          title: 'Add Game',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={22} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="filters"
        options={{
          title: 'Filters',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "options" : "options-outline"} size={22} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}