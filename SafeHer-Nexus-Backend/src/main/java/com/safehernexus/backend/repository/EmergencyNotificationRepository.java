package com.safehernexus.backend.repository;

import com.safehernexus.backend.entity.EmergencyNotification;
import com.safehernexus.backend.entity.NotificationDeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyNotificationRepository extends JpaRepository<EmergencyNotification, Long> {

    List<EmergencyNotification> findAllByEmergencyEventIdOrderByCreatedAtAsc(Long emergencyEventId);

    Optional<EmergencyNotification> findByProviderMessageId(String providerMessageId);

    boolean existsByEmergencyEventIdAndRecipientPhoneAndStatusIn(
            Long emergencyEventId,
            String recipientPhone,
            Collection<NotificationDeliveryStatus> statuses
    );
}
