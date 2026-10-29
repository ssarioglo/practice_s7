package gateway.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.relational.core.mapping.Column;
import java.time.LocalDateTime;

@Table(name = "users", schema = "auth_schema") // Указываем изолированную схему из init.sql
public class User {
    @Id
    private Long id;
    
    private String email;
    
    @Column("password_hash")
    private String passwordHash;
    
    @Column("webhook_secret")
    private String webhookSecret;
    
    @Column("created_at")
    private LocalDateTime createdAt;

    // Конструктор по умолчанию
    public User() {}

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getWebhookSecret() { return webhookSecret; }
    public void setWebhookSecret(String webhookSecret) { this.webhookSecret = webhookSecret; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}