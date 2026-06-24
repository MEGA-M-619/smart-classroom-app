package com.smartclassroom.repository;

import com.smartclassroom.entity.Assignment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
  List<Assignment> findByClassroomIdIn(List<Long> classroomIds);
  List<Assignment> findByClassroomId(Long classroomId);
}
