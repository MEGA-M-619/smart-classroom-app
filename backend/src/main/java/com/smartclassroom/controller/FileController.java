package com.smartclassroom.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
public class FileController {
  private final Path uploadDir;

  public FileController(@Value("${app.upload-dir}") String uploadDir) {
    this.uploadDir = Path.of(uploadDir).toAbsolutePath();
  }

  @PostMapping
  public Map<String, String> upload(@RequestParam("file") MultipartFile file) throws IOException {
    Files.createDirectories(uploadDir);
    String safeName = file.getOriginalFilename() == null ? "upload.bin" : Path.of(file.getOriginalFilename()).getFileName().toString();
    String storedName = UUID.randomUUID() + "-" + safeName;
    Path target = uploadDir.resolve(storedName);
    file.transferTo(target);
    return Map.of("fileUrl", "/uploads/" + storedName, "fileName", safeName);
  }
}
