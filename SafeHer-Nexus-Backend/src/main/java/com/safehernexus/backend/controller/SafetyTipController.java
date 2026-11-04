package com.safehernexus.backend.controller;

import com.safehernexus.backend.dto.safety.SafetyTipResponseDto;
import com.safehernexus.backend.entity.SafetyCategory;
import com.safehernexus.backend.service.SafetyTipService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/safety-tips")
public class SafetyTipController {

    private final SafetyTipService safetyTipService;

    public SafetyTipController(SafetyTipService safetyTipService) {
        this.safetyTipService = safetyTipService;
    }

    @GetMapping
    public ResponseEntity<List<SafetyTipResponseDto>> getSafetyTips(
            @RequestParam(name = "category", required = false) SafetyCategory category
    ) {
        return ResponseEntity.ok(safetyTipService.getSafetyTips(category));
    }

    @GetMapping("/helplines")
    public ResponseEntity<List<SafetyTipResponseDto>> getHelplines() {
        return ResponseEntity.ok(safetyTipService.getHelplines());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SafetyTipResponseDto> getSafetyTipById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(safetyTipService.getSafetyTipById(id));
    }
}
