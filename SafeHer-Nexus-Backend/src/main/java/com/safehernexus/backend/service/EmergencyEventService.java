package com.safehernexus.backend.service;

import com.safehernexus.backend.dto.common.PagedResponseDto;
import com.safehernexus.backend.dto.event.CreateSosEventRequestDto;
import com.safehernexus.backend.dto.event.EmergencyEventLocationResponseDto;
import com.safehernexus.backend.dto.event.EmergencyEventResponseDto;
import com.safehernexus.backend.dto.event.EmergencyNotificationResponseDto;
import com.safehernexus.backend.dto.event.RecordLocationUpdateRequestDto;
import com.safehernexus.backend.dto.event.ResolveEmergencyEventRequestDto;
import com.safehernexus.backend.entity.EmergencyContact;
import com.safehernexus.backend.entity.EmergencyEvent;
import com.safehernexus.backend.entity.EmergencyEventLocation;
import com.safehernexus.backend.entity.EmergencyEventStatus;
import com.safehernexus.backend.entity.EmergencyEventType;
import com.safehernexus.backend.entity.EmergencyNotification;
import com.safehernexus.backend.entity.NotificationDeliveryStatus;
import com.safehernexus.backend.entity.User;
import com.safehernexus.backend.exception.BusinessRuleViolationException;
import com.safehernexus.backend.exception.DuplicateResourceException;
import com.safehernexus.backend.exception.ResourceNotFoundException;
import com.safehernexus.backend.repository.EmergencyContactRepository;
import com.safehernexus.backend.repository.EmergencyEventLocationRepository;
import com.safehernexus.backend.repository.EmergencyEventRepository;
import com.safehernexus.backend.repository.EmergencyNotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class EmergencyEventService {

    private static final Logger log = LoggerFactory.getLogger(EmergencyEventService.class);

    public static final int DEFAULT_PAGE_SIZE = 10;
    public static final int MAX_PAGE_SIZE = 50;

    private final EmergencyEventRepository emergencyEventRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final EmergencyEventLocationRepository emergencyEventLocationRepository;
    private final EmergencyNotificationRepository emergencyNotificationRepository;
    private final UserProfileService userProfileService;
    private final TwilioSmsService twilioSmsService;

    public EmergencyEventService(
            EmergencyEventRepository emergencyEventRepository,
            EmergencyContactRepository emergencyContactRepository,
            EmergencyEventLocationRepository emergencyEventLocationRepository,
            EmergencyNotificationRepository emergencyNotificationRepository,
            UserProfileService userProfileService,
            TwilioSmsService twilioSmsService
    ) {
        this.emergencyEventRepository = emergencyEventRepository;
        this.emergencyContactRepository = emergencyContactRepository;
        this.emergencyEventLocationRepository = emergencyEventLocationRepository;
        this.emergencyNotificationRepository = emergencyNotificationRepository;
        this.userProfileService = userProfileService;
        this.twilioSmsService = twilioSmsService;
    }

    @Transactional
    public EmergencyEventResponseDto createSosEvent(
            String authenticatedEmail,
            CreateSosEventRequestDto request
    ) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);

        if (emergencyEventRepository.existsByUserIdAndStatus(
                currentUser.getId(),
                EmergencyEventStatus.ACTIVE
        )) {
            throw new DuplicateResourceException(
                    "An active SOS emergency event is already in progress. Resolve the current event before triggering a new one."
            );
        }

        CreateSosEventRequestDto safeReq = request != null
                ? request
                : new CreateSosEventRequestDto(null, null, null, null, null, null);

        Double lat = safeReq.latitude();
        Double lon = safeReq.longitude();

        if ((lat != null && lon == null) || (lat == null && lon != null)) {
            throw new BusinessRuleViolationException(
                    "Both latitude and longitude must be provided together when attaching location"
            );
        }

        boolean hasCoordinates = (lat != null && lon != null);
        if (hasCoordinates) {
            if (!Double.isFinite(lat) || lat < -90.0 || lat > 90.0) {
                throw new BusinessRuleViolationException("Latitude must be a valid number between -90.0 and 90.0");
            }
            if (!Double.isFinite(lon) || lon < -180.0 || lon > 180.0) {
                throw new BusinessRuleViolationException("Longitude must be a valid number between -180.0 and 180.0");
            }
            if (safeReq.locationAccuracyMeters() != null
                    && (!Double.isFinite(safeReq.locationAccuracyMeters()) || safeReq.locationAccuracyMeters() < 0.0)) {
                throw new BusinessRuleViolationException("Location accuracy must be 0 or greater");
            }
        }

        Instant now = Instant.now();
        EmergencyEvent event = new EmergencyEvent();
        event.setUser(currentUser);
        event.setEventType(EmergencyEventType.SOS_ALERT);
        event.setStatus(EmergencyEventStatus.ACTIVE);
        event.setNotificationStatus(NotificationDeliveryStatus.NOT_CONFIGURED);
        event.setCreatedAt(now);

        if (hasCoordinates) {
            event.setLocationAttached(true);
            event.setInitialLatitude(lat);
            event.setInitialLongitude(lon);
            event.setLocationAccuracyMeters(safeReq.locationAccuracyMeters());
            event.setLocationCapturedAt(
                    safeReq.locationCapturedAt() != null ? safeReq.locationCapturedAt() : now
            );
        } else {
            event.setLocationAttached(false);
        }

        if (safeReq.locationLabel() != null && !safeReq.locationLabel().isBlank()) {
            event.setLocationLabel(safeReq.locationLabel().trim());
        }
        if (safeReq.notes() != null && !safeReq.notes().isBlank()) {
            event.setNotes(safeReq.notes().trim());
        }

        EmergencyEvent saved = emergencyEventRepository.save(event);

        // Store initial location breadcrumb if coordinates are attached
        if (hasCoordinates) {
            EmergencyEventLocation initialPoint = new EmergencyEventLocation(
                    saved,
                    lat,
                    lon,
                    safeReq.locationAccuracyMeters(),
                    null,
                    null,
                    null,
                    saved.getLocationCapturedAt()
            );
            emergencyEventLocationRepository.save(initialPoint);
        }

        // Dispatch emergency notifications to trusted contacts
        dispatchEmergencyNotifications(saved, currentUser);

        return buildResponseDto(saved);
    }

    private void dispatchEmergencyNotifications(EmergencyEvent event, User user) {
        List<EmergencyContact> contacts = emergencyContactRepository
                .findAllByUserIdOrderByPrimaryContactDescCreatedAtAsc(user.getId());

        if (contacts.isEmpty()) {
            log.info("No emergency contacts registered for user {}. Notification status NOT_CONFIGURED.", user.getEmail());
            event.setNotificationStatus(NotificationDeliveryStatus.NOT_CONFIGURED);
            emergencyEventRepository.save(event);
            return;
        }

        String locationSegment;
        if (event.isLocationAttached() && event.getInitialLatitude() != null && event.getInitialLongitude() != null) {
            locationSegment = " Location: https://maps.google.com/?q="
                    + event.getInitialLatitude() + "," + event.getInitialLongitude();
            if (event.getLocationAccuracyMeters() != null) {
                locationSegment += " (+/-" + Math.round(event.getLocationAccuracyMeters()) + "m)";
            }
        } else {
            locationSegment = " Location: Not available (offline or denied)";
        }

        String notesSegment = (event.getNotes() != null && !event.getNotes().isBlank())
                ? " Note: " + event.getNotes()
                : "";

        String messageBody = "EMERGENCY ALERT: " + user.getName()
                + " triggered an SOS on SafeHer Nexus!"
                + locationSegment
                + notesSegment
                + " Please check on them immediately.";

        NotificationDeliveryStatus aggregateStatus = NotificationDeliveryStatus.NOT_CONFIGURED;

        for (EmergencyContact contact : contacts) {
            String phone = contact.getPhoneNumber();

            // Idempotency check: don't duplicate notifications if already queued or sent
            boolean alreadyDispatched = emergencyNotificationRepository
                    .existsByEmergencyEventIdAndRecipientPhoneAndStatusIn(
                            event.getId(),
                            phone,
                            List.of(
                                    NotificationDeliveryStatus.QUEUED,
                                    NotificationDeliveryStatus.SENT,
                                    NotificationDeliveryStatus.DELIVERED
                            )
                    );

            if (alreadyDispatched) {
                continue;
            }

            TwilioSmsService.SmsDispatchResult result = twilioSmsService.sendSms(phone, messageBody);

            EmergencyNotification notif = new EmergencyNotification(
                    event,
                    contact,
                    phone,
                    contact.getName(),
                    messageBody,
                    result.status()
            );
            notif.setProviderMessageId(result.providerMessageId());
            notif.setErrorMessage(result.errorMessage());

            if (result.status() == NotificationDeliveryStatus.SENT
                    || result.status() == NotificationDeliveryStatus.DELIVERED) {
                notif.setSentAt(Instant.now());
            }
            if (result.status() == NotificationDeliveryStatus.DELIVERED) {
                notif.setDeliveredAt(Instant.now());
            }

            emergencyNotificationRepository.save(notif);

            aggregateStatus = resolveAggregateStatus(aggregateStatus, result.status());
        }

        event.setNotificationStatus(aggregateStatus);
        emergencyEventRepository.save(event);
    }

    private NotificationDeliveryStatus resolveAggregateStatus(
            NotificationDeliveryStatus current,
            NotificationDeliveryStatus latest
    ) {
        if (current == NotificationDeliveryStatus.DELIVERED || latest == NotificationDeliveryStatus.DELIVERED) {
            return NotificationDeliveryStatus.DELIVERED;
        }
        if (current == NotificationDeliveryStatus.SENT || latest == NotificationDeliveryStatus.SENT) {
            return NotificationDeliveryStatus.SENT;
        }
        if (current == NotificationDeliveryStatus.QUEUED || latest == NotificationDeliveryStatus.QUEUED) {
            return NotificationDeliveryStatus.QUEUED;
        }
        if (latest == NotificationDeliveryStatus.FAILED && current == NotificationDeliveryStatus.NOT_CONFIGURED) {
            return NotificationDeliveryStatus.FAILED;
        }
        return latest;
    }

    @Transactional
    public EmergencyEventLocationResponseDto recordLocationUpdate(
            String authenticatedEmail,
            Long eventId,
            RecordLocationUpdateRequestDto request
    ) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);

        EmergencyEvent event = emergencyEventRepository
                .findByIdAndUserId(eventId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Emergency event not found"));

        if (event.getStatus() != EmergencyEventStatus.ACTIVE) {
            throw new BusinessRuleViolationException(
                    "Location updates can only be recorded for an active emergency event (current status: "
                            + event.getStatus() + ")"
            );
        }

        if (request == null) {
            throw new BusinessRuleViolationException("Location update request payload is required");
        }

        Double lat = request.latitude();
        Double lon = request.longitude();

        if (lat == null || lon == null || !Double.isFinite(lat) || !Double.isFinite(lon)
                || lat < -90.0 || lat > 90.0 || lon < -180.0 || lon > 180.0) {
            throw new BusinessRuleViolationException("Valid latitude (-90 to 90) and longitude (-180 to 180) are required");
        }

        if (request.accuracyMeters() != null
                && (!Double.isFinite(request.accuracyMeters()) || request.accuracyMeters() < 0.0)) {
            throw new BusinessRuleViolationException("Accuracy must be 0 or greater");
        }

        Instant recordedAt = request.recordedAt() != null ? request.recordedAt() : Instant.now();

        EmergencyEventLocation location = new EmergencyEventLocation(
                event,
                lat,
                lon,
                request.accuracyMeters(),
                request.altitudeMeters(),
                request.speedMps(),
                request.headingDegrees(),
                recordedAt
        );

        EmergencyEventLocation savedLoc = emergencyEventLocationRepository.save(location);

        // Keep event initial coordinate snapshot populated if it wasn't available at creation time
        if (!event.isLocationAttached()) {
            event.setLocationAttached(true);
            event.setInitialLatitude(lat);
            event.setInitialLongitude(lon);
            event.setLocationAccuracyMeters(request.accuracyMeters());
            event.setLocationCapturedAt(recordedAt);
            emergencyEventRepository.save(event);
        }

        return EmergencyEventLocationResponseDto.fromEntity(savedLoc);
    }

    @Transactional(readOnly = true)
    public List<EmergencyEventLocationResponseDto> getEventLocations(
            String authenticatedEmail,
            Long eventId
    ) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);

        // Verify event ownership
        emergencyEventRepository
                .findByIdAndUserId(eventId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Emergency event not found"));

        return emergencyEventLocationRepository
                .findAllByEmergencyEventIdOrderByRecordedAtDesc(eventId)
                .stream()
                .map(EmergencyEventLocationResponseDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EmergencyNotificationResponseDto> getEventNotifications(
            String authenticatedEmail,
            Long eventId
    ) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);

        // Verify event ownership
        emergencyEventRepository
                .findByIdAndUserId(eventId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Emergency event not found"));

        return emergencyNotificationRepository
                .findAllByEmergencyEventIdOrderByCreatedAtAsc(eventId)
                .stream()
                .map(EmergencyNotificationResponseDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<EmergencyEventResponseDto> getMyActiveEvent(String authenticatedEmail) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);
        return emergencyEventRepository
                .findFirstByUserIdAndStatusOrderByCreatedAtDescIdDesc(
                        currentUser.getId(),
                        EmergencyEventStatus.ACTIVE
                )
                .map(this::buildResponseDto);
    }

    @Transactional
    public EmergencyEventResponseDto resolveMyEvent(
            String authenticatedEmail,
            Long eventId,
            ResolveEmergencyEventRequestDto request
    ) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);

        EmergencyEvent event = emergencyEventRepository
                .findByIdAndUserId(eventId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Emergency event not found"));

        if (event.getStatus() != EmergencyEventStatus.ACTIVE) {
            throw new BusinessRuleViolationException(
                    "Only an active emergency event can be resolved (current status: " + event.getStatus() + ")"
            );
        }

        event.setStatus(EmergencyEventStatus.RESOLVED);
        event.setResolvedAt(Instant.now());

        if (request != null && request.resolutionNotes() != null && !request.resolutionNotes().isBlank()) {
            String trimmedResolution = request.resolutionNotes().trim();
            if (event.getNotes() == null || event.getNotes().isBlank()) {
                event.setNotes(trimmedResolution);
            } else {
                String combined = event.getNotes() + " | Resolved: " + trimmedResolution;
                event.setNotes(combined.length() > 255 ? combined.substring(0, 255) : combined);
            }
        }

        EmergencyEvent saved = emergencyEventRepository.save(event);
        return buildResponseDto(saved);
    }

    @Transactional(readOnly = true)
    public PagedResponseDto<EmergencyEventResponseDto> listMyEvents(
            String authenticatedEmail,
            int page,
            int size
    ) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);

        int safePage = Math.max(0, page);
        int safeSize = (size <= 0) ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<EmergencyEvent> eventsPage = emergencyEventRepository
                .findAllByUserIdOrderByCreatedAtDescIdDesc(currentUser.getId(), pageable);

        return PagedResponseDto.fromPage(eventsPage, this::buildResponseDto);
    }

    @Transactional(readOnly = true)
    public EmergencyEventResponseDto getMyEventById(String authenticatedEmail, Long eventId) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);

        EmergencyEvent event = emergencyEventRepository
                .findByIdAndUserId(eventId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Emergency event not found"));

        return buildResponseDto(event);
    }

    @Transactional
    public void handleTwilioDeliveryCallback(String messageSid, String messageStatus, String errorMessage) {
        if (messageSid == null || messageSid.isBlank()) {
            return;
        }

        Optional<EmergencyNotification> optNotif = emergencyNotificationRepository.findByProviderMessageId(messageSid);
        if (optNotif.isEmpty()) {
            return;
        }

        EmergencyNotification notif = optNotif.get();
        String normalizedStatus = messageStatus != null ? messageStatus.toLowerCase() : "";

        NotificationDeliveryStatus newStatus = switch (normalizedStatus) {
            case "delivered" -> NotificationDeliveryStatus.DELIVERED;
            case "sent" -> NotificationDeliveryStatus.SENT;
            case "failed", "undelivered" -> NotificationDeliveryStatus.FAILED;
            default -> notif.getStatus();
        };

        notif.setStatus(newStatus);
        if (newStatus == NotificationDeliveryStatus.DELIVERED) {
            notif.setDeliveredAt(Instant.now());
        }
        if (errorMessage != null && !errorMessage.isBlank()) {
            notif.setErrorMessage(errorMessage);
        }

        emergencyNotificationRepository.save(notif);

        // Update event aggregate status
        EmergencyEvent event = notif.getEmergencyEvent();
        if (event != null) {
            List<EmergencyNotification> allNotifs = emergencyNotificationRepository
                    .findAllByEmergencyEventIdOrderByCreatedAtAsc(event.getId());

            NotificationDeliveryStatus aggregate = NotificationDeliveryStatus.NOT_CONFIGURED;
            for (EmergencyNotification n : allNotifs) {
                aggregate = resolveAggregateStatus(aggregate, n.getStatus());
            }
            event.setNotificationStatus(aggregate);
            emergencyEventRepository.save(event);
        }
    }

    private EmergencyEventResponseDto buildResponseDto(EmergencyEvent event) {
        long locationCount = emergencyEventLocationRepository.countByEmergencyEventId(event.getId());
        EmergencyEventLocation latestLoc = emergencyEventLocationRepository
                .findFirstByEmergencyEventIdOrderByRecordedAtDesc(event.getId())
                .orElse(null);
        List<EmergencyNotification> notifs = emergencyNotificationRepository
                .findAllByEmergencyEventIdOrderByCreatedAtAsc(event.getId());

        return EmergencyEventResponseDto.fromEntity(event, locationCount, latestLoc, notifs);
    }
}
