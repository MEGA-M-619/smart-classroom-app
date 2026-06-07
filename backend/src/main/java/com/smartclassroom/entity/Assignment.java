package com.smartclassroom.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "assignments")
public class Assignment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String title;

  @Column(length = 2000)
  private String description;

  private LocalDateTime dueDate;
  private Long classroomId;
  private Integer points = 100;
  private String type = "Assignment";
  private String status = "active";

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public LocalDateTime getDueDate() { return dueDate; }
  public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
  public Long getClassroomId() { return classroomId; }
  public void setClassroomId(Long classroomId) { this.classroomId = classroomId; }
  public Integer getPoints() { return points; }
  public void setPoints(Integer points) { this.points = points; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
}
