package com.smartclassroom.security;

import com.smartclassroom.entity.Role;
import com.smartclassroom.entity.User;
import com.smartclassroom.exception.ApiException;
import com.smartclassroom.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {
  private final UserRepository users;

  public CurrentUserService(UserRepository users) {
    this.users = users;
  }

  public User get() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated()) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
    return users.findByEmail(authentication.getName())
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
  }

  public void require(Role... roles) {
    User user = get();
    for (Role role : roles) {
      if (user.getRole() == role) return;
    }
    throw new ApiException(HttpStatus.FORBIDDEN, "Insufficient role.");
  }
}
