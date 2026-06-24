package com.smartclassroom.repository;

import com.smartclassroom.entity.Submission;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
  List<Submission> findByStudentId(Long studentId);
  List<Submission> findByAssignmentIdIn(List<Long> assignmentIds);
  Optional<Submission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);
  long countByAssignmentId(Long assignmentId);
}
