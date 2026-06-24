package com.smartclassroom.controller;

import com.smartclassroom.dto.AssignmentDtos.AssignmentRequest;
import com.smartclassroom.dto.AssignmentDtos.AssignmentResponse;
import com.smartclassroom.service.AssignmentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {
  private final AssignmentService assignments;

  public AssignmentController(AssignmentService assignments) {
    this.assignments = assignments;
  }

  @GetMapping
  public List<AssignmentResponse> all() {
    return assignments.visibleAssignments();
  }

  @PostMapping
  public Map<String, AssignmentResponse> create(@Valid @RequestBody AssignmentRequest request) {
    return Map.of("assignment", assignments.create(request));
  }

  @PutMapping("/{id}")
  public Map<String, AssignmentResponse> update(@PathVariable Long id, @Valid @RequestBody AssignmentRequest request) {
    return Map.of("assignment", assignments.update(id, request));
  }

  @DeleteMapping("/{id}")
  public Map<String, Boolean> delete(@PathVariable Long id) {
    assignments.delete(id);
    return Map.of("ok", true);
  }
}
