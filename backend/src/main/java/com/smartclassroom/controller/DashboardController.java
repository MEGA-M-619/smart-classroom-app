package com.smartclassroom.controller;

import com.smartclassroom.dto.MiscDtos.AnnouncementRequest;
import com.smartclassroom.dto.MiscDtos.AnnouncementResponse;
import com.smartclassroom.dto.MiscDtos.BootstrapResponse;
import com.smartclassroom.dto.MiscDtos.NotificationResponse;
import com.smartclassroom.service.DashboardService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {
  private final DashboardService dashboard;

  public DashboardController(DashboardService dashboard) {
    this.dashboard = dashboard;
  }

  @GetMapping("/dashboard/bootstrap")
  public BootstrapResponse bootstrap() {
    return dashboard.bootstrap();
  }

  @GetMapping("/announcements")
  public List<AnnouncementResponse> announcements() {
    return dashboard.announcements();
  }

  @PostMapping("/announcements")
  public Map<String, AnnouncementResponse> createAnnouncement(@Valid @RequestBody AnnouncementRequest request) {
    return Map.of("announcement", dashboard.createAnnouncement(request));
  }

  @GetMapping("/notifications")
  public List<NotificationResponse> notifications() {
    return dashboard.notifications();
  }

  @PutMapping("/notifications/{id}/read")
  public Map<String, Boolean> markRead(@PathVariable Long id) {
    dashboard.markNotificationRead(id);
    return Map.of("ok", true);
  }

  @PutMapping("/notifications/read-all")
  public Map<String, Boolean> markAllRead() {
    dashboard.markAllNotificationsRead();
    return Map.of("ok", true);
  }
}
