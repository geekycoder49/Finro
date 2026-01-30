import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { LayoutDashboard, Wallet, Plus, BarChart2, Settings } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from './src/db/database';
import { useSettingsStore } from './src/store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from './src/theme/colors';

// Screens
import DashboardScreen from './src/screens/DashboardScreen';
import MoneyScreen from './src/screens/MoneyScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import AddAccountScreen from './src/screens/AddAccountScreen';
import EditTransactionScreen from './src/screens/EditTransactionScreen';
import EditAccountScreen from './src/screens/EditAccountScreen';
import SearchScreen from './src/screens/SearchScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AllTransactionsScreen from './src/screens/AllTransactionsScreen';
import ManageAccountsScreen from './src/screens/ManageAccountsScreen';

export default function App() {
  const { theme, accentColor, loadSettings, hasOnboarded } = useSettingsStore();
  const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [modalScreen, setModalScreen] = useState<string | null>(null);
  const [screenParams, setScreenParams] = useState<any>(null);

  useEffect(() => {
    initDatabase();
    loadSettings();
  }, []);

  useEffect(() => {
    if (!hasOnboarded) {
      setActiveScreen('Onboarding');
    } else if (activeScreen === 'Onboarding') {
      setActiveScreen('Dashboard');
    }
  }, [hasOnboarded]);

  const screens: any = {
    Dashboard: DashboardScreen,
    Money: MoneyScreen,
    Add: AddTransactionScreen,
    Reports: ReportsScreen,
    Settings: SettingsScreen,
    AddAccount: AddAccountScreen,
    EditTransaction: EditTransactionScreen,
    EditAccount: EditAccountScreen,
    Search: SearchScreen,
    Onboarding: OnboardingScreen,
    AllTransactions: AllTransactionsScreen,
    ManageAccounts: ManageAccountsScreen
  };

  const ActiveComponent = screens[modalScreen || activeScreen];

  const tabs = [
    { name: 'Dashboard', icon: LayoutDashboard, label: 'Home' },
    { name: 'Money', icon: Wallet, label: 'Money' },
    { name: 'Add', icon: Plus, label: 'Add' },
    { name: 'Reports', icon: BarChart2, label: 'Reports' },
    { name: 'Settings', icon: Settings, label: 'Settings' },
  ];

  // Pass navigation functions as props
  const navigation = {
    navigate: (screen: string, params?: any) => {
      setScreenParams(params || null);
      if (['Add', 'AddAccount', 'EditTransaction', 'EditAccount', 'Search', 'AllTransactions', 'ManageAccounts'].includes(screen)) {
        setModalScreen(screen);
      } else {
        setActiveScreen(screen);
        setModalScreen(null);
      }
    },
    goBack: () => {
      setModalScreen(null);
      setScreenParams(null);
    }
  };

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [modalScreen, activeScreen]);

  return (
    <SafeAreaProvider>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        <Animated.View
          key={modalScreen || activeScreen}
          style={{ flex: 1, opacity: fadeAnim }}
        >
          <ActiveComponent navigation={navigation} route={{ params: screenParams }} />
        </Animated.View>

        {!modalScreen && activeScreen !== 'Onboarding' ? (
          <View style={[styles.bottomNav, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
            {tabs.map((tab) => {
              const isActive = activeScreen === tab.name;
              const Icon = tab.icon;

              return (
                <TouchableOpacity
                  key={tab.name}
                  style={styles.tabButton}
                  onPress={() => {
                    if (tab.name === 'Add') {
                      navigation.navigate('Add');
                    } else {
                      setActiveScreen(tab.name);
                    }
                  }}
                >
                  <Icon
                    size={24}
                    color={isActive ? accentColor : themeColors.textSecondary}
                  />
                  <Text style={[
                    styles.tabLabel,
                    { color: isActive ? accentColor : themeColors.textSecondary, fontFamily: useSettingsStore.getState().fontFamily === 'System' ? undefined : useSettingsStore.getState().fontFamily }
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
  },
});
