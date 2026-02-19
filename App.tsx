import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Easing, useColorScheme, AppState } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators, TransitionSpecs } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LayoutDashboard, Wallet, Plus, BarChart2, Settings } from 'lucide-react-native';
import { ToastProvider } from './src/components/ToastProvider';
import CustomSplashScreen from './src/components/CustomSplashScreen';

import { initDatabase } from './src/db/database';
import { initArchiveDatabase } from './src/services/navHistoryService';
import { useSettingsStore } from './src/store/useSettingsStore';
import { checkScheduledSync } from './src/services/navSync';
import { DARK_THEME, LIGHT_THEME } from './src/theme/colors';
import { useTheme } from './src/hooks/useTheme';
import { enableScreens } from 'react-native-screens';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

enableScreens(false);

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
import MutualFundsScreen from './src/screens/MutualFundsScreen';
import FundDetailScreen from './src/screens/FundDetailScreen';
import MutualFundReportScreen from './src/screens/MutualFundReportScreen';
import SIPCalculatorScreen from './src/screens/SIPCalculatorScreen';
import GoalCalculatorScreen from './src/screens/GoalCalculatorScreen';
import CompareFundsScreen from './src/screens/CompareFundsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Animation Interpolators
const getTransitionConfig = (animationType: string) => {
  // Fast & Snappy Transition Spec
  const FastSpec = {
    animation: 'timing',
    config: {
      duration: 300,
      easing: Easing.out(Easing.poly(4)),
    },
  } as const;

  // Default Config
  let config = {
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    transitionSpec: {
      open: FastSpec,
      close: FastSpec,
    },
  };

  switch (animationType) {
    case 'Slide Up':
      config.cardStyleInterpolator = CardStyleInterpolators.forVerticalIOS;
      break;
    case 'Slide Down':
      config.cardStyleInterpolator = CardStyleInterpolators.forVerticalIOS;
      break;
    case 'Fade':
      config.cardStyleInterpolator = CardStyleInterpolators.forFadeFromCenter;
      break;
    case 'Zoom In':
    case 'Zoom Out':
      config.cardStyleInterpolator = ({ current: { progress } }) => ({
        cardStyle: {
          opacity: progress,
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }
          ]
        }
      });
      break;
    default:
      config.cardStyleInterpolator = CardStyleInterpolators.forHorizontalIOS;
  }
  return config;
};

import { BackHandler } from 'react-native';
function TabNavigator({ navigation }: any) {
  const { themeColors, accentColor } = useTheme();

  // Handle Hardware Back Button Logic (Optional - backBehavior handles most of it)
  // We can add custom logic here if needed, but 'initialRoute' backBehavior is sufficient.

  return (
    <Tab.Navigator
      backBehavior="initialRoute" // Go to Dashboard on back press
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: themeColors.surface,
          borderTopColor: themeColors.border,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: accentColor,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 4,
          fontWeight: '600'
        }
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Money"
        component={MoneyScreen}
        options={{
          tabBarLabel: 'Money',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="AddPlaceholder"
        component={View}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AddTransaction');
          },
        })}
        options={{
          tabBarLabel: 'Add',
          tabBarIcon: ({ color, size }) => <Plus color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { loadSettings, hasOnboarded, animationType } = useSettingsStore();
  const { isDarkMode, themeColors } = useTheme();
  const [showCustomSplash, setShowCustomSplash] = React.useState(true);

  // Load settings on mount
  useEffect(() => {
    const init = async () => {
      try {
        await loadSettings();
        initDatabase();
        await initArchiveDatabase();
      } catch (e) {
        console.warn(e);
      } finally {
        // Hide splash screen after initialization
        setTimeout(() => {
          setShowCustomSplash(false);
          SplashScreen.hideAsync();
        }, 2000);
      }
    };
    init();
  }, []);

  // Check for scheduled sync on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('[App] App became active, checking scheduled sync...');
        checkScheduledSync();
      }
    });

    // Also check on mount (after settings are loaded)
    checkScheduledSync();

    return () => {
      subscription.remove();
    };
  }, []);

  const MyTheme = isDarkMode ? DarkTheme : DefaultTheme;
  const transitionConfig = getTransitionConfig(animationType);

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {showCustomSplash ? (
          <CustomSplashScreen />
        ) : (
          <NavigationContainer theme={MyTheme}>
            <View style={{ flex: 1, backgroundColor: themeColors.background }}>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  ...transitionConfig
                }}
                detachInactiveScreens={false}
                initialRouteName={!hasOnboarded ? "Onboarding" : "Main"}
              >
                {!hasOnboarded ? (
                  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : (
                  <>
                    <Stack.Screen name="Main" component={TabNavigator} />

                    {/* Full Screen Pages */}
                    <Stack.Screen
                      name="AddTransaction"
                      component={AddTransactionScreen}
                    />
                    <Stack.Screen
                      name="AddAccount"
                      component={AddAccountScreen}
                      options={{ presentation: 'modal' }}
                    />
                    <Stack.Screen
                      name="EditTransaction"
                      component={EditTransactionScreen}
                    />
                    <Stack.Screen
                      name="EditAccount"
                      component={EditAccountScreen}
                    />
                    <Stack.Screen
                      name="Search"
                      component={SearchScreen}
                      options={{ presentation: 'modal' }}
                    />
                    <Stack.Screen
                      name="AllTransactions"
                      component={AllTransactionsScreen}
                    />
                    <Stack.Screen
                      name="ManageAccounts"
                      component={ManageAccountsScreen}
                    />
                    <Stack.Screen
                      name="MutualFunds"
                      component={MutualFundsScreen}
                    />
                    <Stack.Screen
                      name="FundDetail"
                      component={FundDetailScreen}
                    />
                    <Stack.Screen
                      name="MutualFundReport"
                      component={MutualFundReportScreen}
                    />
                    <Stack.Screen
                      name="SIPCalculator"
                      component={SIPCalculatorScreen}
                    />
                    <Stack.Screen
                      name="GoalCalculator"
                      component={GoalCalculatorScreen}
                    />
                    <Stack.Screen
                      name="CompareFunds"
                      component={CompareFundsScreen}
                    />
                    {/* Fallback for "Add" route name used in some places if any */}
                    <Stack.Screen
                      name="Add"
                      component={AddTransactionScreen}
                    />
                  </>
                )}
              </Stack.Navigator>
            </View>
          </NavigationContainer>
        )}
      </ToastProvider>
    </SafeAreaProvider>
  );
}
