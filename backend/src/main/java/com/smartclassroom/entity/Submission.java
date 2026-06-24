package com.smartclassroom.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(name = "submissions", uniqueConstraints = @UniqueConstraint(columnNames = {"assignmentId", "studentId"}))
public class Submission {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private Long assignmentId;
  private Long studentId;
  private String fileUrl;
  private String fileName;
  private LocalDateTime submittedAt = LocalDateTime.now();
  private Double grade;
  private String status = "submitted";
  @Column(length = 4000)
  private String textAnswer;
  @Column(length = 2000)
  private String feedback;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getAssignmentId() { return assignmentId; }
  public void setAssignmentId(Long assignmentId) { this.assignmentId = assignmentId; }
  public Long getStudentId() { return studentId; }
  public void setStudentId(Long studentId) { this.studentId = studentId; }
  public String getFileUrl() { return fileUrl; }
  public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
  public String getFileName() { return fileName; }
  public void setFileName(String fileName) { this.fileName = fileName; }
  public LocalDateTime getSubmittedAt() { return submittedAt; }
  public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
  public Double getGrade() { return grade; }
  public void setGrade(Double grade) { this.grade = grade; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getTextAnswer() { return textAnswer; }
  public void setTextAnswer(String textAnswer) { this.textAnswer = textAnswer; }
  public String getFeedback() { return feedback; }
  public void setFeedback(String feedback) { this.feedback = feedback; }
}
