package com.safehernexus.backend.dto.common;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

public record PagedResponseDto<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
    public static <E, T> PagedResponseDto<T> fromPage(Page<E> pageData, Function<E, T> mapper) {
        List<T> mappedContent = pageData.getContent().stream().map(mapper).toList();
        return new PagedResponseDto<>(
                mappedContent,
                pageData.getNumber(),
                pageData.getSize(),
                pageData.getTotalElements(),
                pageData.getTotalPages(),
                pageData.isLast()
        );
    }
}
