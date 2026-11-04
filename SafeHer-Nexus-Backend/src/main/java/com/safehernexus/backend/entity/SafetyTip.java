package com.safehernexus.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(
        name = "safety_tips",
        indexes = {
                @Index(name = "idx_safety_tips_category", columnList = "category"),
                @Index(name = "idx_safety_tips_helpline", columnList = "helpline")
        }
)
public class SafetyTip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 40)
    private SafetyCategory category;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "content", nullable = false, length = 1000)
    private String content;

    @Column(name = "emergency_number", length = 25)
    private String emergencyNumber;

    @Column(name = "helpline", nullable = false)
    private boolean helpline = false;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public SafetyTip() {
    }

    public SafetyTip(
            SafetyCategory category,
            String title,
            String content,
            String emergencyNumber,
            boolean helpline,
            int displayOrder
    ) {
        this.category = category;
        this.title = title;
        this.content = content;
        this.emergencyNumber = emergencyNumber;
        this.helpline = helpline;
        this.displayOrder = displayOrder;
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public SafetyCategory getCategory() {
        return category;
    }

    public void setCategory(SafetyCategory category) {
        this.category = category;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getEmergencyNumber() {
        return emergencyNumber;
    }

    public void setEmergencyNumber(String emergencyNumber) {
        this.emergencyNumber = emergencyNumber;
    }

    public boolean isHelpline() {
        return helpline;
    }

    public void setHelpline(boolean helpline) {
        this.helpline = helpline;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public String toString() {
        return "SafetyTip{" +
                "id=" + id +
                ", category=" + category +
                ", title='" + title + '\'' +
                ", helpline=" + helpline +
                ", displayOrder=" + displayOrder +
                '}';
    }
}
