import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchBackendHealth } from '../api/healthApi';
import { API_BASE_URL } from '../config/env';
import { HealthResponseDto } from '../types/health';

export const BackendStatusCard: React.FC = () => {
  const [health, setHealth] = useState<HealthResponseDto | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    setErrorText(null);
    try {
      const response = await fetchBackendHealth();
      setHealth(response);
    } catch (err: unknown) {
      setHealth(null);
      setErrorText(
        err instanceof Error ? err.message : 'Unable to reach backend'
      );
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Backend API Status</Text>
        <TouchableOpacity onPress={checkHealth} disabled={checking}>
          <Text style={styles.refreshLink}>
            {checking ? 'Checking...' : 'Check Now'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.urlText}>Target: {API_BASE_URL}</Text>

      {health ? (
        <View style={styles.badgeUp}>
          <Text style={styles.badgeUpText}>
            ONLINE ({health.status}) • {health.service} v{health.version}
          </Text>
        </View>
      ) : errorText ? (
        <View style={styles.badgeDown}>
          <Text style={styles.badgeDownText}>{errorText}</Text>
        </View>
      ) : (
        <Text style={styles.checkingText}>Connecting to backend...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  refreshLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  urlText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  badgeUp: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeUpText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeDown: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeDownText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '500',
  },
  checkingText: {
    fontSize: 12,
    color: '#64748B',
  },
});
