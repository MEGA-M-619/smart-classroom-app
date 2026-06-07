package com.smartclassroom.controller;

import com.smartclassroom.dto.ClassroomDtos.ClassroomRequest;
import com.smartclassroom.dto.ClassroomDtos.ClassroomResponse;
import com.smartclassroom.dto.ClassroomDtos.JoinClassRequest;
import com.smartclassroom.service.ClassroomService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/classes")
public class ClassroomController {
  private final ClassroomService classrooms;

  public ClassroomController(ClassroomService classrooms) {
    this.classrooms = classrooms;
  }

  @GetMapping
  public List<ClassroomResponse> all() {
    return classrooms.visibleClassrooms();
  }

  @PostMapping
  public Map<String, ClassroomResponse> create(@Valid @RequestBody ClassroomRequest request) {
    return Map.of("class", classrooms.create(request));
  }

  @PostMapping("/join")
  public Map<String, ClassroomResponse> join(@Valid @RequestBody JoinClassRequest request) {
    return Map.of("class", classrooms.join(request));
  }

  @GetMapping("/{id}")
  public ClassroomResponse get(@PathVariable Long id) {
    return classrooms.get(id);
  }

  @DeleteMapping("/{id}")
  public Map<String, Boolean> delete(@PathVariable Long id) {
    classrooms.delete(id);
    return Map.of("ok", true);
  }
}
