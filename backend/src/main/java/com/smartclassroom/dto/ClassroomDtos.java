package com.smartclassroom.dto;

import jakarta.validation.constraints.NotBlank;

public class ClassroomDtos {
  public record ClassroomRequest(
      @NotBlank String name,
      String description,
      String schedule,
      String room
  ) {}

  public record JoinClassRequest(@NotBlank String code) {}

  public record ClassroomResponse(
      Long id,
      String name,
      String title,
      String code,
      String joinCode,
      Long teacherId,
      String teacher,
      String color,
      String icon,
      long students,
      String description,
      String schedule,
      String room
  ) {}
}
