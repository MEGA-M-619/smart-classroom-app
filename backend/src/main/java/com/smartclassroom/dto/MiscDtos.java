package com.smartclassroom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class MiscDtos {
  public record AnnouncementRequest(@NotNull Long classId, @NotBlank String title, @NotBlank String body, boolean pinned) {}
  public record AnnouncementResponse(Long id, Long classId, String title, String body, String teacher, String avatar, LocalDateTime date, boolean pinned, String color) {}
  public record NotificationResponse(Long id, String text, String icon, boolean read, String time) {}
  public record BootstrapResponse(
      Object classes,
      Object assignments,
      Object announcements,
      Object materials,
      Object events,
      Object notifications,
      Object submissions,
      Object users,
      Object classStudents,
      Object settings,
      Object attendanceSummary,
      Object attendanceRecent,
      Object stats
  ) {}
}
