package com.smartclassroom.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDateTime;

@Entity
public class Notification {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private Long userId;
  private String text;
  private String icon = "bell";
  private boolean read;
  private LocalDateTime createdAt = LocalDateTime.now();

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getUserId() { return userId; }
  public void setUserId(Long userId) { this.userId = userId; }
  public String getText() { return text; }
  public void setText(String text) { this.text = text; }
  public String getIcon() { return icon; }
  public void setIcon(String icon) { this.icon = icon; }
  public boolean isRead() { return read; }
  public void setRead(boolean read) { this.read = read; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
