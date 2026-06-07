package com.smartclassroom.dto;

import com.smartclassroom.entity.User;

public record UserResponse(
    Long id,
    String fullName,
    String name,
    String email,
    String role,
    String avatar,
    String phone,
    String bio,
    String department,
    String major,
    String year,
    boolean darkMode,
    boolean emailNotifications
) {
  public static UserResponse from(User user) {
    String fullName = user.getFullName();
    String avatar = initials(fullName);
    return new UserResponse(
        user.getId(),
        fullName,
        fullName,
        user.getEmail(),
        user.getRole().name().toLowerCase(),
        avatar,
        user.getPhone(),
        user.getBio(),
        user.getDepartment(),
        user.getMajor(),
        user.getYear(),
        user.isDarkMode(),
        user.isEmailNotifications()
    );
  }

  private static String initials(String name) {
    if (name == null || name.isBlank()) return "SC";
    StringBuilder result = new StringBuilder();
    for (String part : name.trim().split("\\s+")) {
      if (!part.isBlank()) result.append(Character.toUpperCase(part.charAt(0)));
      if (result.length() == 2) break;
    }
    return result.isEmpty() ? "SC" : result.toString();
  }
}
