package com.safehernexus.backend.service;

import com.safehernexus.backend.dto.safety.SafetyTipResponseDto;
import com.safehernexus.backend.entity.SafetyCategory;
import com.safehernexus.backend.entity.SafetyTip;
import com.safehernexus.backend.exception.ResourceNotFoundException;
import com.safehernexus.backend.repository.SafetyTipRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SafetyTipService {

    private final SafetyTipRepository safetyTipRepository;

    public SafetyTipService(SafetyTipRepository safetyTipRepository) {
        this.safetyTipRepository = safetyTipRepository;
    }

    @PostConstruct
    public void initDefaultTipsIfEmpty() {
        if (safetyTipRepository.count() == 0) {
            seedDefaultSafetyGuidance();
        }
    }

    @Transactional(readOnly = true)
    public List<SafetyTipResponseDto> getSafetyTips(SafetyCategory category) {
        List<SafetyTip> tips;
        if (category == null || category == SafetyCategory.ALL) {
            tips = safetyTipRepository.findAllByOrderByDisplayOrderAscIdAsc();
        } else {
            tips = safetyTipRepository.findAllByCategoryOrderByDisplayOrderAscIdAsc(category);
        }
        return tips.stream().map(SafetyTipResponseDto::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<SafetyTipResponseDto> getHelplines() {
        return safetyTipRepository
                .findAllByHelplineTrueOrderByDisplayOrderAscIdAsc()
                .stream()
                .map(SafetyTipResponseDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public SafetyTipResponseDto getSafetyTipById(Long id) {
        return safetyTipRepository.findById(id)
                .map(SafetyTipResponseDto::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("Safety tip not found with id: " + id));
    }

    @Transactional
    public void seedDefaultSafetyGuidance() {
        List<SafetyTip> defaultGuidance = List.of(
                // Verified Official National Helplines (India)
                new SafetyTip(
                        SafetyCategory.HELPLINES,
                        "National Emergency Number",
                        "Single unified emergency number for Police, Fire, and Medical assistance across India.",
                        "112",
                        true,
                        1
                ),
                new SafetyTip(
                        SafetyCategory.HELPLINES,
                        "Women Helpline (All India)",
                        "24x7 dedicated emergency response helpline for women in distress.",
                        "1091",
                        true,
                        2
                ),
                new SafetyTip(
                        SafetyCategory.HELPLINES,
                        "Women Helpline (Domestic Abuse)",
                        "National commission helpline providing counseling and emergency shelter assistance.",
                        "181",
                        true,
                        3
                ),
                new SafetyTip(
                        SafetyCategory.HELPLINES,
                        "Women Power Line (Anti-Harassment)",
                        "Confidential reporting helpline for harassment, stalking, and unsolicited calls.",
                        "1090",
                        true,
                        4
                ),
                new SafetyTip(
                        SafetyCategory.HELPLINES,
                        "National Cyber Crime Helpline",
                        "Official reporting helpline for online harassment, stalking, and cyber fraud.",
                        "1930",
                        true,
                        5
                ),

                // Travel & Ride-Share Guidance
                new SafetyTip(
                        SafetyCategory.TRAVEL,
                        "Verify Driver & License Plate Before Boarding",
                        "Always match the car's registration plate, driver photo, and car model with the ride-sharing app before entering. Never get into a car where details differ.",
                        null,
                        false,
                        10
                ),
                new SafetyTip(
                        SafetyCategory.TRAVEL,
                        "Share Ride Status & Track Route",
                        "Share your live ride status with a trusted contact. Keep your mobile GPS enabled and observe if the vehicle deviates from standard routes.",
                        null,
                        false,
                        11
                ),
                new SafetyTip(
                        SafetyCategory.TRAVEL,
                        "Sit in the Rear Seat",
                        "Sitting in the rear right or left seat creates physical distance, gives visibility of both sides, and allows exiting from either door in an emergency.",
                        null,
                        false,
                        12
                ),

                // Commute Safety
                new SafetyTip(
                        SafetyCategory.COMMUTE,
                        "Wait in Well-Lit, Populated Zones",
                        "At bus stops, metro stations, or railway platforms, choose well-lit areas near ticket booths, CCTV cameras, or official security personnel.",
                        null,
                        false,
                        20
                ),
                new SafetyTip(
                        SafetyCategory.COMMUTE,
                        "Keep One Ear Free from Headphones",
                        "Avoid wearing noise-canceling headphones over both ears during street walks or transit commutes so you stay alert to approaching vehicles or footsteps.",
                        null,
                        false,
                        21
                ),

                // Night Safety
                new SafetyTip(
                        SafetyCategory.NIGHT_SAFETY,
                        "Walk with Purpose and Awareness",
                        "Keep your head up, maintain steady eye contact with surroundings, and walk with confident body language. Avoid looking down at your screen continuously.",
                        null,
                        false,
                        30
                ),
                new SafetyTip(
                        SafetyCategory.NIGHT_SAFETY,
                        "Have Keys & Safety App Ready",
                        "Have your house or car keys in hand before reaching your doorstep or vehicle. Keep SafeHer Nexus on quick standby.",
                        null,
                        false,
                        31
                ),

                // Digital Safety
                new SafetyTip(
                        SafetyCategory.DIGITAL,
                        "Limit Real-Time Location on Social Media",
                        "Avoid tagging exact current locations or sharing daily route routines publicly on social media. Share check-ins after leaving a venue.",
                        null,
                        false,
                        40
                ),
                new SafetyTip(
                        SafetyCategory.DIGITAL,
                        "Lock Device & Secure Screen Previews",
                        "Disable sensitive lock-screen notifications and set up biometric or secure PIN protection on your phone to protect trusted contacts and personal data.",
                        null,
                        false,
                        41
                )
        );

        safetyTipRepository.saveAll(defaultGuidance);
    }
}
