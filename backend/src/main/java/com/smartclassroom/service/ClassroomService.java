package com.smartclassroom.service;

import com.smartclassroom.dto.ClassroomDtos.ClassroomRequest;
import com.smartclassroom.dto.ClassroomDtos.ClassroomResponse;
import com.smartclassroom.dto.ClassroomDtos.JoinClassRequest;
import com.smartclassroom.entity.Classroom;
import com.smartclassroom.entity.Enrollment;
import com.smartclassroom.entity.Role;
import com.smartclassroom.entity.User;
import com.smartclassroom.exception.ApiException;
import com.smartclassroom.repository.ClassroomRepository;
import com.smartclassroom.repository.EnrollmentRepository;
import com.smartclassroom.repository.UserRepository;
import com.smartclassroom.security.CurrentUserService;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ClassroomService {
  private final ClassroomRepository classrooms;
  private final EnrollmentRepository enrollments;
  private final UserRepository users;
  private final CurrentUserService currentUser;

  public ClassroomService(ClassroomRepository classrooms, EnrollmentRepository enrollments, UserRepository users, CurrentUserService currentUser) {
    this.classrooms = classrooms;
    this.enrollments = enrollments;
    this.users = users;
    this.currentUser = currentUser;
  }

  public List<ClassroomResponse> visibleClassrooms() {
    User user = currentUser.get();
    List<Classroom> items = switch (user.getRole()) {
      case ADMIN -> classrooms.findAll();
      case TEACHER -> classrooms.findByTeacherId(user.getId());
      case STUDENT -> {
        List<Long> ids = enrollments.findByStudentId(user.getId()).stream().map(Enrollment::getClassroomId).toList();
        yield ids.isEmpty() ? List.of() : classrooms.findAllById(ids);
      }
    };
    return items.stream().map(this::toResponse).toList();
  }

  public ClassroomResponse get(Long id) {
    Classroom classroom = find(id);
    authorizeClassroomRead(classroom);
    return toResponse(classroom);
  }

  public ClassroomResponse create(ClassroomRequest request) {
    User user = currentUser.get();
    if (user.getRole() != Role.TEACHER && user.getRole() != Role.ADMIN) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Only teachers and admins can create classes.");
    }
    Classroom classroom = new Classroom();
    classroom.setName(request.name().trim());
    classroom.setDescription(request.description());
    classroom.setSchedule(request.schedule());
    classroom.setRoom(request.room());
    classroom.setTeacherId(user.getId());
    classroom.setCode(generateCode(request.name()));
    return toResponse(classrooms.save(classroom));
  }

  public ClassroomResponse join(JoinClassRequest request) {
    User user = currentUser.get();
    if (user.getRole() != Role.STUDENT) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Only students can join classes.");
    }
    Classroom classroom = classrooms.findByCodeIgnoreCase(request.code().trim())
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Class not found. Check the join code."));
    if (!enrollments.existsByStudentIdAndClassroomId(user.getId(), classroom.getId())) {
      Enrollment enrollment = new Enrollment();
      enrollment.setStudentId(user.getId());
      enrollment.setClassroomId(classroom.getId());
      enrollments.save(enrollment);
    }
    return toResponse(classroom);
  }

  public void delete(Long id) {
    Classroom classroom = find(id);
    User user = currentUser.get();
    if (user.getRole() != Role.ADMIN && !classroom.getTeacherId().equals(user.getId())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Only the teacher or admin can delete this class.");
    }
    classrooms.delete(classroom);
  }

  public Classroom find(Long id) {
    return classrooms.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Class not found."));
  }

  public void authorizeClassroomRead(Classroom classroom) {
    User user = currentUser.get();
    if (user.getRole() == Role.ADMIN || classroom.getTeacherId().equals(user.getId())) return;
    if (enrollments.existsByStudentIdAndClassroomId(user.getId(), classroom.getId())) return;
    throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this class.");
  }

  public void authorizeTeacher(Long classroomId) {
    Classroom classroom = find(classroomId);
    User user = currentUser.get();
    if (user.getRole() == Role.ADMIN || classroom.getTeacherId().equals(user.getId())) return;
    throw new ApiException(HttpStatus.FORBIDDEN, "Only the class teacher can manage this resource.");
  }

  public ClassroomResponse toResponse(Classroom classroom) {
    String teacher = users.findById(classroom.getTeacherId()).map(User::getFullName).orElse("Teacher");
    long studentCount = enrollments.findByClassroomId(classroom.getId()).size();
    return new ClassroomResponse(
        classroom.getId(),
        classroom.getName(),
        classroom.getName(),
        classroom.getCode(),
        classroom.getCode(),
        classroom.getTeacherId(),
        teacher,
        classroom.getColor(),
        classroom.getIcon(),
        studentCount,
        classroom.getDescription(),
        classroom.getSchedule(),
        classroom.getRoom()
    );
  }

  private String generateCode(String name) {
    String prefix = name.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
    prefix = prefix.length() < 4 ? "CLSS" : prefix.substring(0, 4);
    Random random = new Random();
    String code;
    do {
      code = prefix + (1000 + random.nextInt(9000));
    } while (classrooms.existsByCodeIgnoreCase(code));
    return code;
  }
}
