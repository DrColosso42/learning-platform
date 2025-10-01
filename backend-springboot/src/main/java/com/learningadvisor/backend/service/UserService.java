package com.learningadvisor.backend.service;

import com.learningadvisor.backend.dto.AuthRequest;
import com.learningadvisor.backend.dto.UserDTO;
import com.learningadvisor.backend.entity.User;
import com.learningadvisor.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for user management and authentication
 * Handles user creation and password verification
 */
@Service
@Transactional
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Create a new user account
     * @param request Registration request with email, password, and name
     * @return Created user
     * @throws IllegalArgumentException if email already exists
     */
    public User createUser(AuthRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("User with email " + request.getEmail() + " already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .name(request.getName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        return userRepository.save(user);
    }

    /**
     * Authenticate user with email and password
     * @param request Login request with email and password
     * @return User if credentials are valid, null otherwise
     */
    public User authenticateUser(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        if (user != null && passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return user;
        }

        return null;
    }

    /**
     * Find user by ID
     */
    public User findById(Long userId) {
        return userRepository.findById(userId).orElse(null);
    }

    /**
     * Convert User entity to DTO
     */
    public UserDTO toDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
