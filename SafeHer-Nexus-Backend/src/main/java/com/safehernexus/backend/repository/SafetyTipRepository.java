package com.safehernexus.backend.repository;

import com.safehernexus.backend.entity.SafetyCategory;
import com.safehernexus.backend.entity.SafetyTip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SafetyTipRepository extends JpaRepository<SafetyTip, Long> {

    List<SafetyTip> findAllByOrderByDisplayOrderAscIdAsc();

    List<SafetyTip> findAllByCategoryOrderByDisplayOrderAscIdAsc(SafetyCategory category);

    List<SafetyTip> findAllByHelplineTrueOrderByDisplayOrderAscIdAsc();
}
