package com.smartclassroom.controller;

import com.smartclassroom.dto.AuthDtos.RegisterRequest;
import com.smartclassroom.dto.UserResponse;
import com.smartclassroom.entity.Role;
import com.smartclassroom.entity.User;
import com.smartclassroom.exception.ApiException;
import com.smartclassroom.repository.UserRepository;
import com.smartclassroom.security.CurrentUserService;
import com.smartclassroom.service.AuthService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserRepository users;
  private final CurrentUserService currentUser;
  private final PasswordEncoder passwordEncoder;
  private final AuthService authService;

  public UserController(UserRepository users, CurrentUserService currentUser, PasswordEncoder passwordEncoder, AuthService authService) {
    this.users = users;
    this.currentUser = currentUser;
    this.passwordEncoder = passwordEncoder;
    this.authService = authService;
  }

  @GetMapping
  public List<UserResponse> all() {
    currentUser.require(Role.ADMIN);
    return users.findAll().stream().map(UserResponse::from).toList();
  }

  @PostMapping
  public Map<String, UserResponse> create(@Valid @RequestBody RegisterRequest request) {
    currentUser.require(Role.ADMIN);
    return Map.of("user", authService.register(request).user());
  }

  @PutMapping("/{id}")
  public Map<String, UserResponse> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
    User actor = currentUser.get();
    if (!actor.getId().equals(id) && actor.getRole() != Role.ADMIN) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Cannot update this user.");
    }
    User user = users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));
    if (body.containsKey("fullName")) user.setFullName(String.valueOf(body.get("fullName")));
    if (body.containsKey("name")) user.setFullName(String.valueOf(body.get("name")));
    if (body.containsKey("email")) user.setEmail(String.valueOf(body.get("email")));
    if (body.containsKey("phone")) user.setPhone(String.valueOf(body.get("phone")));
    if (body.containsKey("bio")) user.setBio(String.valueOf(body.get("bio")));
    if (body.containsKey("darkMode")) user.setDarkMode(Boolean.parseBoolean(String.valueOf(body.get("darkMode"))));
    if (body.containsKey("emailNotifications")) user.setEmailNotifications(Boolean.parseBoolean(String.valueOf(body.get("emailNotifications"))));
    if (body.containsKey("role") && actor.getRole() == Role.ADMIN) user.setRole(Role.valueOf(String.valueOf(body.get("role")).toUpperCase()));
    return Map.of("user", UserResponse.from(users.save(user)));
  }

  @PutMapping("/password")
  public Map<String, Boolean> password(@RequestBody Map<String, String> body) {
    User user = currentUser.get();
    String next = body.get("newPassword");
    if (next == null || next.length() < 8) throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters.");
    user.setPassword(passwordEncoder.encode(next));
    users.save(user);
    return Map.of("ok", true);
  }

  @DeleteMapping("/{id}")
  public Map<String, Boolean> delete(@PathVariable Long id) {
    currentUser.require(Role.ADMIN);
    users.deleteById(id);
    return Map.of("ok", true);
  }
}
