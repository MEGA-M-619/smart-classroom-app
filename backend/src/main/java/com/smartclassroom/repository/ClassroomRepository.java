package com.smartclassroom.repository;

import com.smartclassroom.entity.Classroom;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
  List<Classroom> findByTeacherId(Long teacherId);
  Optional<Classroom> findByCodeIgnoreCase(String code);
  boolean existsByCodeIgnoreCase(String code);
}
