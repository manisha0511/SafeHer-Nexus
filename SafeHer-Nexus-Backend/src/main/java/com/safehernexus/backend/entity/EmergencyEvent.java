package com.safehernexus.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(
        name = "emergency_events",
        indexes = {
                @Index(name = "idx_emergency_events_user_created", columnList = "user_id, created_at"),
                @Index(name = "idx_emergency_events_user_status", columnList = "user_id, status")
        }
)
public class EmergencyEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private EmergencyEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private EmergencyEventStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_status", nullable = false, length = 30)
    private NotificationDeliveryStatus notificationStatus = NotificationDeliveryStatus.NOT_CONFIGURED;

    @Column(name = "location_attached", nullable = false)
    private boolean locationAttached = false;

    @Column(name = "initial_latitude")
    private Double initialLatitude;

    @Column(name = "initial_longitude")
    private Double initialLongitude;

    @Column(name = "location_accuracy_meters")
    private Double locationAccuracyMeters;

    @Column(name = "location_captured_at")
    private Instant locationCapturedAt;

    @Column(name = "location_label", length = 160)
    private String locationLabel;

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    public EmergencyEvent() {
    }

    public EmergencyEvent(
            User user,
            EmergencyEventType eventType,
            EmergencyEventStatus status,
            String locationLabel,
            String notes,
            Instant createdAt,
            Instant resolvedAt
    ) {
        this.user = user;
        this.eventType = eventType;
        this.status = status;
        this.locationLabel = locationLabel;
        this.notes = notes;
        this.createdAt = createdAt;
        this.resolvedAt = resolvedAt;
        this.notificationStatus = NotificationDeliveryStatus.NOT_CONFIGURED;
        this.locationAttached = false;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
        if (this.notificationStatus == null) {
            this.notificationStatus = NotificationDeliveryStatus.NOT_CONFIGURED;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public EmergencyEventType getEventType() {
        return eventType;
    }

    public void setEventType(EmergencyEventType eventType) {
        this.eventType = eventType;
    }

    public EmergencyEventStatus getStatus() {
        return status;
    }

    public void setStatus(EmergencyEventStatus status) {
        this.status = status;
    }

    public NotificationDeliveryStatus getNotificationStatus() {
        return notificationStatus;
    }

    public void setNotificationStatus(NotificationDeliveryStatus notificationStatus) {
        this.notificationStatus = notificationStatus;
    }

    public boolean isLocationAttached() {
        return locationAttached;
    }

    public void setLocationAttached(boolean locationAttached) {
        this.locationAttached = locationAttached;
    }

    public Double getInitialLatitude() {
        return initialLatitude;
    }

    public void setInitialLatitude(Double initialLatitude) {
        this.initialLatitude = initialLatitude;
    }

    public Double getInitialLongitude() {
        return initialLongitude;
    }

    public void setInitialLongitude(Double initialLongitude) {
        this.initialLongitude = initialLongitude;
    }

    public Double getLocationAccuracyMeters() {
        return locationAccuracyMeters;
    }

    public void setLocationAccuracyMeters(Double locationAccuracyMeters) {
        this.locationAccuracyMeters = locationAccuracyMeters;
    }

    public Instant getLocationCapturedAt() {
        return locationCapturedAt;
    }

    public void setLocationCapturedAt(Instant locationCapturedAt) {
        this.locationCapturedAt = locationCapturedAt;
    }

    public String getLocationLabel() {
        return locationLabel;
    }

    public void setLocationLabel(String locationLabel) {
        this.locationLabel = locationLabel;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    @Override
    public String toString() {
        return "EmergencyEvent{" +
                "id=" + id +
                ", eventType=" + eventType +
                ", status=" + status +
                ", notificationStatus=" + notificationStatus +
                ", locationAttached=" + locationAttached +
                '}';
    }
}
