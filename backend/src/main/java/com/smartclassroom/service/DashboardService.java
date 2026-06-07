package com.smartclassroom.service;

import com.smartclassroom.dto.AssignmentDtos.AssignmentResponse;
import com.smartclassroom.dto.ClassroomDtos.ClassroomResponse;
import com.smartclassroom.dto.MiscDtos.AnnouncementRequest;
import com.smartclassroom.dto.MiscDtos.AnnouncementResponse;
import com.smartclassroom.dto.MiscDtos.BootstrapResponse;
import com.smartclassroom.dto.MiscDtos.NotificationResponse;
import com.smartclassroom.dto.UserResponse;
import com.smartclassroom.entity.Announcement;
import com.smartclassroom.entity.Classroom;
import com.smartclassroom.entity.Notification;
import com.smartclassroom.entity.Role;
import com.smartclassroom.entity.User;
import com.smartclassroom.exception.ApiException;
import com.smartclassroom.repository.AnnouncementRepository;
import com.smartclassroom.repository.ClassroomRepository;
import com.smartclassroom.repository.EnrollmentRepository;
import com.smartclassroom.repository.NotificationRepository;
import com.smartclassroom.repository.UserRepository;
import com.smartclassroom.security.CurrentUserService;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
  private final ClassroomService classrooms;
  private final AssignmentService assignments;
  private final SubmissionService submissions;
  private final AnnouncementRepository announcements;
  private final NotificationRepository notifications;
  private final ClassroomRepository classroomRepository;
  private final EnrollmentRepository enrollments;
  private final UserRepository users;
  private final CurrentUserService currentUser;

  public DashboardService(ClassroomService classrooms, AssignmentService assignments, SubmissionService submissions, AnnouncementRepository announcements, NotificationRepository notifications, ClassroomRepository classroomRepository, EnrollmentRepository enrollments, UserRepository users, CurrentUserService currentUser) {
    this.classrooms = classrooms;
    this.assignments = assignments;
    this.submissions = submissions;
    this.announcements = announcements;
    this.notifications = notifications;
    this.classroomRepository = classroomRepository;
    this.enrollments = enrollments;
    this.users = users;
    this.currentUser = currentUser;
  }

  public BootstrapResponse bootstrap() {
    User user = currentUser.get();
    List<ClassroomResponse> classList = classrooms.visibleClassrooms();
    List<Long> classIds = classList.stream().map(ClassroomResponse::id).toList();
    List<AssignmentResponse> assignmentList = assignments.visibleAssignments();
    var submissionList = submissions.visibleSubmissions();
    var announcementList = classIds.isEmpty()
        ? List.<AnnouncementResponse>of()
        : announcements.findByClassroomIdInOrderByCreatedAtDesc(classIds).stream().map(this::toAnnouncement).toList();
    var notificationList = notifications.findTop50ByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(this::toNotification).toList();

    Map<Long, List<UserResponse>> classStudents = new HashMap<>();
    for (ClassroomResponse classroom : classList) {
      List<Long> studentIds = enrollments.findByClassroomId(classroom.id()).stream().map(item -> item.getStudentId()).toList();
      classStudents.put(classroom.id(), studentIds.isEmpty() ? List.of() : users.findAllById(studentIds).stream().map(UserResponse::from).toList());
    }

    List<UserResponse> userList = user.getRole() == Role.ADMIN
        ? users.findAll().stream().map(UserResponse::from).toList()
        : user.getRole() == Role.TEACHER
            ? users.findAll().stream().filter(item -> item.getRole() == Role.STUDENT).map(UserResponse::from).toList()
            : List.of();

    Map<String, Object> stats = new HashMap<>();
    stats.put("enrolledClasses", user.getRole() == Role.STUDENT ? classList.size() : null);
    stats.put("pendingTasks", assignmentList.stream().filter(a -> "active".equals(a.status()) && !a.submitted()).count());
    stats.put("submittedCount", submissionList.size());
    stats.put("gradedCount", submissionList.stream().filter(s -> "graded".equals(s.status())).count());
    stats.put("pendingGrades", submissionList.stream().filter(s -> "submitted".equals(s.status())).count());
    stats.put("totalStudents", classList.stream().mapToLong(ClassroomResponse::students).sum());
    stats.put("gpa", null);

    return new BootstrapResponse(
        classList,
        assignmentList,
        announcementList,
        List.of(),
        List.of(),
        notificationList,
        submissionList,
        userList,
        classStudents,
        Map.of(),
        List.of(),
        List.of(),
        stats
    );
  }

  public List<AnnouncementResponse> announcements() {
    List<Long> classIds = classrooms.visibleClassrooms().stream().map(ClassroomResponse::id).toList();
    return classIds.isEmpty() ? List.of() : announcements.findByClassroomIdInOrderByCreatedAtDesc(classIds).stream().map(this::toAnnouncement).toList();
  }

  public AnnouncementResponse createAnnouncement(AnnouncementRequest request) {
    classrooms.authorizeTeacher(request.classId());
    User user = currentUser.get();
    Announcement announcement = new Announcement();
    announcement.setClassroomId(request.classId());
    announcement.setAuthorId(user.getId());
    announcement.setTitle(request.title());
    announcement.setBody(request.body());
    announcement.setPinned(request.pinned());
    return toAnnouncement(announcements.save(announcement));
  }

  public List<NotificationResponse> notifications() {
    return notifications.findTop50ByUserIdOrderByCreatedAtDesc(currentUser.get().getId()).stream().map(this::toNotification).toList();
  }

  public void markNotificationRead(Long id) {
    Notification notification = notifications.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notification not found."));
    if (!notification.getUserId().equals(currentUser.get().getId())) throw new ApiException(HttpStatus.FORBIDDEN, "Cannot update this notification.");
    notification.setRead(true);
    notifications.save(notification);
  }

  public void markAllNotificationsRead() {
    List<Notification> items = notifications.findTop50ByUserIdOrderByCreatedAtDesc(currentUser.get().getId());
    items.forEach(item -> item.setRead(true));
    notifications.saveAll(items);
  }

  private AnnouncementResponse toAnnouncement(Announcement announcement) {
    User author = users.findById(announcement.getAuthorId()).orElse(null);
    Classroom classroom = classroomRepository.findById(announcement.getClassroomId()).orElse(null);
    String teacher = author == null ? "Teacher" : author.getFullName();
    return new AnnouncementResponse(
        announcement.getId(),
        announcement.getClassroomId(),
        announcement.getTitle(),
        announcement.getBody(),
        teacher,
        initials(teacher),
        announcement.getCreatedAt(),
        announcement.isPinned(),
        classroom == null ? "#6366f1" : classroom.getColor()
    );
  }

  private NotificationResponse toNotification(Notification notification) {
    return new NotificationResponse(notification.getId(), notification.getText(), notification.getIcon(), notification.isRead(), timeAgo(notification.getCreatedAt()));
  }

  private String timeAgo(LocalDateTime date) {
    if (date == null) return "Just now";
    long hours = Duration.between(date, LocalDateTime.now()).toHours();
    if (hours < 1) return "Just now";
    if (hours < 24) return hours + "h ago";
    return (hours / 24) + "d ago";
  }

  private String initials(String name) {
    if (name == null || name.isBlank()) return "SC";
    StringBuilder result = new StringBuilder();
    for (String part : name.trim().split("\\s+")) {
      result.append(Character.toUpperCase(part.charAt(0)));
      if (result.length() == 2) break;
    }
    return result.toString();
  }
}
