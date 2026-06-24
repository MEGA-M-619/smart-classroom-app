package com.smartclassroom.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "classrooms")
public class Classroom {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false, unique = true)
  private String code;

  @Column(nullable = false)
  private Long teacherId;

  @Column(length = 1000)
  private String description;
  private String schedule;
  private String room;
  private String color = "#6366f1";
  private String icon = "CL";

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getCode() { return code; }
  public void setCode(String code) { this.code = code; }
  public Long getTeacherId() { return teacherId; }
  public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getSchedule() { return schedule; }
  public void setSchedule(String schedule) { this.schedule = schedule; }
  public String getRoom() { return room; }
  public void setRoom(String room) { this.room = room; }
  public String getColor() { return color; }
  public void setColor(String color) { this.color = color; }
  public String getIcon() { return icon; }
  public void setIcon(String icon) { this.icon = icon; }
}
