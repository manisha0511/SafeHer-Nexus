package com.safehernexus.backend.repository;

import com.safehernexus.backend.entity.EmergencyEventLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyEventLocationRepository extends JpaRepository<EmergencyEventLocation, Long> {

    List<EmergencyEventLocation> findAllByEmergencyEventIdOrderByRecordedAtDesc(Long emergencyEventId);

    Optional<EmergencyEventLocation> findFirstByEmergencyEventIdOrderByRecordedAtDesc(Long emergencyEventId);

    long countByEmergencyEventId(Long emergencyEventId);
}
