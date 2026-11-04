import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchHelplines, fetchSafetyTips } from '../api/safetyApi';
import { SafetyCategory, SafetyTipItem } from '../types/safety';

const CATEGORIES: { key: SafetyCategory; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'HELPLINES', label: 'Helplines' },
  { key: 'TRAVEL', label: 'Travel & Rides' },
  { key: 'COMMUTE', label: 'Commute' },
  { key: 'NIGHT_SAFETY', label: 'Night Safety' },
  { key: 'DIGITAL', label: 'Digital' },
];

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: '1', text: 'Phone battery above 50% & power-saving tuned', checked: false },
  { id: '2', text: 'Emergency contacts & primary contact verified', checked: false },
  { id: '3', text: 'Ride details & driver license plate matched', checked: false },
  { id: '4', text: 'Keys kept in hand or easily reachable pocket', checked: false },
  { id: '5', text: 'Safe route / well-lit paths selected', checked: false },
];

export const SafetyTipsScreen: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<SafetyCategory>('ALL');
  const [tips, setTips] = useState<SafetyTipItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);

  const loadData = useCallback(async (category: SafetyCategory) => {
    try {
      if (category === 'HELPLINES') {
        const result = await fetchHelplines();
        setTips(result.helplines);
        setIsOffline(result.isOffline);
      } else {
        const result = await fetchSafetyTips(category);
        setTips(result.tips);
        setIsOffline(result.isOffline);
      }
    } catch {
      // safe fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadData(activeCategory);
  }, [activeCategory, loadData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData(activeCategory);
  };

  const handleDialHelpline = (name: string, number: string) => {
    Alert.alert(
      'Confirm Emergency Call',
      `Are you sure you want to open your phone dialer for ${name} (${number})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Call ${number}`,
          style: 'destructive',
          onPress: async () => {
            const url = `tel:${number}`;
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              await Linking.openURL(url);
            } else {
              Alert.alert('Unable to Dial', `Please manually dial: ${number}`);
            }
          },
        },
      ]
    );
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const filteredTips = tips.filter((tip) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      tip.title.toLowerCase().includes(query) ||
      tip.content.toLowerCase().includes(query) ||
      (tip.emergencyNumber && tip.emergencyNumber.includes(query))
    );
  });

  const helplineTips = filteredTips.filter((t) => t.helpline);
  const guideTips = filteredTips.filter((t) => !t.helpline);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.headerBox}>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>SAFETY GUIDANCE & HELPLINES</Text>
          {isOffline ? (
            <Text style={styles.offlineBadge}>OFFLINE RESILIENT</Text>
          ) : (
            <Text style={styles.onlineBadge}>BACKEND SYNCED</Text>
          )}
        </View>
        <Text style={styles.title}>Safety Resource Hub</Text>
        <Text style={styles.subtitle}>
          Verified national emergency helplines, situational prevention advice,
          and personal security checklists.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search safety tips or helplines (e.g. 112, ride, night)..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryText,
                  isSelected && styles.categoryTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* EMERGENCY HELPLINES SECTION */}
      {(activeCategory === 'ALL' || activeCategory === 'HELPLINES') &&
        helplineTips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Verified National Helplines
              </Text>
              <Text style={styles.sectionTag}>Tap to dial</Text>
            </View>

            {helplineTips.map((hl) => (
              <View key={hl.id} style={styles.helplineCard}>
                <View style={styles.helplineHeader}>
                  <View style={styles.helplineTitleArea}>
                    <Text style={styles.helplineName}>{hl.title}</Text>
                    <Text style={styles.helplineDesc}>{hl.content}</Text>
                  </View>
                  {hl.emergencyNumber && (
                    <TouchableOpacity
                      style={styles.dialButton}
                      onPress={() =>
                        handleDialHelpline(hl.title, hl.emergencyNumber!)
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.dialButtonNumber}>
                        {hl.emergencyNumber}
                      </Text>
                      <Text style={styles.dialButtonLabel}>CALL</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

      {/* TRAVEL & PERSONAL CHECKLIST */}
      {activeCategory === 'ALL' && (
        <View style={styles.checklistCard}>
          <Text style={styles.checklistTitle}>Quick Departure Checklist</Text>
          <Text style={styles.checklistDesc}>
            Review these quick precautions before leaving alone or traveling late:
          </Text>

          {checklist.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem(item.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  item.checked && styles.checkboxChecked,
                ]}
              >
                {item.checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.checkText,
                  item.checked && styles.checkTextChecked,
                ]}
              >
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* GUIDANCE TIPS SECTION */}
      {activeCategory !== 'HELPLINES' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Situational Safety Advice</Text>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={styles.loadingText}>Loading safety guidance...</Text>
            </View>
          ) : guideTips.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No guidance tips match your search.
              </Text>
            </View>
          ) : (
            guideTips.map((tip) => (
              <View key={tip.id} style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <Text style={styles.tipCategoryBadge}>{tip.category}</Text>
                </View>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipContent}>{tip.content}</Text>
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.footerInfoBox}>
        <Text style={styles.footerInfoTitle}>Offline Reliability</Text>
        <Text style={styles.footerInfoText}>
          Even without cellular internet, SafeHer Nexus embeds verified
          emergency numbers locally so you can reach official responders under
          any condition.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
  },
  headerBox: {
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    letterSpacing: 0.5,
  },
  offlineBadge: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  onlineBadge: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  searchBox: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 48,
  },
  categoryScroll: {
    paddingBottom: 14,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipSelected: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  section: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  sectionTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
  },
  helplineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  helplineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  helplineTitleArea: {
    flex: 1,
  },
  helplineName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  helplineDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  dialButton: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: 44,
  },
  dialButtonNumber: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  dialButtonLabel: {
    color: '#FEE2E2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  checklistDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  checkText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  checkTextChecked: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  tipHeader: {
    marginBottom: 6,
  },
  tipCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  tipContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  footerInfoBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 14,
    marginTop: 6,
    marginBottom: 20,
  },
  footerInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 2,
  },
  footerInfoText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
});
