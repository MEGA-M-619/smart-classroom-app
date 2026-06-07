package com.smartclassroom.controller;

import com.smartclassroom.dto.AuthDtos.AuthResponse;
import com.smartclassroom.dto.AuthDtos.LoginRequest;
import com.smartclassroom.dto.AuthDtos.RegisterRequest;
import com.smartclassroom.dto.UserResponse;
import com.smartclassroom.security.CurrentUserService;
import com.smartclassroom.service.AuthService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;
  private final CurrentUserService currentUser;

  public AuthController(AuthService authService, CurrentUserService currentUser) {
    this.authService = authService;
    this.currentUser = currentUser;
  }

  @PostMapping("/register")
  public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
    return authService.register(request);
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @GetMapping("/me")
  public Map<String, UserResponse> me() {
    return Map.of("user", UserResponse.from(currentUser.get()));
  }
}
