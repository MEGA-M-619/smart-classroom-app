package com.smartclassroom.security;

import com.smartclassroom.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final UserRepository users;

  public JwtAuthenticationFilter(JwtService jwtService, UserRepository users) {
    this.jwtService = jwtService;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
      chain.doFilter(request, response);
      return;
    }

    String token = header.substring(7);
    try {
      String email = jwtService.subject(token);
      if (email != null && SecurityContextHolder.getContext().getAuthentication() == null && jwtService.isValid(token)) {
        users.findByEmail(email).ifPresent(user -> {
          var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
          var auth = new UsernamePasswordAuthenticationToken(user.getEmail(), null, authorities);
          SecurityContextHolder.getContext().setAuthentication(auth);
        });
      }
    } catch (RuntimeException ignored) {
      SecurityContextHolder.clearContext();
    }

    chain.doFilter(request, response);
  }
}
