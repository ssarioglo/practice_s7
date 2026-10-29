package gateway.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import gateway.security.JwtAuthenticationFilterFactory;

// конфиг безопасности и маршрутизации запросов в сервис данных
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Value("${data.service.url:http://pym-data-service:9801}")
    private String dataServiceUrl;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // настраиваем проброс всех запросов /api/v1/* в го-сервис через фильтр jwt
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder, JwtAuthenticationFilterFactory jwtFilter) {
        return builder.routes()
                .route("data_service_route", r -> r
                        .path(
                                "/api/v1/state",
                                "/api/v1/state/**",
                                "/api/v1/profile",
                                "/api/v1/profile/**",
                                "/api/v1/rules",
                                "/api/v1/rules/**",
                                "/api/v1/counterparties",
                                "/api/v1/counterparties/**",
                                "/api/v1/import",
                                "/api/v1/import/**",
                                "/api/v1/demo-reset",
                                "/api/v1/demo-reset/**",
                                "/api/v1/forecast",
                                "/api/v1/forecast/**",
                                "/api/v1/webhooks/**"
                        )
                        .filters(f -> f.filter(jwtFilter.apply(new JwtAuthenticationFilterFactory.Config())))
                        .uri(dataServiceUrl)
                )
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOriginPatterns(Arrays.asList("http://localhost:*", "http://127.0.0.1:*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http, CorsConfigurationSource corsSource) {
        return http
                .cors(cors -> cors.configurationSource(corsSource))
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers("/api/v1/auth/**").permitAll()
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers(
                                "/api/v1/state/**",
                                "/api/v1/profile/**",
                                "/api/v1/rules/**",
                                "/api/v1/counterparties/**",
                                "/api/v1/import/**",
                                "/api/v1/demo-reset/**",
                                "/api/v1/forecast/**",
                                "/api/v1/webhooks/**"
                        ).permitAll()
                        .anyExchange().authenticated()
                )
                .build();
    }
}
