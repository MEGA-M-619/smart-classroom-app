package com.smartclassroom.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class SubmissionDtos {
  public record SubmissionRequest(
      @NotNull Long assignmentId,
      String fileUrl,
      String fileName,
      String textAnswer
  ) {}

  public record GradeRequest(@NotNull Double grade, String feedback) {}

  public record SubmissionResponse(
      Long id,
      Long assignmentId,
      Long studentId,
      String studentName,
      String avatar,
      String file,
      String fileUrl,
      String textAnswer,
      LocalDateTime submittedAt,
      Double grade,
      String feedback,
      String status
  ) {}
}
