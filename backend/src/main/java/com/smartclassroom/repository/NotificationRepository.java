package com.smartclassroom.repository;

import com.smartclassroom.entity.Notification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
  List<Notification> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
}
