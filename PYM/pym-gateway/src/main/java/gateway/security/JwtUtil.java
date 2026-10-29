package gateway.security;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

// утилка для работы с jwt токенами, генерация и проверка подписи
@Component
public class JwtUtil {

    // секрет для подписи токена, берем из настроек или дефолтный
    @Value("${jwt.secret:pym-super-secret-jwt-key-for-signing-tokens-practice-s7-2026-very-secure-key}")
    private String secret;

    // время жизни токена в секундах (24 часа)
    @Value("${jwt.expiration:86400}")
    private Long expirationTime;

    // генерируем ключ нужной длины для алгоритма HS256
    private Key getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // генерация токена для пользователя по его id
    public String generateToken(String userId) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, userId);
    }

    // сборка токена с датой выдачи и экспирацией
    private String createToken(Map<String, Object> claims, String subject) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationTime * 1000L))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // достаем все клеймы из токена
    public Claims getAllClaimsFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // проверяем валидность токена и не протух ли он
    public boolean validateToken(String token) {
        try {
            Claims claims = getAllClaimsFromToken(token);
            return claims != null && !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            // если кривой токен или подпись не сошлась
            return false;
        }
    }

    // достаем id юзера
    public String getUserIdFromToken(String token) {
        return getAllClaimsFromToken(token).getSubject();
    }

    // достаем произвольный клейм если надо
    public <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }
}
