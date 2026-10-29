package gateway.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import reactor.core.publisher.Mono;

@Component("JwtAuthenticationFilterFactory")
public class JwtAuthenticationFilterFactory extends AbstractGatewayFilterFactory<JwtAuthenticationFilterFactory.Config> {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilterFactory.class);

    @Autowired
    private JwtUtil jwtUtil;

    public static class Config {}

    public JwtAuthenticationFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String path = request.getURI().getPath();

            logger.info(">>> [GATEWAY] Обработка запроса к: {}", path);

            // Пропускаем OPTIONS запросы (Preflight браузера)
            if (request.getMethod() == HttpMethod.OPTIONS) {
                return chain.filter(exchange);
            }

            // ИСПРАВЛЕНИЕ: Ищем куку вместо заголовка Authorization
            HttpCookie jwtCookie = request.getCookies().getFirst("jwt-token");
            
            if (jwtCookie == null) {
                logger.warn("!!! [GATEWAY] JWT Cookie отсутствует для пути: {}", path);
                return onError(exchange, HttpStatus.UNAUTHORIZED);
            }

            String token = jwtCookie.getValue();
            logger.info(">>> [GATEWAY] Токен извлечен из Cookie");

            // Валидация токена через JwtUtil (логика подписи остается прежней)
            if (!jwtUtil.validateToken(token)) {
                logger.error("!!! [GATEWAY] Токен в Cookie не прошел валидацию");
                return onError(exchange, HttpStatus.UNAUTHORIZED);
            }

            Claims claims = jwtUtil.getAllClaimsFromToken(token);
            String userId = claims.getSubject();
            
            logger.info("<<< [GATEWAY] Токен валиден. UserID: {}. Проброс в Go-сервис.", userId);

            // Пробрасываем UserID во внутренний контур (Go-сервис по-прежнему ждет X-User-Id)
            ServerHttpRequest mutatedRequest = request.mutate()
                    .header("X-User-Id", userId)
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        };
    }

    private Mono<Void> onError(org.springframework.web.server.ServerWebExchange exchange, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        return response.setComplete();
    }
}



// Local storage auth

// package gateway.security;

// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.cloud.gateway.filter.GatewayFilter;
// import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
// import org.springframework.http.HttpHeaders;
// import org.springframework.http.HttpMethod;
// import org.springframework.http.HttpStatus;
// import org.springframework.http.server.reactive.ServerHttpRequest;
// import org.springframework.http.server.reactive.ServerHttpResponse;
// import org.springframework.stereotype.Component;

// import io.jsonwebtoken.Claims;
// import reactor.core.publisher.Mono;

// @Component("JwtAuthenticationFilterFactory")
// public class JwtAuthenticationFilterFactory extends AbstractGatewayFilterFactory<JwtAuthenticationFilterFactory.Config> {

//     private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilterFactory.class);

//     @Autowired
//     private JwtUtil jwtUtil;

//     public static class Config {}

//     public JwtAuthenticationFilterFactory() {
//         super(Config.class);
//     }

//     @Override
//     public GatewayFilter apply(Config config) {
//         return (exchange, chain) -> {
//             ServerHttpRequest request = exchange.getRequest();
//             String path = request.getURI().getPath();

//             // ЛОГ №1: Фиксация самого факта входа в фильтр
//             logger.info(">>> [GATEWAY] Обработка запроса к: {}", path);

//             if (request.getMethod() == HttpMethod.OPTIONS) {
//                 logger.info("<<< [GATEWAY] Пропуск OPTIONS запроса без проверки JWT");
//                 return chain.filter(exchange);
//             }

//             String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            
//             // ЛОГ №2: Проверка заголовка
//             if (authHeader == null) {
//                 logger.warn("!!! [GATEWAY] Заголовок Authorization отсутствует для пути: {}", path);
//                 return onError(exchange, HttpStatus.UNAUTHORIZED);
//             }

//             logger.info(">>> [GATEWAY] Получен заголовок: {}", authHeader);

//             if (!authHeader.startsWith("Bearer ")) {
//                 logger.warn("!!! [GATEWAY] Неверный формат токена (отсутствует Bearer)");
//                 return onError(exchange, HttpStatus.UNAUTHORIZED);
//             }

//             String token = authHeader.substring(7);
            
//             if (!jwtUtil.validateToken(token)) {
//                 logger.error("!!! [GATEWAY] Токен не прошел валидацию (истек или неверная подпись)");
//                 return onError(exchange, HttpStatus.UNAUTHORIZED);
//             }

//             Claims claims = jwtUtil.getAllClaimsFromToken(token);
//             String userId = claims.getSubject();
            
//             logger.info("<<< [GATEWAY] Токен валиден. UserID: {}. Проброс в Go-сервис.", userId);

//             ServerHttpRequest mutatedRequest = request.mutate()
//                     .header("X-User-Id", userId)
//                     .build();

//             return chain.filter(exchange.mutate().request(mutatedRequest).build());
//         };
//     }

//     private Mono<Void> onError(org.springframework.web.server.ServerWebExchange exchange, HttpStatus status) {
//         ServerHttpResponse response = exchange.getResponse();
//         response.setStatusCode(status);
//         return response.setComplete();
//     }
// }

