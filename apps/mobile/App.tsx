import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { CatalogueScreen } from './src/screens/CatalogueScreen';
import { MyLoansScreen } from './src/screens/MyLoansScreen';
import { MyRequestsScreen } from './src/screens/MyRequestsScreen';
import { MyReservationsScreen } from './src/screens/MyReservationsScreen';
import { DigitalIDScreen } from './src/screens/DigitalIDScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';

type TabKey = 'CATALOGUE' | 'LOANS' | 'REQUESTS' | 'RESERVATIONS' | 'PASS' | 'ALERTS';

const MainNavigator: React.FC = () => {
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabKey>('CATALOGUE');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#082B60" />
        <ActivityIndicator size="large" color="#11C4D2" />
        <Text style={styles.loadingText}>Connecting to LIBNEXA NSUK...</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of the university library mobile system?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#082B60" />

      {/* Top Mobile Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.brandTitle}>
            LIB<Text style={styles.brandCyan}>NEXA</Text>
          </Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{role}</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.fullName?.split(' ')[0]}
          </Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Screen Body */}
      <View style={styles.screenContainer}>
        {currentTab === 'CATALOGUE' && <CatalogueScreen />}
        {currentTab === 'LOANS' && <MyLoansScreen />}
        {currentTab === 'REQUESTS' && <MyRequestsScreen />}
        {currentTab === 'RESERVATIONS' && <MyReservationsScreen />}
        {currentTab === 'PASS' && <DigitalIDScreen />}
        {currentTab === 'ALERTS' && <NotificationsScreen />}
      </View>

      {/* Bottom Tab Bar Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => setCurrentTab('CATALOGUE')}
          style={[styles.navItem, currentTab === 'CATALOGUE' && styles.navItemActive]}
        >
          <Text style={[styles.navIcon, currentTab === 'CATALOGUE' && styles.navIconActive]}>📚</Text>
          <Text style={[styles.navLabel, currentTab === 'CATALOGUE' && styles.navLabelActive]}>Catalog</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('LOANS')}
          style={[styles.navItem, currentTab === 'LOANS' && styles.navItemActive]}
        >
          <Text style={[styles.navIcon, currentTab === 'LOANS' && styles.navIconActive]}>📖</Text>
          <Text style={[styles.navLabel, currentTab === 'LOANS' && styles.navLabelActive]}>Loans</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('REQUESTS')}
          style={[styles.navItem, currentTab === 'REQUESTS' && styles.navItemActive]}
        >
          <Text style={[styles.navIcon, currentTab === 'REQUESTS' && styles.navIconActive]}>📋</Text>
          <Text style={[styles.navLabel, currentTab === 'REQUESTS' && styles.navLabelActive]}>Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('RESERVATIONS')}
          style={[styles.navItem, currentTab === 'RESERVATIONS' && styles.navItemActive]}
        >
          <Text style={[styles.navIcon, currentTab === 'RESERVATIONS' && styles.navIconActive]}>⏳</Text>
          <Text style={[styles.navLabel, currentTab === 'RESERVATIONS' && styles.navLabelActive]}>Waitlist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('PASS')}
          style={[styles.navItem, currentTab === 'PASS' && styles.navItemActive]}
        >
          <Text style={[styles.navIcon, currentTab === 'PASS' && styles.navIconActive]}>🪪</Text>
          <Text style={[styles.navLabel, currentTab === 'PASS' && styles.navLabelActive]}>Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab('ALERTS')}
          style={[styles.navItem, currentTab === 'ALERTS' && styles.navItemActive]}
        >
          <Text style={[styles.navIcon, currentTab === 'ALERTS' && styles.navIconActive]}>🔔</Text>
          <Text style={[styles.navLabel, currentTab === 'ALERTS' && styles.navLabelActive]}>Alerts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#082B60',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#082B60',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 14,
  },
  topBar: {
    height: 52,
    backgroundColor: '#082B60',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  brandCyan: {
    color: '#11C4D2',
  },
  rolePill: {
    backgroundColor: 'rgba(7, 155, 169, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#079BA9',
  },
  rolePillText: {
    color: '#11C4D2',
    fontSize: 10,
    fontWeight: 'bold',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userName: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 90,
  },
  logoutButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  logoutText: {
    color: '#F87171',
    fontSize: 10,
    fontWeight: 'bold',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: 48,
  },
  navItemActive: {
    backgroundColor: '#F0F6FD',
  },
  navIcon: {
    fontSize: 17,
    opacity: 0.65,
  },
  navIconActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  navLabel: {
    fontSize: 10,
    color: '#66758A',
    fontWeight: '500',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#1268B3',
    fontWeight: 'bold',
  },
});
