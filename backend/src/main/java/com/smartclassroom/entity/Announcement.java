package com.smartclassroom.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDateTime;

@Entity
public class Announcement {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private Long classroomId;
  private Long authorId;
  private String title;
  @Column(length = 3000)
  private String body;
  private boolean pinned;
  private LocalDateTime createdAt = LocalDateTime.now();

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getClassroomId() { return classroomId; }
  public void setClassroomId(Long classroomId) { this.classroomId = classroomId; }
  public Long getAuthorId() { return authorId; }
  public void setAuthorId(Long authorId) { this.authorId = authorId; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getBody() { return body; }
  public void setBody(String body) { this.body = body; }
  public boolean isPinned() { return pinned; }
  public void setPinned(boolean pinned) { this.pinned = pinned; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
