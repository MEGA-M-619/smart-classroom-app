package com.smartclassroom.service;

import com.smartclassroom.dto.AssignmentDtos.AssignmentRequest;
import com.smartclassroom.dto.AssignmentDtos.AssignmentResponse;
import com.smartclassroom.entity.Assignment;
import com.smartclassroom.entity.Classroom;
import com.smartclassroom.entity.Enrollment;
import com.smartclassroom.entity.Role;
import com.smartclassroom.entity.Submission;
import com.smartclassroom.entity.User;
import com.smartclassroom.exception.ApiException;
import com.smartclassroom.repository.AssignmentRepository;
import com.smartclassroom.repository.ClassroomRepository;
import com.smartclassroom.repository.EnrollmentRepository;
import com.smartclassroom.repository.SubmissionRepository;
import com.smartclassroom.security.CurrentUserService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AssignmentService {
  private final AssignmentRepository assignments;
  private final ClassroomRepository classrooms;
  private final EnrollmentRepository enrollments;
  private final SubmissionRepository submissions;
  private final ClassroomService classroomService;
  private final CurrentUserService currentUser;

  public AssignmentService(AssignmentRepository assignments, ClassroomRepository classrooms, EnrollmentRepository enrollments, SubmissionRepository submissions, ClassroomService classroomService, CurrentUserService currentUser) {
    this.assignments = assignments;
    this.classrooms = classrooms;
    this.enrollments = enrollments;
    this.submissions = submissions;
    this.classroomService = classroomService;
    this.currentUser = currentUser;
  }

  public List<AssignmentResponse> visibleAssignments() {
    User user = currentUser.get();
    List<Assignment> items = switch (user.getRole()) {
      case ADMIN -> assignments.findAll();
      case TEACHER -> {
        List<Long> classIds = classrooms.findByTeacherId(user.getId()).stream().map(Classroom::getId).toList();
        yield classIds.isEmpty() ? List.of() : assignments.findByClassroomIdIn(classIds);
      }
      case STUDENT -> {
        List<Long> classIds = enrollments.findByStudentId(user.getId()).stream().map(Enrollment::getClassroomId).toList();
        yield classIds.isEmpty() ? List.of() : assignments.findByClassroomIdIn(classIds);
      }
    };
    return items.stream().map(this::toResponse).toList();
  }

  public AssignmentResponse create(AssignmentRequest request) {
    classroomService.authorizeTeacher(request.classId());
    Assignment assignment = new Assignment();
    apply(assignment, request);
    return toResponse(assignments.save(assignment));
  }

  public AssignmentResponse update(Long id, AssignmentRequest request) {
    Assignment assignment = find(id);
    classroomService.authorizeTeacher(assignment.getClassroomId());
    apply(assignment, request);
    return toResponse(assignments.save(assignment));
  }

  public void delete(Long id) {
    Assignment assignment = find(id);
    classroomService.authorizeTeacher(assignment.getClassroomId());
    assignments.delete(assignment);
  }

  public Assignment find(Long id) {
    return assignments.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Assignment not found."));
  }

  public void authorizeRead(Assignment assignment) {
    classroomService.authorizeClassroomRead(classroomService.find(assignment.getClassroomId()));
  }

  public AssignmentResponse toResponse(Assignment assignment) {
    User user = currentUser.get();
    Submission ownSubmission = user.getRole() == Role.STUDENT
        ? submissions.findByAssignmentIdAndStudentId(assignment.getId(), user.getId()).orElse(null)
        : null;
    return new AssignmentResponse(
        assignment.getId(),
        assignment.getClassroomId(),
        assignment.getTitle(),
        assignment.getDescription(),
        assignment.getDueDate(),
        assignment.getPoints(),
        assignment.getType(),
        assignment.getStatus(),
        submissions.countByAssignmentId(assignment.getId()),
        ownSubmission != null,
        ownSubmission == null ? null : ownSubmission.getStatus(),
        ownSubmission == null ? null : ownSubmission.getGrade(),
        ownSubmission == null ? "" : ownSubmission.getFeedback(),
        ownSubmission == null ? null : ownSubmission.getSubmittedAt()
    );
  }

  private void apply(Assignment assignment, AssignmentRequest request) {
    assignment.setTitle(request.title().trim());
    assignment.setDescription(request.description());
    assignment.setDueDate(request.dueDate());
    assignment.setClassroomId(request.classId());
    assignment.setPoints(request.points() == null ? 100 : request.points());
    assignment.setType(request.type() == null || request.type().isBlank() ? "Assignment" : request.type());
    assignment.setStatus(request.status() == null || request.status().isBlank() ? "active" : request.status());
  }
}
