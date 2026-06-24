package com.smartclassroom.repository;

import com.smartclassroom.entity.Announcement;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
  List<Announcement> findByClassroomIdInOrderByCreatedAtDesc(List<Long> classroomIds);
}
