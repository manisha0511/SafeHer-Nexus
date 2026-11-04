import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { fetchRouteRecommendationsApi } from '../api/routeApi';
import {
  RouteAlternative,
  RouteRecommendationResponse,
} from '../types/route';

type TravelMode = 'DRIVING' | 'WALKING' | 'TRANSIT';

export const RoutePlannerScreen: React.FC = () => {
  const [originText, setOriginText] = useState<string>('');
  const [destinationText, setDestinationText] = useState<string>('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVING');

  const [isLoadingGps, setIsLoadingGps] = useState<boolean>(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);

  const [isLoadingRoutes, setIsLoadingRoutes] = useState<boolean>(false);
  const [routeResult, setRouteResult] = useState<RouteRecommendationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  // Single GPS snapshot - strictly foreground snapshot, never continuous tracking
  const handleUseCurrentLocation = async () => {
    setIsLoadingGps(true);
    setGpsStatusMessage(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatusMessage('Location permission was denied. You can still type your origin manually.');
        setIsLoadingGps(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setOriginCoords({ lat, lng });
      setOriginText('Current GPS Location');
      setGpsStatusMessage(`GPS Snapshot captured (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } catch {
      setGpsStatusMessage('Could not retrieve current position. Please type your starting point.');
    } finally {
      setIsLoadingGps(false);
    }
  };

  const handleGetRecommendations = async () => {
    const dest = destinationText.trim();
    if (!dest) {
      setErrorMessage('Please enter a destination to find route recommendations.');
      return;
    }

    setErrorMessage(null);
    setIsLoadingRoutes(true);

    try {
      const response = await fetchRouteRecommendationsApi({
        origin: originText.trim() || (originCoords ? 'Current GPS Location' : undefined),
        destination: dest,
        originLat: originCoords?.lat,
        originLng: originCoords?.lng,
        travelMode,
      });

      setRouteResult(response);
      if (response.routes.length > 0) {
        setExpandedRouteId(response.routes[0].routeId);
      }
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : 'Failed to retrieve route recommendations.';
      setErrorMessage(text);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const handleOpenGoogleMaps = (url: string) => {
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Unable to open Maps', 'Could not launch map navigation application.');
        }
      })
      .catch(() => {
        Alert.alert('Navigation Error', 'Could not open navigation URL.');
      });
  };

  const handleCallHelpline = (num: string) => {
    const cleaned = num.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Phone Call Error', `Please dial ${cleaned} manually.`);
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Smart Route Recommendations</Text>
          <View style={styles.integrityBadge}>
            <Text style={styles.integrityBadgeText}>VERIFIED DATA</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Prioritizes well-lit arterial roads, transit corridors & open commercial streets
        </Text>
      </View>

      {/* Input Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Journey Details</Text>

        {/* Origin Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Origin (Starting Point)</Text>
          <View style={styles.originInputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Connaught Place or Current GPS"
              placeholderTextColor="#94A3B8"
              value={originText}
              onChangeText={(text) => {
                setOriginText(text);
                if (originCoords && text !== 'Current GPS Location') {
                  setOriginCoords(null);
                  setGpsStatusMessage(null);
                }
              }}
            />
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleUseCurrentLocation}
              disabled={isLoadingGps}
              activeOpacity={0.8}
            >
              {isLoadingGps ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.gpsButtonText}>📍 GPS</Text>
              )}
            </TouchableOpacity>
          </View>
          {gpsStatusMessage && (
            <Text style={styles.gpsStatusText}>{gpsStatusMessage}</Text>
          )}
        </View>

        {/* Destination Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Destination *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. India Gate, Cyber Hub, or Metro Station"
            placeholderTextColor="#94A3B8"
            value={destinationText}
            onChangeText={setDestinationText}
          />
        </View>

        {/* Travel Mode Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Travel Mode</Text>
          <View style={styles.modeRow}>
            {(['DRIVING', 'WALKING', 'TRANSIT'] as TravelMode[]).map((mode) => {
              const isSelected = travelMode === mode;
              const modeLabel =
                mode === 'DRIVING' ? '🚗 Drive / Cab' : mode === 'WALKING' ? '🚶 Walk' : '🚌 Transit';
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeButton, isSelected && styles.modeButtonSelected]}
                  onPress={() => setTravelMode(mode)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.modeButtonText, isSelected && styles.modeButtonTextSelected]}
                  >
                    {modeLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Error message */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        )}

        {/* Find Recommendations Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoadingRoutes && styles.submitButtonDisabled]}
          onPress={handleGetRecommendations}
          disabled={isLoadingRoutes}
          activeOpacity={0.8}
        >
          {isLoadingRoutes ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Find Route Recommendations</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Results Section */}
      {routeResult && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultHeaderRow}>
            <Text style={styles.resultHeading}>Route Alternatives</Text>
            <View style={styles.providerBadge}>
              <Text style={styles.providerBadgeText}>
                ENGINE: {routeResult.provider}
              </Text>
            </View>
          </View>

          {routeResult.routes.map((alt: RouteAlternative, idx: number) => {
            const isExpanded = expandedRouteId === alt.routeId;

            return (
              <View
                key={alt.routeId || `route-${idx}`}
                style={[styles.routeCard, alt.recommended && styles.recommendedRouteCard]}
              >
                {/* Recommended Badge */}
                {alt.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>
                      ⭐ RECOMMENDED ARTERIAL CORRIDOR
                    </Text>
                  </View>
                )}

                <Text style={styles.routeSummary}>{alt.summary}</Text>

                {/* Distance & Duration Pills */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Distance:</Text>
                    <Text style={styles.metricValue}>{alt.distanceFormatted}</Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Est. Time:</Text>
                    <Text style={styles.metricValue}>{alt.durationFormatted}</Text>
                  </View>
                </View>

                {/* Recommendation Reason */}
                <Text style={styles.reasonText}>💡 {alt.recommendationReason}</Text>

                {/* Safety Precautions */}
                {alt.safetyPrecautions && alt.safetyPrecautions.length > 0 && (
                  <View style={styles.precautionsBox}>
                    <Text style={styles.precautionsHeading}>Safety Precautions:</Text>
                    {alt.safetyPrecautions.map((prec, pIdx) => (
                      <Text key={`p-${pIdx}`} style={styles.precautionItem}>
                        • {prec}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Turn-by-Turn Steps Accordion */}
                {alt.steps && alt.steps.length > 0 && (
                  <View style={styles.stepsAccordionContainer}>
                    <TouchableOpacity
                      style={styles.stepsToggle}
                      onPress={() =>
                        setExpandedRouteId(isExpanded ? null : alt.routeId)
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.stepsToggleText}>
                        {isExpanded
                          ? `▲ Hide Turn Steps (${alt.steps.length})`
                          : `▼ View Turn Steps (${alt.steps.length})`}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.stepsList}>
                        {alt.steps.map((step, sIdx) => (
                          <View key={`step-${sIdx}`} style={styles.stepItem}>
                            <View style={styles.stepBullet}>
                              <Text style={styles.stepBulletText}>{sIdx + 1}</Text>
                            </View>
                            <View style={styles.stepContent}>
                              <Text style={styles.stepInstruction}>
                                {step.instruction}
                              </Text>
                              {step.safetyNote && (
                                <Text style={styles.stepSafetyNote}>
                                  ℹ️ {step.safetyNote}
                                </Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Open in Google Maps button */}
                {alt.googleMapsNavigationUrl ? (
                  <TouchableOpacity
                    style={styles.mapNavButton}
                    onPress={() => handleOpenGoogleMaps(alt.googleMapsNavigationUrl)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.mapNavButtonText}>
                      🗺️ Open in Google Maps Navigation
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}

          {/* Standard Disclaimer Card */}
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>Safety Data Integrity Disclaimer</Text>
            <Text style={styles.disclaimerBody}>{routeResult.disclaimer}</Text>
          </View>

          {/* Verified Emergency Helplines */}
          {routeResult.emergencyHelplines && (
            <View style={styles.helplinesCard}>
              <Text style={styles.helplinesCardTitle}>Emergency Helplines</Text>
              <View style={styles.helplineButtonsRow}>
                {Object.entries(routeResult.emergencyHelplines).map(([name, num]) => (
                  <TouchableOpacity
                    key={name}
                    style={styles.helplineDialButton}
                    onPress={() => handleCallHelpline(num)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.helplineDialName}>{name}</Text>
                    <Text style={styles.helplineDialNum}>📞 {num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  integrityBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  integrityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  originInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 48,
  },
  gpsButton: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  gpsStatusText: {
    fontSize: 11,
    color: '#0369A1',
    marginTop: 2,
    fontStyle: 'italic',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 44,
  },
  modeButtonSelected: {
    backgroundColor: '#E11D48',
    borderColor: '#BE123C',
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modeButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#E11D48',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButtonDisabled: {
    backgroundColor: '#FDA4AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resultsContainer: {
    gap: 14,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  providerBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  providerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
  },
  recommendedRouteCard: {
    borderColor: '#E11D48',
    borderWidth: 2,
    backgroundColor: '#FFFBFB',
  },
  recommendedBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  recommendedBadgeText: {
    color: '#9F1239',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeSummary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  precautionsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  precautionsHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  precautionItem: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  stepsAccordionContainer: {
    marginTop: 4,
  },
  stepsToggle: {
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  stepsToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  stepsList: {
    marginTop: 6,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  stepBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBulletText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepInstruction: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  stepSafetyNote: {
    fontSize: 11,
    color: '#0369A1',
    fontStyle: 'italic',
  },
  mapNavButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 4,
  },
  mapNavButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  disclaimerCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  disclaimerBody: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  helplinesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  helplinesCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  helplineButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helplineDialButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  helplineDialName: {
    fontSize: 10,
    color: '#991B1B',
    fontWeight: '600',
  },
  helplineDialNum: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '800',
    marginTop: 1,
  },
});
