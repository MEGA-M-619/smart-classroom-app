package com.smartclassroom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class AssignmentDtos {
  public record AssignmentRequest(
      @NotBlank String title,
      String description,
      @NotNull LocalDateTime dueDate,
      @NotNull Long classId,
      Integer points,
      String type,
      String status
  ) {}

  public record AssignmentResponse(
      Long id,
      Long classId,
      String title,
      String description,
      LocalDateTime dueDate,
      Integer points,
      String type,
      String status,
      long submissions,
      boolean submitted,
      String submissionStatus,
      Double submissionGrade,
      String submissionFeedback,
      LocalDateTime submittedAt
  ) {}
}
