package gateway.security;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {

    // ИСПРАВЛЕНИЕ: Делаем строку и ключ финальными и статическими. Убираем капризный @PostConstruct.
    private static final String SECRET_STRING = "your-super-secret-key-that-must-be-very-long-and-secure-for-pym-project-256-bits";
    private static final Key KEY = Keys.hmacShaKeyFor(SECRET_STRING.getBytes());

    // Время жизни токена — 24 часа
    private static final long EXPIRATION_TIME = 86400000; 

    // Извлечение всех данных (Claims) из токена
    public Claims getAllClaimsFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(KEY) // Используем статический KEY
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // Проверка, не истёк ли токен по времени
    public boolean isTokenExpired(String token) {
        try {
            return getAllClaimsFromToken(token).getExpiration().before(new Date());
        } catch (Exception e) {
            return true; // Если токен поврежден или не парсится — считаем его просроченным
        }
    }

    // Генерация токена для конкретного user_id
    public String generateToken(String userId) {
        Map<String, Object> claims = new HashMap<>();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(userId)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(KEY, SignatureAlgorithm.HS256) // Используем статический KEY
                .compact();
    }

    // Валидация токена
    public boolean validateToken(String token) {
        try {
            return !isTokenExpired(token);
        } catch (Exception e) {
            System.out.println("Критическая ошибка проверки подписи JWT в Docker: " + e.getMessage());
            return false;
        }
    }
}
