package com.smartclassroom.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String fullName;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String password;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Role role = Role.STUDENT;

  private String phone;
  private String bio;
  private String department;
  private String major;
  private String year;
  private boolean darkMode;
  private boolean emailNotifications = true;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getFullName() { return fullName; }
  public void setFullName(String fullName) { this.fullName = fullName; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }
  public Role getRole() { return role; }
  public void setRole(Role role) { this.role = role; }
  public String getPhone() { return phone; }
  public void setPhone(String phone) { this.phone = phone; }
  public String getBio() { return bio; }
  public void setBio(String bio) { this.bio = bio; }
  public String getDepartment() { return department; }
  public void setDepartment(String department) { this.department = department; }
  public String getMajor() { return major; }
  public void setMajor(String major) { this.major = major; }
  public String getYear() { return year; }
  public void setYear(String year) { this.year = year; }
  public boolean isDarkMode() { return darkMode; }
  public void setDarkMode(boolean darkMode) { this.darkMode = darkMode; }
  public boolean isEmailNotifications() { return emailNotifications; }
  public void setEmailNotifications(boolean emailNotifications) { this.emailNotifications = emailNotifications; }
}
