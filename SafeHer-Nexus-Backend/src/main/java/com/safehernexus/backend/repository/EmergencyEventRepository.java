package com.safehernexus.backend.repository;

import com.safehernexus.backend.entity.EmergencyEvent;
import com.safehernexus.backend.entity.EmergencyEventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmergencyEventRepository extends JpaRepository<EmergencyEvent, Long> {

    Page<EmergencyEvent> findAllByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

    Optional<EmergencyEvent> findByIdAndUserId(Long id, Long userId);

    Optional<EmergencyEvent> findFirstByUserIdAndStatusOrderByCreatedAtDescIdDesc(
            Long userId,
            EmergencyEventStatus status
    );

    boolean existsByUserIdAndStatus(Long userId, EmergencyEventStatus status);
}
