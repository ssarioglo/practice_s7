package gateway.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import reactor.core.publisher.Mono;

// фильтр для проверки jwt токена из куки или заголовка Authorization
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

            // пропускаем preflight запросы и вебхуки
            if (request.getMethod() == HttpMethod.OPTIONS || path.startsWith("/api/v1/webhooks/")) {
                return chain.filter(exchange);
            }

            // ищем токен сначала в заголовке Authorization, потом в куках
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

            if (token == null || token.isEmpty()) {
                logger.warn("нет jwt токена для запроса: {}", path);
                return onError(exchange, HttpStatus.UNAUTHORIZED);
            }

            if (!jwtUtil.validateToken(token)) {
                logger.warn("невалидный jwt токен для запроса: {}", path);
                return onError(exchange, HttpStatus.UNAUTHORIZED);
            }

            Claims claims = jwtUtil.getAllClaimsFromToken(token);
            String userId = claims.getSubject();

            // передаем X-User-Id дальше в го-сервис
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
