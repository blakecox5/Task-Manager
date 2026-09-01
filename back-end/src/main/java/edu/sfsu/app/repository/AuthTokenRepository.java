package edu.sfsu.app.repository;

import edu.sfsu.app.model.AuthToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AuthTokenRepository extends MongoRepository<AuthToken, String> {
    Optional<AuthToken> findByToken(String token);
}
