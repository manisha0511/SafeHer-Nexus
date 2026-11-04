import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ApiClientError } from '../api/apiClient';
import {
  createSosEventApi,
  fetchActiveEmergencyEventApi,
  fetchEventNotificationsApi,
  resolveEmergencyEventApi,
} from '../api/emergencyEventApi';
import { FormInput } from '../components/FormInput';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  CreateSosEventPayload,
  EmergencyEventItem,
  EmergencyNotificationItem,
} from '../types/emergencyEvent';
import {
  LiveLocationTracker,
  LiveTrackingState,
} from '../utils/liveLocationTracker';
import {
  captureForegroundLocationForSos,
  LocationCaptureResult,
} from '../utils/locationCapture';

interface SosScreenProps {
  onNavigateToHistory: () => void;
}

export const SosScreen: React.FC<SosScreenProps> = ({
  onNavigateToHistory,
}) => {
  const [activeEvent, setActiveEvent] = useState<EmergencyEventItem | null>(
    null
  );
  const [checkingActive, setCheckingActive] = useState<boolean>(true);

  // Live Location Tracking State
  const [trackingState, setTrackingState] = useState<LiveTrackingState>({
    status: 'INITIALIZING',
    statusMessage: 'Ready for continuous location updates when SOS is active.',
    updateCount: 0,
  });
  const liveTrackerRef = useRef<LiveLocationTracker | null>(null);

  // Emergency Notifications State
  const [notifications, setNotifications] = useState<EmergencyNotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);

  // Confirmation step before triggering SOS
  const [isConfirmingTrigger, setIsConfirmingTrigger] =
    useState<boolean>(false);
  const [capturingLocation, setCapturingLocation] = useState<boolean>(false);
  const [locationResult, setLocationResult] =
    useState<LocationCaptureResult | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [triggeringSos, setTriggeringSos] = useState<boolean>(false);

  // Resolution state
  const [confirmingResolve, setConfirmingResolve] = useState<boolean>(false);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [resolvingSos, setResolvingSos] = useState<boolean>(false);

  // Feedback banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const startLiveTracking = useCallback((eventId: number) => {
    if (liveTrackerRef.current) {
      liveTrackerRef.current.stop();
    }
    const tracker = new LiveLocationTracker(eventId, (newState) => {
      setTrackingState(newState);
    }, 15000);
    liveTrackerRef.current = tracker;
    tracker.start();
  }, []);

  const stopLiveTracking = useCallback(() => {
    if (liveTrackerRef.current) {
      liveTrackerRef.current.stop();
      liveTrackerRef.current = null;
    }
  }, []);

  const loadNotifications = useCallback(async (eventId: number) => {
    setLoadingNotifications(true);
    try {
      const items = await fetchEventNotificationsApi(eventId);
      setNotifications(items);
    } catch {
      // Safe fallback
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  const loadActiveEvent = useCallback(async () => {
    setCheckingActive(true);
    setErrorBanner(null);
    try {
      const currentActive = await fetchActiveEmergencyEventApi();
      setActiveEvent(currentActive);
      if (currentActive) {
        startLiveTracking(currentActive.id);
        loadNotifications(currentActive.id);
      } else {
        stopLiveTracking();
        setNotifications([]);
      }
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Could not check active emergency status from the server.'
      );
    } finally {
      setCheckingActive(false);
    }
  }, [loadNotifications, startLiveTracking, stopLiveTracking]);

  useEffect(() => {
    loadActiveEvent();
    return () => {
      stopLiveTracking();
    };
  }, [loadActiveEvent, stopLiveTracking]);

  const requestLocationSnapshot = async () => {
    setCapturingLocation(true);
    try {
      const result = await captureForegroundLocationForSos();
      setLocationResult(result);
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleStartSosConfirmation = async () => {
    setErrorBanner(null);
    setStatusBanner(null);
    setIsConfirmingTrigger(true);
    await requestLocationSnapshot();
  };

  const handleCancelSosConfirmation = () => {
    setIsConfirmingTrigger(false);
    setLocationResult(null);
    setLocationLabel('');
    setNotes('');
    setErrorBanner(null);
  };

  const handleConfirmAndCreateSos = async () => {
    if (triggeringSos) {
      return;
    }

    setTriggeringSos(true);
    setErrorBanner(null);
    setStatusBanner(null);

    const payload: CreateSosEventPayload = {
      locationLabel:
        locationLabel.trim().length > 0 ? locationLabel.trim() : undefined,
      notes: notes.trim().length > 0 ? notes.trim() : undefined,
    };

    if (locationResult && locationResult.status === 'CAPTURED') {
      payload.latitude = locationResult.latitude;
      payload.longitude = locationResult.longitude;
      payload.locationAccuracyMeters = locationResult.accuracyMeters;
      payload.locationCapturedAt = locationResult.capturedAtIso;
    }

    try {
      const created = await createSosEventApi(payload);
      setActiveEvent(created);
      setIsConfirmingTrigger(false);
      setLocationLabel('');
      setNotes('');
      setStatusBanner(
        `SOS Event #${created.id} recorded with status ${created.status}. Live location tracking initiated.`
      );
      startLiveTracking(created.id);
      loadNotifications(created.id);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrorBanner(err.message);
        await loadActiveEvent();
        setIsConfirmingTrigger(false);
      } else if (err instanceof Error) {
        setErrorBanner(`SOS Event Not Confirmed: ${err.message}`);
      } else {
        setErrorBanner(
          'SOS Event could not be confirmed by the server. Please check your connection or call emergency services directly.'
        );
      }
    } finally {
      setTriggeringSos(false);
    }
  };

  const handleConfirmResolveSos = async () => {
    if (!activeEvent || resolvingSos) {
      return;
    }

    setResolvingSos(true);
    setErrorBanner(null);
    setStatusBanner(null);

    try {
      const resolved = await resolveEmergencyEventApi(activeEvent.id, {
        resolutionNotes:
          resolutionNotes.trim().length > 0
            ? resolutionNotes.trim()
            : undefined,
      });

      stopLiveTracking();
      setActiveEvent(null);
      setNotifications([]);
      setConfirmingResolve(false);
      setResolutionNotes('');
      setStatusBanner(
        `SOS Event #${resolved.id} marked as ${resolved.status} at ${
          resolved.resolvedAt
            ? new Date(resolved.resolvedAt).toLocaleTimeString()
            : 'now'
        }. Live tracking stopped.`
      );
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? `Could not resolve emergency event: ${err.message}`
          : 'Could not resolve emergency event on the server.'
      );
    } finally {
      setResolvingSos(false);
    }
  };

  const openMapLink = (lat?: number | null, lon?: number | null) => {
    if (lat == null || lon == null) return;
    const url = `https://maps.google.com/?q=${lat},${lon}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Map Error', `Coordinates: ${lat}, ${lon}`);
    });
  };

  const effectiveLat =
    trackingState.latestLatitude ?? activeEvent?.initialLatitude;
  const effectiveLon =
    trackingState.latestLongitude ?? activeEvent?.initialLongitude;
  const effectiveAcc =
    trackingState.latestAccuracyMeters ?? activeEvent?.locationAccuracyMeters;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>SOS Emergency Center</Text>
      <Text style={styles.subheading}>
        Real-time emergency workflows, continuous GPS tracking, and trusted
        contact notifications.
      </Text>

      {errorBanner ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorBanner}</Text>
        </View>
      ) : null}

      {statusBanner ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{statusBanner}</Text>
        </View>
      ) : null}

      {checkingActive ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>
            Checking active emergency status...
          </Text>
        </View>
      ) : activeEvent ? (
        /* ================= ACTIVE EMERGENCY VIEW ================= */
        <View style={styles.activeSosCard}>
          <View style={styles.activeHeaderRow}>
            <View style={styles.activePulseBadge}>
              <Text style={styles.activePulseText}>
                ACTIVE EMERGENCY • #{activeEvent.id}
              </Text>
            </View>
            <Text style={styles.activeTypeLabel}>{activeEvent.eventType}</Text>
          </View>

          <Text style={styles.activeTitle}>
            Emergency In Progress
          </Text>
          <Text style={styles.activeTimestamp}>
            Started: {new Date(activeEvent.createdAt).toLocaleString()}
          </Text>

          {/* CONCEPT 1: LIVE LOCATION TRACKING CARD */}
          <View style={styles.statusSectionBox}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.statusSectionHeading}>
                1. Continuous Live GPS Tracking
              </Text>
              {trackingState.status === 'TRACKING_ACTIVE' ? (
                <View style={styles.liveIndicatorPill}>
                  <Text style={styles.liveIndicatorDot}>●</Text>
                  <Text style={styles.liveIndicatorText}>LIVE</Text>
                </View>
              ) : null}
            </View>

            {/* Tracking Status Badge */}
            <View
              style={[
                styles.trackingStatusBadge,
                trackingState.status === 'TRACKING_ACTIVE'
                  ? styles.trackingActiveBadge
                  : trackingState.status === 'OFFLINE_RETRY'
                  ? styles.trackingWarningBadge
                  : styles.trackingErrorBadge,
              ]}
            >
              <Text
                style={[
                  styles.trackingStatusText,
                  trackingState.status === 'TRACKING_ACTIVE'
                    ? styles.trackingActiveText
                    : trackingState.status === 'OFFLINE_RETRY'
                    ? styles.trackingWarningText
                    : styles.trackingErrorText,
                ]}
              >
                {trackingState.status === 'TRACKING_ACTIVE'
                  ? 'TRACKING ACTIVE & SYNCED'
                  : trackingState.status === 'OFFLINE_RETRY'
                  ? 'NETWORK DROPPED (SYNC RETRYING)'
                  : trackingState.status === 'PERMISSION_DENIED'
                  ? 'LOCATION PERMISSION DENIED'
                  : 'INITIALIZING GPS...'}
              </Text>
            </View>

            <Text style={styles.statusDetailText}>
              {trackingState.statusMessage}
            </Text>

            {effectiveLat != null && effectiveLon != null ? (
              <View style={styles.coordsCard}>
                <View style={styles.coordsRow}>
                  <Text style={styles.coordsLabel}>Current Coordinates:</Text>
                  <Text style={styles.coordsValue}>
                    {effectiveLat.toFixed(5)}, {effectiveLon.toFixed(5)}
                  </Text>
                </View>
                {effectiveAcc != null && (
                  <View style={styles.coordsRow}>
                    <Text style={styles.coordsLabel}>Estimated Accuracy:</Text>
                    <Text style={styles.coordsValue}>±{effectiveAcc} m</Text>
                  </View>
                )}
                {trackingState.lastSuccessfulSyncIso && (
                  <View style={styles.coordsRow}>
                    <Text style={styles.coordsLabel}>Last Server Sync:</Text>
                    <Text style={styles.coordsValue}>
                      {new Date(
                        trackingState.lastSuccessfulSyncIso
                      ).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
                <View style={styles.coordsRow}>
                  <Text style={styles.coordsLabel}>Breadcrumbs Uploaded:</Text>
                  <Text style={styles.coordsValue}>
                    {trackingState.updateCount} updates
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.openMapButton}
                  onPress={() => openMapLink(effectiveLat, effectiveLon)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.openMapButtonText}>
                    Open Live Location in Google Maps ↗
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.statusDetailText}>
                No GPS coordinates currently available.
              </Text>
            )}

            {trackingState.status === 'PERMISSION_DENIED' && (
              <TouchableOpacity
                style={styles.retryPermissionBtn}
                onPress={() => startLiveTracking(activeEvent.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.retryPermissionText}>
                  Grant Location Permission
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CONCEPT 2: EMERGENCY NOTIFICATIONS & SMS DISPATCH */}
          <View style={styles.statusSectionBox}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.statusSectionHeading}>
                2. Emergency SMS Notifications
              </Text>
              <TouchableOpacity
                onPress={() => loadNotifications(activeEvent.id)}
                disabled={loadingNotifications}
              >
                <Text style={styles.refreshLink}>
                  {loadingNotifications ? 'Updating...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.notifSummaryBadge,
                activeEvent.notificationStatus === 'DELIVERED'
                  ? styles.notifDeliveredBadge
                  : activeEvent.notificationStatus === 'SENT'
                  ? styles.notifSentBadge
                  : activeEvent.notificationStatus === 'QUEUED'
                  ? styles.notifQueuedBadge
                  : styles.notifConfigBadge,
              ]}
            >
              <Text style={styles.notifSummaryText}>
                STATUS: {activeEvent.notificationStatus}
              </Text>
            </View>

            <Text style={styles.statusDetailText}>
              {activeEvent.notificationStatusMessage}
            </Text>

            {notifications.length > 0 ? (
              <View style={styles.notifList}>
                {notifications.map((notif) => (
                  <View key={notif.id} style={styles.notifItem}>
                    <View style={styles.notifItemHeader}>
                      <Text style={styles.notifRecipientName}>
                        {notif.recipientName} ({notif.recipientPhone})
                      </Text>
                      <View
                        style={[
                          styles.notifPill,
                          notif.status === 'DELIVERED'
                            ? styles.notifPillDelivered
                            : notif.status === 'SENT'
                            ? styles.notifPillSent
                            : notif.status === 'QUEUED'
                            ? styles.notifPillQueued
                            : styles.notifPillGray,
                        ]}
                      >
                        <Text style={styles.notifPillText}>{notif.status}</Text>
                      </View>
                    </View>
                    {notif.errorMessage ? (
                      <Text style={styles.notifErrorText}>
                        Error: {notif.errorMessage}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.statusHintText}>
                No contacts registered or Twilio credentials not configured in
                the backend environment.
              </Text>
            )}

            <View style={styles.noticeSubBox}>
              <Text style={styles.noticeSubTitle}>SMS Delivery Note</Text>
              <Text style={styles.noticeSubText}>
                Real SMS dispatch requires Twilio credentials (TWILIO_ACCOUNT_SID,
                TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE_NUMBER) configured on the
                server. SafeHer Nexus records your event and continuous location
                safely regardless of SMS delivery status.
              </Text>
            </View>
          </View>

          {/* CONCEPT 3: RESOLVE EMERGENCY WORKFLOW */}
          {confirmingResolve ? (
            <View style={styles.resolveConfirmBox}>
              <Text style={styles.resolveConfirmTitle}>
                Resolve Active SOS Event #{activeEvent.id}?
              </Text>
              <Text style={styles.resolveConfirmSub}>
                This will mark your emergency as RESOLVED, stop continuous GPS
                tracking, and store the event in your Emergency History.
              </Text>

              <FormInput
                label="Resolution Note (Optional)"
                placeholder="e.g. Reached home safely / False alarm"
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
              />

              <PrimaryButton
                title="Confirm I Am Safe (Resolve SOS)"
                onPress={handleConfirmResolveSos}
                loading={resolvingSos}
                variant="primary"
              />
              <PrimaryButton
                title="Keep SOS Active"
                onPress={() => setConfirmingResolve(false)}
                disabled={resolvingSos}
                variant="secondary"
              />
            </View>
          ) : (
            <View style={styles.resolveButtonWrapper}>
              <PrimaryButton
                title="Mark I Am Safe / Resolve Active SOS"
                onPress={() => setConfirmingResolve(true)}
                variant="primary"
              />
            </View>
          )}
        </View>
      ) : isConfirmingTrigger ? (
        /* ================= CONFIRMATION STEP BEFORE SOS ================= */
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Confirm SOS Activation</Text>
          <Text style={styles.confirmDesc}>
            Please review your initial location and confirm below to activate an
            SOS emergency event on the server. Continuous GPS tracking and SMS
            notifications will begin immediately upon confirmation.
          </Text>

          <View style={styles.locationPreviewBox}>
            <View style={styles.locationHeaderRow}>
              <Text style={styles.locationBoxTitle}>
                Initial Foreground Location
              </Text>
              <TouchableOpacity
                onPress={requestLocationSnapshot}
                disabled={capturingLocation || triggeringSos}
                style={styles.retryButton}
              >
                <Text style={styles.retryLink}>
                  {capturingLocation ? 'Capturing...' : 'Retry Location'}
                </Text>
              </TouchableOpacity>
            </View>

            {capturingLocation ? (
              <View style={styles.inlineLoader}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text style={styles.inlineLoaderText}>
                  Requesting GPS coordinates...
                </Text>
              </View>
            ) : locationResult?.status === 'CAPTURED' ? (
              <View>
                <Text style={styles.locationReadyText}>
                  ✓ Coordinates Ready: {locationResult.latitude},{' '}
                  {locationResult.longitude}
                </Text>
                {locationResult.accuracyMeters !== undefined ? (
                  <Text style={styles.locationMetaText}>
                    Accuracy: ±{locationResult.accuracyMeters}m
                  </Text>
                ) : null}
              </View>
            ) : (
              <View>
                <Text style={styles.locationMissingText}>
                  ⚠ Initial Location Not Attached
                </Text>
                <Text style={styles.locationMetaText}>
                  {locationResult?.message ||
                    'Location could not be obtained. You can still trigger the SOS alert.'}
                </Text>
              </View>
            )}
          </View>

          <FormInput
            label="Area / Landmark Reference (Optional)"
            placeholder="e.g. Near Central Metro Gate 2"
            value={locationLabel}
            onChangeText={setLocationLabel}
          />

          <FormInput
            label="Situation Note (Optional)"
            placeholder="e.g. Walking alone, feeling unsafe"
            value={notes}
            onChangeText={setNotes}
          />

          <PrimaryButton
            title="CONFIRM & ACTIVATE SOS NOW"
            onPress={handleConfirmAndCreateSos}
            loading={triggeringSos}
            disabled={capturingLocation || triggeringSos}
            variant="danger"
          />

          <PrimaryButton
            title="Cancel (Do Not Trigger)"
            onPress={handleCancelSosConfirmation}
            disabled={triggeringSos}
            variant="secondary"
          />
        </View>
      ) : (
        /* ================= STANDBY SOS BUTTON VIEW ================= */
        <View style={styles.standbyCard}>
          <Text style={styles.standbyStatusText}>
            No Active SOS Event in Progress
          </Text>
          <Text style={styles.standbyHint}>
            Tap the button below to initiate SOS emergency activation, continuous
            GPS tracking, and trusted contact notifications.
          </Text>

          <TouchableOpacity
            style={styles.bigSosButton}
            onPress={handleStartSosConfirmation}
            activeOpacity={0.85}
          >
            <Text style={styles.bigSosButtonTitle}>SOS</Text>
            <Text style={styles.bigSosButtonSubtitle}>
              TAP TO START EMERGENCY ALERT
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.historyLinkCard}
        onPress={onNavigateToHistory}
        activeOpacity={0.8}
      >
        <Text style={styles.historyLinkText}>
          View Past Emergency Event History →
        </Text>
      </TouchableOpacity>
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
    marginBottom: 14,
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
    fontWeight: '700',
  },
  successBanner: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  successBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  activeSosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#DC2626',
    padding: 18,
    marginBottom: 16,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activePulseBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activePulseText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activeTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  activeTimestamp: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  statusSectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  liveIndicatorDot: {
    color: '#16A34A',
    fontSize: 10,
  },
  liveIndicatorText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  trackingStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  trackingActiveBadge: {
    backgroundColor: '#DCFCE7',
  },
  trackingWarningBadge: {
    backgroundColor: '#FEF3C7',
  },
  trackingErrorBadge: {
    backgroundColor: '#FEE2E2',
  },
  trackingStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trackingActiveText: {
    color: '#166534',
  },
  trackingWarningText: {
    color: '#92400E',
  },
  trackingErrorText: {
    color: '#991B1B',
  },
  statusDetailText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 8,
  },
  statusHintText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginVertical: 4,
  },
  coordsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 4,
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  coordsLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  coordsValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  openMapButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  openMapButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  retryPermissionBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  retryPermissionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  refreshLink: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '700',
  },
  notifSummaryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  notifDeliveredBadge: {
    backgroundColor: '#DCFCE7',
  },
  notifSentBadge: {
    backgroundColor: '#DBEAFE',
  },
  notifQueuedBadge: {
    backgroundColor: '#FEF3C7',
  },
  notifConfigBadge: {
    backgroundColor: '#F1F5F9',
  },
  notifSummaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  notifList: {
    marginTop: 6,
    gap: 6,
  },
  notifItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  notifItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifRecipientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  notifPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  notifPillDelivered: {
    backgroundColor: '#DCFCE7',
  },
  notifPillSent: {
    backgroundColor: '#DBEAFE',
  },
  notifPillQueued: {
    backgroundColor: '#FEF3C7',
  },
  notifPillGray: {
    backgroundColor: '#F1F5F9',
  },
  notifPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  notifErrorText: {
    color: '#DC2626',
    fontSize: 11,
    marginTop: 4,
  },
  noticeSubBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  noticeSubTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  noticeSubText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },
  resolveConfirmBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 14,
    marginTop: 4,
  },
  resolveConfirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 4,
  },
  resolveConfirmSub: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
    marginBottom: 12,
  },
  resolveButtonWrapper: {
    marginTop: 6,
  },
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  confirmDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 14,
  },
  locationPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 14,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  retryLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  inlineLoaderText: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '600',
  },
  locationReadyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 2,
  },
  locationMissingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 2,
  },
  locationMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  standbyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  standbyStatusText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  standbyHint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  bigSosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  bigSosButtonTitle: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 2,
  },
  bigSosButtonSubtitle: {
    color: '#FEE2E2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  historyLinkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  historyLinkText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '700',
  },
});
