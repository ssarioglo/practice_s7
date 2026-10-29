package gateway.controller;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import gateway.model.User;
import gateway.repository.UserRepository;
import gateway.security.JwtUtil;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public Mono<ResponseEntity<Object>> register(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            return Mono.just(ResponseEntity.badRequest().body((Object) Map.of("error", "Заполните все поля")));
        }

        return userRepository.findByEmail(email)
                .map(existsUser -> ResponseEntity.status(HttpStatus.CONFLICT)
                        .body((Object) Map.of("error", "Пользователь с таким email уже существует")))
                .switchIfEmpty(Mono.defer(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setPasswordHash(passwordEncoder.encode(password));
                    newUser.setWebhookSecret(UUID.randomUUID().toString());
                    newUser.setCreatedAt(LocalDateTime.now());

                    return userRepository.save(newUser)
                            .map(savedUser -> {
                                String token = jwtUtil.generateToken(savedUser.getId().toString());
                                
                                // Создаем HttpOnly куку для регистрации
                                ResponseCookie cookie = ResponseCookie.from("jwt-token", token)
                                        .httpOnly(true)
                                        .secure(false) // false для работы по HTTP на localhost
                                        .path("/")
                                        .sameSite("Lax")
                                        .build();

                                return ResponseEntity.status(HttpStatus.CREATED)
                                        .header(HttpHeaders.SET_COOKIE, cookie.toString())
                                        .body((Object) Map.of(
                                                "message", "Регистрация прошла успешно",
                                                "email", savedUser.getEmail(),
                                                "webhook_secret", savedUser.getWebhookSecret()
                                        ));
                            });
                }));
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<Object>> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        return userRepository.findByEmail(email)
                .map(user -> {
                    if (passwordEncoder.matches(password, user.getPasswordHash())) {
                        String token = jwtUtil.generateToken(user.getId().toString());
                        
                        // Создаем HttpOnly куку для логина
                        ResponseCookie cookie = ResponseCookie.from("jwt-token", token)
                                .httpOnly(true)
                                .secure(false)
                                .path("/")
                                .sameSite("Lax")
                                .build();

                        return ResponseEntity.ok()
                                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                                .body((Object) Map.of(
                                        "message", "Успешный вход",
                                        "email", user.getEmail(),
                                        "webhook_secret", user.getWebhookSecret()
                                ));
                    } else {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body((Object) Map.of("error", "Неверный пароль"));
                    }
                })
                .map(response -> (ResponseEntity<Object>) response)
                .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body((Object) Map.of("error", "Пользователь не найден")));
    }
}


// Local storage auth

// package gateway.controller;

// import java.time.LocalDateTime;
// import java.util.Map;
// import java.util.UUID;

// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.http.HttpStatus;
// import org.springframework.http.ResponseEntity;
// import org.springframework.security.crypto.password.PasswordEncoder;
// import org.springframework.web.bind.annotation.PostMapping;
// import org.springframework.web.bind.annotation.RequestBody;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RestController;

// import gateway.model.User;
// import gateway.repository.UserRepository;
// import gateway.security.JwtUtil;
// import reactor.core.publisher.Mono;

// @RestController
// @RequestMapping("/api/v1/auth")
// public class AuthController {

//     @Autowired
//     private UserRepository userRepository;

//     @Autowired
//     private PasswordEncoder passwordEncoder;

//     @Autowired
//     private JwtUtil jwtUtil;

//     @PostMapping("/register")
//     public Mono<ResponseEntity<Object>> register(@RequestBody Map<String, String> request) {
//         String email = request.get("email");
//         String password = request.get("password");

//         if (email == null || password == null) {
//             return Mono.just(ResponseEntity.badRequest().body((Object) Map.of("error", "Заполните все поля")));
//         }

//         return userRepository.findByEmail(email)
//                 .map(existsUser -> ResponseEntity.status(HttpStatus.CONFLICT)
//                         .body((Object) Map.of("error", "Пользователь с таким email уже существует")))
//                 .switchIfEmpty(Mono.defer(() -> {
//                     User newUser = new User();
//                     newUser.setEmail(email);
//                     newUser.setPasswordHash(passwordEncoder.encode(password));
//                     newUser.setWebhookSecret(UUID.randomUUID().toString());
//                     newUser.setCreatedAt(LocalDateTime.now());

//                     return userRepository.save(newUser)
//                             .map(savedUser -> {
//                                 // ИСПРАВЛЕНИЕ: Генерируем токен и отдаем его СРАЗУ в ответе 201 Created!
//                                 String token = jwtUtil.generateToken(savedUser.getId().toString());
//                                 return ResponseEntity.status(HttpStatus.CREATED)
//                                         .body((Object) Map.of(
//                                                 "message", "Регистрация прошла успешно",
//                                                 "token", token,
//                                                 "email", savedUser.getEmail(),
//                                                 "webhook_secret", savedUser.getWebhookSecret()
//                                         ));
//                             });
//                 }));
//     }

//     @PostMapping("/login")
//     public Mono<ResponseEntity<Object>> login(@RequestBody Map<String, String> request) {
//         String email = request.get("email");
//         String password = request.get("password");

//         return userRepository.findByEmail(email)
//                 .map(user -> {
//                     if (passwordEncoder.matches(password, user.getPasswordHash())) {
//                         String token = jwtUtil.generateToken(user.getId().toString());
//                         return ResponseEntity.ok().body((Object) Map.of(
//                                 "token", token,
//                                 "email", user.getEmail(),
//                                 "webhook_secret", user.getWebhookSecret()
//                         ));
//                     } else {
//                         return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
//                                 .body((Object) Map.of("error", "Неверный пароль"));
//                     }
//                 })
//                 .map(response -> (ResponseEntity<Object>) response)
//                 .defaultIfEmpty(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
//                         .body((Object) Map.of("error", "Пользователь не найден")));
//     }
// }
