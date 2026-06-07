package com.smartclassroom.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "enrollments", uniqueConstraints = @UniqueConstraint(columnNames = {"studentId", "classroomId"}))
public class Enrollment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private Long studentId;
  private Long classroomId;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getStudentId() { return studentId; }
  public void setStudentId(Long studentId) { this.studentId = studentId; }
  public Long getClassroomId() { return classroomId; }
  public void setClassroomId(Long classroomId) { this.classroomId = classroomId; }
}
