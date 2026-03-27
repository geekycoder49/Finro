import React, { useEffect, useState, useRef } from "react";
import { View, Text, AppState } from "react-native";
import { useTheme } from "./src/hooks/useTheme";

const API_URL = "https://psxterminal.com/api/klines/KSE100/1d?limit=7";

export default function KSELiveScreen() {
  const { themeColors } = useTheme();
  const [currentValue, setCurrentValue] = useState(null);
  const [change, setChange] = useState(0);
  const [percent, setPercent] = useState(0);
  
  const [stats, setStats] = useState({
    symbol: "Loading...",
    open: null,
    high: null,
    low: null,
    close: null
  });

  const appState = useRef(AppState.currentState);
  const intervalRef = useRef(null);

  // Fetch function
  const fetchKSE = async () => {
    try {
      const res = await fetch(API_URL);
      const json = await res.json();

      if (!json?.data?.length) return;

      const latest = json.data[json.data.length - 1];
      const previous = json.data.length > 1 ? json.data[json.data.length - 2] : null;

      const value = latest.close;

      if (!value) return;

      setCurrentValue(value);
      setStats({
        symbol: latest.symbol,
        open: latest.open,
        high: latest.high,
        low: latest.low,
        close: latest.close
      });

      // Calculate change against yesterday's close
      if (previous && previous.close) {
        const prevValue = previous.close;
        const ch = value - prevValue;
        const pct = (ch / prevValue) * 100;

        setChange(ch);
        setPercent(pct);
      }

    } catch (err) {
      console.log("Fetch error:", err);
    }
  };

  // Start polling
  const startPolling = () => {
    fetchKSE(); // initial call

    intervalRef.current = setInterval(() => {
      fetchKSE();
    }, 5000);
  };

  // Stop polling
  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // Handle app state (background/foreground)
  useEffect(() => {
    startPolling();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        stopPolling();
      }

      appState.current = nextState;
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, []);

  const isUp = change >= 0;

  const getMarketStatus = () => {
    const now = new Date();
    // Calculate PKT (PST is UTC+5)
    let pktHours = now.getUTCHours() + 5;
    let pktDay = now.getUTCDay();

    // Handle day wrapping if UTC+5 crosses midnight
    if (pktHours >= 24) {
      pktHours -= 24;
      pktDay = (pktDay + 1) % 7;
    }

    // Closed heavily on weekends (Sunday = 0, Saturday = 6)
    if (pktDay === 0 || pktDay === 6) return 'CLOSED';

    const pktMinutes = now.getUTCMinutes();
    const timeInMinutes = pktHours * 60 + pktMinutes;
    
    const openTime = 9 * 60 + 32; // 9:32 AM
    let closeTime = 15 * 60 + 30; // 3:30 PM (Mon-Thu)
    if (pktDay === 5) {
      closeTime = 16 * 60 + 30; // 4:30 PM on Friday
    }

    if (timeInMinutes >= openTime && timeInMinutes < closeTime) {
      return 'OPEN';
    } else {
      return 'CLOSED';
    }
  };

  const marketStatus = getMarketStatus();

  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: themeColors.surface, 
      paddingVertical: 10, 
      paddingHorizontal: 16, 
      borderRadius: 40, 
      borderWidth: 1, 
      borderColor: themeColors.border 
    }}>
      <Text style={{ fontSize: 13, fontWeight: "900", color: themeColors.text, marginRight: 8, letterSpacing: 0.5 }}>
        {stats.symbol || "KSE-100"}
      </Text>
      
      <Text style={{ color: isUp ? "#10B981" : "#EF4444", fontSize: 11, marginRight: 4, marginTop: 1 }}>
        {isUp ? "▲" : "▼"}
      </Text>
      
      <Text style={{ fontSize: 13, fontWeight: "800", color: themeColors.text, marginRight: 6 }}>
        {currentValue ? currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
      </Text>
      
      <Text style={{ color: isUp ? "#10B981" : "#EF4444", fontSize: 12, fontWeight: '800' }}>
        {isUp ? "+" : ""}{change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isUp ? "+" : ""}{percent.toFixed(2)}%)
      </Text>

      <View style={{ marginLeft: 8, backgroundColor: marketStatus === 'OPEN' ? '#10B98120' : '#EF444420', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
        <Text style={{ color: marketStatus === 'OPEN' ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 9 }}>
           {marketStatus}
        </Text>
      </View>
    </View>
  );
}