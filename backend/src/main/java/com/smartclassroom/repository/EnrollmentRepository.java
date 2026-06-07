package com.smartclassroom.repository;

import com.smartclassroom.entity.Enrollment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
  List<Enrollment> findByStudentId(Long studentId);
  List<Enrollment> findByClassroomId(Long classroomId);
  Optional<Enrollment> findByStudentIdAndClassroomId(Long studentId, Long classroomId);
  boolean existsByStudentIdAndClassroomId(Long studentId, Long classroomId);
}
