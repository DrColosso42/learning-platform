package com.learningadvisor.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Main Spring Boot application for Learning Advisor backend
 * Implements study session management with weighted question selection
 */
@SpringBootApplication
@EnableJpaAuditing
public class LearningAdvisorApplication {

    public static void main(String[] args) {
        SpringApplication.run(LearningAdvisorApplication.class, args);
        System.out.println("🚀 Learning Advisor Backend started successfully");
        System.out.println("📍 Health check: http://localhost:3002/health");
        System.out.println("🔐 Auth API: http://localhost:3002/api/auth");
    }
}
