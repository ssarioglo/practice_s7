package gateway.controller;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import gateway.model.User;
import gateway.repository.UserRepository;
import gateway.security.JwtUtil;
import io.jsonwebtoken.Claims;
import reactor.core.publisher.Mono;

// контроллер авторизации и регистрации пользователей в бд
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    // создаем дефолтных юзеров при старте если их еще нет в базе
    @EventListener(ApplicationReadyEvent.class)
    public void seedDefaultUsers() {
        seedOrUpgradeUser("sarioglo", "123456").subscribe();
        seedOrUpgradeUser("admin", "admin123").subscribe();
    }

    private Mono<User> seedOrUpgradeUser(String login, String rawPassword) {
        return userRepository.findByEmail(login)
                .flatMap(existing -> {
                    // если пароль был записан из init.sql без хеша — хешируем через bcrypt
                    String stored = existing.getPasswordHash();
                    if (stored != null && !stored.startsWith("$2a$") && !stored.startsWith("$2b$")) {
                        existing.setPasswordHash(passwordEncoder.encode(rawPassword));
                        return userRepository.save(existing);
                    }
                    return Mono.just(existing);
                })
                .switchIfEmpty(Mono.defer(() -> {
                    User u = new User();
                    u.setEmail(login);
                    u.setPasswordHash(passwordEncoder.encode(rawPassword));
                    u.setWebhookSecret(UUID.randomUUID().toString());
                    u.setCreatedAt(LocalDateTime.now());
                    return userRepository.save(u);
                }))
                .onErrorResume(e -> Mono.empty());
    }

    private boolean verifyPassword(String rawPassword, String storedHash) {
        if (storedHash == null) return false;
        if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
            return passwordEncoder.matches(rawPassword, storedHash);
        }
        return rawPassword.equals(storedHash);
    }

    private String extractLogin(Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isBlank()) {
            email = request.get("login");
        }
        return email != null ? email.trim() : null;
    }

    @PostMapping("/register")
    public Mono<ResponseEntity<Object>> register(@RequestBody Map<String, String> request) {
        String email = extractLogin(request);
        String password = request.get("password");

        if (email == null || password == null || email.isBlank() || password.isBlank()) {
            return Mono.just(ResponseEntity.badRequest().body((Object) Map.of("error", "Заполните логин и пароль")));
        }

        return userRepository.findByEmail(email)
                .map(existsUser -> ResponseEntity.status(HttpStatus.CONFLICT)
                        .body((Object) Map.of("error", "Пользователь с таким логином уже зарегистрирован в БД")))
                .switchIfEmpty(Mono.defer(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setPasswordHash(passwordEncoder.encode(password));
                    newUser.setWebhookSecret(UUID.randomUUID().toString());
                    newUser.setCreatedAt(LocalDateTime.now());

                    return userRepository.save(newUser)
                            .map(savedUser -> {
                                String token = jwtUtil.generateToken(savedUser.getId().toString());

                                ResponseCookie cookie = ResponseCookie.from("jwt-token", token)
                                        .httpOnly(true)
                                        .secure(false)
                                        .path("/")
                                        .sameSite("Lax")
                                        .maxAge(86400)
                                        .build();

                                return ResponseEntity.status(HttpStatus.CREATED)
                                        .header(HttpHeaders.SET_COOKIE, cookie.toString())
                                        .body((Object) Map.of(
                                                "message", "Регистрация прошла успешно",
                                                "id", savedUser.getId(),
                                                "email", savedUser.getEmail(),
                                                "login", savedUser.getEmail(),
                                                "token", token,
                                                "webhook_secret", savedUser.getWebhookSecret()
                                        ));
                            });
                }));
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<Object>> login(@RequestBody Map<String, String> request) {
        String email = extractLogin(request);
        String password = request.get("password");

        if (email == null || password == null) {
            return Mono.just(ResponseEntity.badRequest().body((Object) Map.of("error", "Введите логин и пароль")));
        }

        return seedDefaultUsersThenFind(email)
                .map(user -> {
                    if (verifyPassword(password, user.getPasswordHash())) {
                        String token = jwtUtil.generateToken(user.getId().toString());

                        ResponseCookie cookie = ResponseCookie.from("jwt-token", token)
                                .httpOnly(true)
                                .secure(false)
                                .path("/")
                                .sameSite("Lax")
                                .maxAge(86400)
                                .build();

                        return ResponseEntity.ok()
                                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                                .body((Object) Map.of(
                                        "message", "Успешный вход",
                                        "id", user.getId(),
                                        "email", user.getEmail(),
                                        "login", user.getEmail(),
                                        "token", token,
                                        "webhook_secret", user.getWebhookSecret() != null ? user.getWebhookSecret() : ""
                                ));
                    } else {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body((Object) Map.of("error", "Ошибка авторизации: неверный логин или пароль"));
                    }
                })
                .map(response -> (ResponseEntity<Object>) response)
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body((Object) Map.of("error", "Ошибка авторизации: неверный логин или пароль")));
    }

    private Mono<User> seedDefaultUsersThenFind(String email) {
        return userRepository.findByEmail(email)
                .switchIfEmpty(Mono.defer(() -> {
                    if ("sarioglo".equalsIgnoreCase(email)) {
                        return seedOrUpgradeUser("sarioglo", "123456");
                    } else if ("admin".equalsIgnoreCase(email)) {
                        return seedOrUpgradeUser("admin", "admin123");
                    }
                    return Mono.empty();
                }));
    }

    @GetMapping("/me")
    public Mono<ResponseEntity<Object>> me(ServerHttpRequest request) {
        String token = null;
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        }
        if (token == null || token.isEmpty()) {
            HttpCookie jwtCookie = request.getCookies().getFirst("jwt-token");
            if (jwtCookie != null) {
                token = jwtCookie.getValue();
            }
        }

        if (token == null || !jwtUtil.validateToken(token)) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body((Object) Map.of("error", "Not authenticated")));
        }

        Claims claims = jwtUtil.getAllClaimsFromToken(token);
        Long userId = Long.parseLong(claims.getSubject());

        return userRepository.findById(userId)
                .map(user -> ResponseEntity.ok((Object) Map.of(
                        "id", user.getId(),
                        "email", user.getEmail(),
                        "login", user.getEmail()
                )))
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body((Object) Map.of("error", "User not found")));
    }

    @PostMapping("/logout")
    public Mono<ResponseEntity<Object>> logout() {
        ResponseCookie cookie = ResponseCookie.from("jwt-token", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .sameSite("Lax")
                .maxAge(0)
                .build();

        return Mono.just(ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body((Object) Map.of("message", "Выход выполнен")));
    }
}
