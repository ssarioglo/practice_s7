package gateway.repository;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import gateway.model.User;
import reactor.core.publisher.Mono;

@Repository
public interface UserRepository extends ReactiveCrudRepository<User, Long> {
    // Mono — это реактивная обёртка, которая вернёт либо 1 пользователя, либо пустоту
    Mono<User> findByEmail(String email);
}