import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import MarketScanScreen from "./src/screens/MarketScanScreen";
import SearchScreen from "./src/screens/SearchScreen";
import TickerDetailScreen from "./src/screens/TickerDetailScreen";
import NewsScreen from "./src/screens/NewsScreen";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen";

import { LearningModeProvider, useLearningMode } from "./src/context/LearningModeContext";
import { WatchlistProvider } from "./src/context/WatchlistContext"; // ✅ AJOUTÉ
console.log("IMPORTS", {
  MarketScanScreen, SearchScreen, TickerDetailScreen,
  NewsScreen, PrivacyPolicyScreen,
  createMaterialTopTabNavigator, createNativeStackNavigator,
  SafeAreaProvider, LearningModeProvider, WatchlistProvider,
});
const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#020617",
    card: "#020617",
    text: "#ffffff",
    border: "#111827",
    primary: "#22c55e",
  },
};

const RootStack = createNativeStackNavigator();
const Stack = createNativeStackNavigator();
const TopTab = createMaterialTopTabNavigator();

const commonStackOptions = { headerShown: false };

function ScannerStack() {
  return (
    <Stack.Navigator screenOptions={commonStackOptions}>
      <Stack.Screen name="MarketScan" component={MarketScanScreen} />
      <Stack.Screen name="TickerDetail" component={TickerDetailScreen} />
      <Stack.Screen name="News" component={NewsScreen} />
    </Stack.Navigator>
  );
}

function NewsStack() {
  return (
    <Stack.Navigator screenOptions={commonStackOptions}>
      <Stack.Screen name="News" component={NewsScreen} />
      <Stack.Screen name="TickerDetail" component={TickerDetailScreen} />
    </Stack.Navigator>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={commonStackOptions}>
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="TickerDetail" component={TickerDetailScreen} />
      <Stack.Screen name="News" component={NewsScreen} />
    </Stack.Navigator>
  );
}

function FuturisticTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { enabled, toggle } = useLearningMode();

  return (
    <SafeAreaView style={stylesTopBar.safe}>
      <View style={[stylesTopBar.headerRow, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={stylesTopBar.brandRow}>
          <Image source={require("./assets/icon.png")} style={stylesTopBar.logo} />
          <View>
            <Text style={stylesTopBar.brand}>Quantum Algo</Text>
            <Text style={stylesTopBar.tagline}>Scanner • Signaux • Actus</Text>
          </View>
        </View>

        <Pressable
          onPress={toggle}
          hitSlop={10}
          style={[stylesTopBar.learnBtn, enabled && stylesTopBar.learnBtnActive]}
        >
          <Text style={[stylesTopBar.learnIcon, enabled && stylesTopBar.learnIconActive]}>🎓</Text>
        </Pressable>
      </View>

      <View style={stylesTopBar.tabsPill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[stylesTopBar.tabBtn, isFocused && stylesTopBar.tabBtnActive]}
            >
              <Text style={[stylesTopBar.tabText, isFocused && stylesTopBar.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function Tabs() {
  return (
    <TopTab.Navigator
      tabBar={(props) => <FuturisticTabBar {...props} />}
      screenOptions={{ swipeEnabled: false }}
    >
      <TopTab.Screen name="Accueil" component={ScannerStack} />
      <TopTab.Screen name="Actualite" component={NewsStack} />
      <TopTab.Screen name="Recherche" component={SearchStack} />
    </TopTab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LearningModeProvider>
        {/* ✅ WATCHLIST PROVIDER AJOUTÉ */}
        <WatchlistProvider>
          <NavigationContainer theme={MyTheme}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="Tabs" component={Tabs} />
              <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            </RootStack.Navigator>
          </NavigationContainer>
        </WatchlistProvider>
      </LearningModeProvider>
    </SafeAreaProvider>
  );
}

const stylesTopBar = StyleSheet.create({
  safe: { backgroundColor: "#020617", borderBottomWidth: 1, borderBottomColor: "#111827" },
  headerRow: { paddingHorizontal: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  logo: { width: 34, height: 34, borderRadius: 10 },
  brand: { color: "#f9fafb", fontSize: 18, fontWeight: "900" },
  tagline: { color: "#94a3b8", fontSize: 12, fontWeight: "700", marginTop: 1 },
  learnBtn: { width: 40, height: 34, borderRadius: 12, borderWidth: 1, borderColor: "#1f2937", backgroundColor: "#020617", alignItems: "center", justifyContent: "center", marginLeft: 10 },
  learnBtnActive: { borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)" },
  learnIcon: { fontSize: 16, color: "#cbd5e1" },
  learnIconActive: { color: "#bbf7d0" },
  tabsPill: { flexDirection: "row", marginHorizontal: 12, marginBottom: 10, borderRadius: 999, borderWidth: 1, borderColor: "#111827", overflow: "hidden", backgroundColor: "#060f1f" },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: "center" },
  tabBtnActive: { borderWidth: 1, borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)" },
  tabText: { color: "#cbd5e1", fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: "#bbf7d0" },
});