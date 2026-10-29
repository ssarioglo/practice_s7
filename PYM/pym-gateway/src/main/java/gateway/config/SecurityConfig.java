package gateway.config;

import java.util.Arrays;

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

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean("JwtAuthenticationFilterFactory")
    public JwtAuthenticationFilterFactory jwtAuthenticationFilterFactory() {
        return new JwtAuthenticationFilterFactory();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // КРИТИЧЕСКИ ВАЖНО: Разрешаем передачу кук и учетных данных
        config.setAllowCredentials(true); 
        
        // Указываем точный источник (wildcard * при Credentials=true использовать нельзя)
        config.addAllowedOrigin("http://localhost:3000"); 
        
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        
        // Разрешаем стандартные заголовки. Authorization можно оставить для совместимости.
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        
        // Кэшируем preflight-ответ на 1 час
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
                        // Открываем эндпоинты входа и регистрации
                        .pathMatchers("/api/v1/auth/**").permitAll()
                        // Открываем OPTIONS запросы
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        
                        // Маршруты к данным. Защиту теперь выполняет JwtAuthenticationFilterFactory через Cookie
                        .pathMatchers("/api/v1/rules/**", "/api/v1/forecast/**", "/api/v1/webhooks/**").permitAll()
                        
                        .anyExchange().authenticated()
                )
                .build();
    }
}


// Local storage auth

// package gateway.config;

// import java.util.Arrays;

// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.http.HttpMethod;
// import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
// import org.springframework.security.config.web.server.ServerHttpSecurity;
// import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
// import org.springframework.security.crypto.password.PasswordEncoder;
// import org.springframework.security.web.server.SecurityWebFilterChain;
// import org.springframework.web.cors.CorsConfiguration;
// import org.springframework.web.cors.reactive.CorsConfigurationSource;
// import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

// import gateway.security.JwtAuthenticationFilterFactory;

// @Configuration
// @EnableWebFluxSecurity
// public class SecurityConfig {

//     @Bean
//     public PasswordEncoder passwordEncoder() {
//         return new BCryptPasswordEncoder();
//     }

//     @Bean("JwtAuthenticationFilterFactory")
//     public JwtAuthenticationFilterFactory jwtAuthenticationFilterFactory() {
//         return new JwtAuthenticationFilterFactory();
//     }

//     @Bean
//     public CorsConfigurationSource corsConfigurationSource() {
//         CorsConfiguration config = new CorsConfiguration();
//         config.setAllowCredentials(true);
//         config.addAllowedOrigin("http://localhost:3000");
//         config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
//         config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
//         config.setMaxAge(3600L);

//         UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
//         source.registerCorsConfiguration("/**", config);
//         return source;
//     }

//     @Bean
//     public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http, CorsConfigurationSource corsSource) {
//         return http
//                 .cors(cors -> cors.configurationSource(corsSource))
//                 .csrf(ServerHttpSecurity.CsrfSpec::disable)
//                 .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
//                 .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
//                 .authorizeExchange(exchanges -> exchanges
//                         // 1. Открываем эндпоинты входа и регистрации
//                         .pathMatchers("/api/v1/auth/**").permitAll()
//                         // 2. Открываем предзапросы браузера OPTIONS
//                         .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        
//                         // ИСПРАВЛЕНИЕ ДЛЯ ТЗ ПУНКТА 2.5: Открываем эти маршруты на уровне Spring Security.
//                         // Теперь Spring Security пропустит их, и за их защиту возьмется наш JwtAuthenticationFilterFactory!
//                         .pathMatchers("/api/v1/rules/**", "/api/v1/forecast/**", "/api/v1/webhooks/**").permitAll()
                        
//                         // Все остальные гипотетические маршруты шлюза требуют проверки
//                         .anyExchange().authenticated()
//                 )
//                 .build();
//     }
// }
