package com.smartclassroom.service;

import com.smartclassroom.dto.AuthDtos.AuthResponse;
import com.smartclassroom.dto.AuthDtos.LoginRequest;
import com.smartclassroom.dto.AuthDtos.RegisterRequest;
import com.smartclassroom.dto.UserResponse;
import com.smartclassroom.entity.Role;
import com.smartclassroom.entity.User;
import com.smartclassroom.exception.ApiException;
import com.smartclassroom.repository.UserRepository;
import com.smartclassroom.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  public AuthResponse register(RegisterRequest request) {
    String email = request.email().trim().toLowerCase();
    if (users.existsByEmail(email)) {
      throw new ApiException(HttpStatus.CONFLICT, "Email is already registered.");
    }
    User user = new User();
    user.setFullName(request.fullName().trim());
    user.setEmail(email);
    user.setPassword(passwordEncoder.encode(request.password()));
    user.setRole(request.role() == null ? Role.STUDENT : request.role());
    User saved = users.save(user);
    return new AuthResponse(jwtService.generate(saved), UserResponse.from(saved));
  }

  public AuthResponse login(LoginRequest request) {
    User user = users.findByEmail(request.email().trim().toLowerCase())
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));
    if (!passwordEncoder.matches(request.password(), user.getPassword())) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
    }
    return new AuthResponse(jwtService.generate(user), UserResponse.from(user));
  }
}
