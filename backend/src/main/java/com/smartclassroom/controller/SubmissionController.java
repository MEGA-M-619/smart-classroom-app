package com.smartclassroom.controller;

import com.smartclassroom.dto.SubmissionDtos.GradeRequest;
import com.smartclassroom.dto.SubmissionDtos.SubmissionRequest;
import com.smartclassroom.dto.SubmissionDtos.SubmissionResponse;
import com.smartclassroom.service.SubmissionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {
  private final SubmissionService submissions;

  public SubmissionController(SubmissionService submissions) {
    this.submissions = submissions;
  }

  @GetMapping
  public List<SubmissionResponse> all() {
    return submissions.visibleSubmissions();
  }

  @PostMapping
  public Map<String, SubmissionResponse> submit(@Valid @RequestBody SubmissionRequest request) {
    return Map.of("submission", submissions.submit(request));
  }

  @PutMapping("/{id}/grade")
  public Map<String, SubmissionResponse> grade(@PathVariable Long id, @Valid @RequestBody GradeRequest request) {
    return Map.of("submission", submissions.grade(id, request));
  }
}
