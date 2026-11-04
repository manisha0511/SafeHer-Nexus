import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  fetchEmergencyEventByIdApi,
  fetchEmergencyEventsApi,
} from '../api/emergencyEventApi';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmergencyEventItem, PagedResponse } from '../types/emergencyEvent';

const PAGE_SIZE = 10;

export const EmergencyHistoryScreen: React.FC = () => {
  const [pageData, setPageData] =
    useState<PagedResponse<EmergencyEventItem> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<EmergencyEventItem | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const loadHistoryPage = useCallback(async (pageIndex: number) => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const response = await fetchEmergencyEventsApi(pageIndex, PAGE_SIZE);
      setPageData(response);
      setCurrentPage(response.page);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Unable to load emergency event history.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistoryPage(0);
  }, [loadHistoryPage]);

  const handleInspectEvent = async (eventId: number) => {
    setLoadingDetail(true);
    setErrorBanner(null);
    try {
      const detail = await fetchEmergencyEventByIdApi(eventId);
      setSelectedEvent(detail);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Unable to load event details.'
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const events = pageData?.content ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextCol}>
          <Text style={styles.heading}>Emergency History</Text>
          <Text style={styles.subheading}>
            Chronological log of your past safety alerts and check-ins (newest
            first).
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => loadHistoryPage(currentPage)}
          disabled={loading}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshLink}>
            {loading ? 'Loading...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {errorBanner ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorBanner}</Text>
        </View>
      ) : null}

      {selectedEvent ? (
        <View style={styles.detailModalCard}>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailTitle}>
              Event #{selectedEvent.id} • {selectedEvent.eventType}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedEvent(null)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.detailLine}>Status: {selectedEvent.status}</Text>
          <Text style={styles.detailLine}>
            Notification Status: {selectedEvent.notificationStatus}
          </Text>
          <Text style={styles.detailLine}>
            Created: {new Date(selectedEvent.createdAt).toLocaleString()}
          </Text>
          {selectedEvent.resolvedAt ? (
            <Text style={styles.detailLine}>
              Resolved: {new Date(selectedEvent.resolvedAt).toLocaleString()}
            </Text>
          ) : null}
          <Text style={styles.detailLine}>
            Location Attached: {selectedEvent.locationAttached ? 'Yes' : 'No'}
          </Text>
          {selectedEvent.locationAttached &&
          selectedEvent.initialLatitude != null &&
          selectedEvent.initialLongitude != null ? (
            <Text style={styles.detailLine}>
              Initial Coordinates: {selectedEvent.initialLatitude},{' '}
              {selectedEvent.initialLongitude}
              {selectedEvent.locationAccuracyMeters != null
                ? ` (±${selectedEvent.locationAccuracyMeters}m)`
                : ''}
            </Text>
          ) : null}
          {selectedEvent.locationLabel ? (
            <Text style={styles.detailLine}>
              Area Reference: {selectedEvent.locationLabel}
            </Text>
          ) : null}
          {selectedEvent.notes ? (
            <Text style={styles.detailLine}>Notes: {selectedEvent.notes}</Text>
          ) : null}
        </View>
      ) : null}

      {loadingDetail ? (
        <View style={styles.detailLoadingRow}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.detailLoadingText}>
            Fetching event details...
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>
            Loading emergency event history...
          </Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Emergency Events Recorded</Text>
          <Text style={styles.emptySubtitle}>
            Your emergency history is currently empty. When you trigger or
            resolve SOS events, they will appear here in chronological order.
          </Text>
        </View>
      ) : (
        <View style={styles.listSection}>
          {events.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.eventCard}
              onPress={() => handleInspectEvent(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.eventTopRow}>
                <Text style={styles.eventType}>
                  #{item.id} • {item.eventType}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'ACTIVE' ? styles.statusBadgeActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.status === 'ACTIVE'
                        ? styles.statusBadgeTextActive
                        : null,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.timestampText}>
                Created: {new Date(item.createdAt).toLocaleString()}
              </Text>

              {item.resolvedAt ? (
                <Text style={styles.timestampText}>
                  Resolved: {new Date(item.resolvedAt).toLocaleString()}
                </Text>
              ) : null}

              <Text style={styles.timestampText}>
                Location:{' '}
                {item.locationAttached
                  ? 'Coordinates Attached'
                  : 'Not Attached'}{' '}
                • Notification: {item.notificationStatus}
              </Text>

              {item.locationLabel ? (
                <Text style={styles.locationText}>
                  Area Reference: {item.locationLabel}
                </Text>
              ) : null}

              <Text style={styles.tapHint}>Tap to inspect event details →</Text>
            </TouchableOpacity>
          ))}

          {pageData && pageData.totalPages > 1 ? (
            <View style={styles.paginationRow}>
              <View style={styles.pageButtonCol}>
                <PrimaryButton
                  title="← Newer"
                  onPress={() => loadHistoryPage(currentPage - 1)}
                  disabled={currentPage <= 0 || loading}
                  variant="secondary"
                />
              </View>
              <Text style={styles.pageInfoText}>
                Page {currentPage + 1} of {pageData.totalPages}
              </Text>
              <View style={styles.pageButtonCol}>
                <PrimaryButton
                  title="Older →"
                  onPress={() => loadHistoryPage(currentPage + 1)}
                  disabled={pageData.last || loading}
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  refreshButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  refreshLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
  },
  detailModalCard: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C4B5FD',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4C1D95',
  },
  closeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
  },
  detailLine: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
  },
  detailLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLoadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#475569',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  loadingText: {
    marginTop: 10,
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginTop: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  listSection: {
    marginTop: 8,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventType: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeActive: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  statusBadgeTextActive: {
    color: '#991B1B',
  },
  timestampText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    marginTop: 6,
  },
  tapHint: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
    marginTop: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  pageButtonCol: {
    width: 110,
  },
  pageInfoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
});
