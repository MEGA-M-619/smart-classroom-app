package com.smartclassroom.service;

import com.smartclassroom.dto.SubmissionDtos.GradeRequest;
import com.smartclassroom.dto.SubmissionDtos.SubmissionRequest;
import com.smartclassroom.dto.SubmissionDtos.SubmissionResponse;
import com.smartclassroom.entity.Assignment;
import com.smartclassroom.entity.Role;
import com.smartclassroom.entity.Submission;
import com.smartclassroom.entity.User;
import com.smartclassroom.exception.ApiException;
import com.smartclassroom.repository.SubmissionRepository;
import com.smartclassroom.repository.UserRepository;
import com.smartclassroom.security.CurrentUserService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SubmissionService {
  private final SubmissionRepository submissions;
  private final AssignmentService assignments;
  private final UserRepository users;
  private final CurrentUserService currentUser;

  public SubmissionService(SubmissionRepository submissions, AssignmentService assignments, UserRepository users, CurrentUserService currentUser) {
    this.submissions = submissions;
    this.assignments = assignments;
    this.users = users;
    this.currentUser = currentUser;
  }

  public List<SubmissionResponse> visibleSubmissions() {
    User user = currentUser.get();
    if (user.getRole() == Role.STUDENT) {
      return submissions.findByStudentId(user.getId()).stream().map(this::toResponse).toList();
    }
    List<Long> assignmentIds = assignments.visibleAssignments().stream().map(item -> item.id()).toList();
    return assignmentIds.isEmpty() ? List.of() : submissions.findByAssignmentIdIn(assignmentIds).stream().map(this::toResponse).toList();
  }

  public SubmissionResponse submit(SubmissionRequest request) {
    User user = currentUser.get();
    if (user.getRole() != Role.STUDENT) throw new ApiException(HttpStatus.FORBIDDEN, "Only students can submit assignments.");
    Assignment assignment = assignments.find(request.assignmentId());
    assignments.authorizeRead(assignment);
    Submission submission = submissions.findByAssignmentIdAndStudentId(request.assignmentId(), user.getId()).orElseGet(Submission::new);
    submission.setAssignmentId(request.assignmentId());
    submission.setStudentId(user.getId());
    submission.setFileUrl(request.fileUrl());
    submission.setFileName(request.fileName());
    submission.setTextAnswer(request.textAnswer());
    submission.setSubmittedAt(LocalDateTime.now());
    submission.setStatus("submitted");
    submission.setGrade(null);
    submission.setFeedback("");
    return toResponse(submissions.save(submission));
  }

  public SubmissionResponse grade(Long id, GradeRequest request) {
    Submission submission = submissions.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found."));
    Assignment assignment = assignments.find(submission.getAssignmentId());
    assignments.authorizeRead(assignment);
    if (currentUser.get().getRole() == Role.STUDENT) throw new ApiException(HttpStatus.FORBIDDEN, "Only teachers can grade submissions.");
    submission.setGrade(request.grade());
    submission.setFeedback(request.feedback());
    submission.setStatus("graded");
    return toResponse(submissions.save(submission));
  }

  public SubmissionResponse toResponse(Submission submission) {
    User student = users.findById(submission.getStudentId()).orElse(null);
    String studentName = student == null ? "Student" : student.getFullName();
    return new SubmissionResponse(
        submission.getId(),
        submission.getAssignmentId(),
        submission.getStudentId(),
        studentName,
        initials(studentName),
        submission.getFileName(),
        submission.getFileUrl(),
        submission.getTextAnswer(),
        submission.getSubmittedAt(),
        submission.getGrade(),
        submission.getFeedback(),
        submission.getStatus()
    );
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
