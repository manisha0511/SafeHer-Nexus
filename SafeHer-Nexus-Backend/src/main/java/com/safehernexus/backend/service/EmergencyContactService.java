package com.safehernexus.backend.service;

import com.safehernexus.backend.dto.contact.EmergencyContactRequestDto;
import com.safehernexus.backend.dto.contact.EmergencyContactResponseDto;
import com.safehernexus.backend.entity.EmergencyContact;
import com.safehernexus.backend.entity.User;
import com.safehernexus.backend.exception.BusinessRuleViolationException;
import com.safehernexus.backend.exception.DuplicateResourceException;
import com.safehernexus.backend.exception.ResourceNotFoundException;
import com.safehernexus.backend.repository.EmergencyContactRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class EmergencyContactService {

    public static final int MAX_CONTACTS_PER_USER = 5;

    private final EmergencyContactRepository emergencyContactRepository;
    private final UserProfileService userProfileService;

    public EmergencyContactService(
            EmergencyContactRepository emergencyContactRepository,
            UserProfileService userProfileService
    ) {
        this.emergencyContactRepository = emergencyContactRepository;
        this.userProfileService = userProfileService;
    }

    @Transactional(readOnly = true)
    public List<EmergencyContactResponseDto> listMyContacts(String authenticatedEmail) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);
        return emergencyContactRepository
                .findAllByUserIdOrderByPrimaryContactDescCreatedAtAsc(currentUser.getId())
                .stream()
                .map(EmergencyContactResponseDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public EmergencyContactResponseDto getMyContactById(String authenticatedEmail, Long contactId) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);
        EmergencyContact contact = emergencyContactRepository
                .findByIdAndUserId(contactId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Trusted emergency contact not found"));
        return EmergencyContactResponseDto.fromEntity(contact);
    }

    @Transactional
    public EmergencyContactResponseDto createContact(
            String authenticatedEmail,
            EmergencyContactRequestDto request
    ) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);
        List<EmergencyContact> existingContacts = emergencyContactRepository
                .findAllByUserIdOrderByPrimaryContactDescCreatedAtAsc(currentUser.getId());

        if (existingContacts.size() >= MAX_CONTACTS_PER_USER) {
            throw new BusinessRuleViolationException(
                    "Maximum limit of " + MAX_CONTACTS_PER_USER + " trusted emergency contacts reached"
            );
        }

        String trimmedPhone = request.phoneNumber().trim();
        String normalizedEmail = normalizeOptionalEmail(request.email());

        checkForDuplicateContact(existingContacts, trimmedPhone, normalizedEmail, null);

        boolean isPrimary = Boolean.TRUE.equals(request.primaryContact());
        if (isPrimary) {
            clearExistingPrimaryFlags(existingContacts, null);
        }

        EmergencyContact newContact = new EmergencyContact(
                currentUser,
                request.name().trim(),
                trimmedPhone,
                request.relationship().trim(),
                normalizedEmail,
                isPrimary
        );

        EmergencyContact saved = emergencyContactRepository.save(newContact);
        return EmergencyContactResponseDto.fromEntity(saved);
    }

    @Transactional
    public EmergencyContactResponseDto updateContact(
            String authenticatedEmail,
            Long contactId,
            EmergencyContactRequestDto request
    ) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);

        EmergencyContact contact = emergencyContactRepository
                .findByIdAndUserId(contactId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Trusted emergency contact not found"));

        List<EmergencyContact> existingContacts = emergencyContactRepository
                .findAllByUserIdOrderByPrimaryContactDescCreatedAtAsc(currentUser.getId());

        String trimmedPhone = request.phoneNumber().trim();
        String normalizedEmail = normalizeOptionalEmail(request.email());

        checkForDuplicateContact(existingContacts, trimmedPhone, normalizedEmail, contactId);

        boolean isPrimary = Boolean.TRUE.equals(request.primaryContact());
        if (isPrimary) {
            clearExistingPrimaryFlags(existingContacts, contactId);
        }

        contact.setName(request.name().trim());
        contact.setPhoneNumber(trimmedPhone);
        contact.setRelationship(request.relationship().trim());
        contact.setEmail(normalizedEmail);
        contact.setPrimaryContact(isPrimary);

        EmergencyContact updated = emergencyContactRepository.save(contact);
        return EmergencyContactResponseDto.fromEntity(updated);
    }

    @Transactional
    public void deleteContact(String authenticatedEmail, Long contactId) {
        User currentUser = userProfileService.getAuthenticatedUserEntity(authenticatedEmail);

        EmergencyContact contact = emergencyContactRepository
                .findByIdAndUserId(contactId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Trusted emergency contact not found"));

        emergencyContactRepository.delete(contact);
    }

    private void checkForDuplicateContact(
            List<EmergencyContact> existingContacts,
            String candidatePhone,
            String candidateEmail,
            Long excludeContactId
    ) {
        String canonicalCandidatePhone = canonicalizePhone(candidatePhone);

        for (EmergencyContact existing : existingContacts) {
            if (excludeContactId != null && excludeContactId.equals(existing.getId())) {
                continue;
            }
            if (canonicalizePhone(existing.getPhoneNumber()).equals(canonicalCandidatePhone)) {
                throw new DuplicateResourceException(
                        "A trusted contact with this phone number already exists"
                );
            }
            if (candidateEmail != null
                    && existing.getEmail() != null
                    && existing.getEmail().equalsIgnoreCase(candidateEmail)) {
                throw new DuplicateResourceException(
                        "A trusted contact with this email address already exists"
                );
            }
        }
    }

    private void clearExistingPrimaryFlags(List<EmergencyContact> contacts, Long excludeContactId) {
        for (EmergencyContact contact : contacts) {
            if (excludeContactId != null && excludeContactId.equals(contact.getId())) {
                continue;
            }
            if (contact.isPrimaryContact()) {
                contact.setPrimaryContact(false);
                emergencyContactRepository.save(contact);
            }
        }
    }

    private String normalizeOptionalEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String canonicalizePhone(String phone) {
        if (phone == null) {
            return "";
        }
        return phone.replaceAll("[\\s\\-()]", "");
    }
}
