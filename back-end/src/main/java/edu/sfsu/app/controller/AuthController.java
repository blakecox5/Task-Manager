package edu.sfsu.app.controller;

import edu.sfsu.app.dto.ApiResponse;
import edu.sfsu.app.dto.AuthRequest;
import edu.sfsu.app.dto.UserResponse;
import edu.sfsu.app.model.AuthToken;
import edu.sfsu.app.model.User;
import edu.sfsu.app.repository.AuthTokenRepository;
import edu.sfsu.app.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;

@RestController
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthTokenRepository authTokenRepository;

    // POST /register
    // Body: { "userName": "alice", "password": "secret" }
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Object>> register(@RequestBody AuthRequest body) {
        if (body.getUserName() == null || body.getUserName().isBlank()
                || body.getPassword() == null || body.getPassword().isBlank()) {
            return error(400, "userName and password are required");
        }

        if (userRepository.findByUserName(body.getUserName()).isPresent()) {
            return error(400, "Username already taken");
        }

        User user = new User();
        user.setUserName(body.getUserName());
        user.setPassword(DigestUtils.sha256Hex(body.getPassword()));
        userRepository.save(user);

        return success(null);
    }

    // POST /login
    // Body: { "userName": "alice", "password": "secret" }
    // Sets an "auth" cookie on success
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Object>> login(
            @RequestBody AuthRequest body,
            HttpServletResponse response) {

        if (body.getUserName() == null || body.getUserName().isBlank()
                || body.getPassword() == null || body.getPassword().isBlank()) {
            return error(400, "userName and password are required");
        }

        Optional<User> userOpt = userRepository.findByUserName(body.getUserName());
        if (userOpt.isEmpty() || !userOpt.get().getPassword()
                .equals(DigestUtils.sha256Hex(body.getPassword()))) {
            return error(401, "Invalid credentials");
        }

        long expireTime = Instant.now().getEpochSecond() + 86400;
        String token = DigestUtils.sha256Hex(body.getUserName() + expireTime);

        AuthToken authToken = new AuthToken();
        authToken.setUserName(body.getUserName());
        authToken.setToken(token);
        authToken.setExpireTime(expireTime);
        authTokenRepository.save(authToken);

        Cookie cookie = new Cookie("auth", token);
        cookie.setMaxAge(86400);
        cookie.setPath("/");
        response.addCookie(cookie);

        return success(new UserResponse(body.getUserName()));
    }

     // POST /logout
    // Deletes "auth" cookie and logs user out
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Object>> logout(HttpServletRequest request, HttpServletResponse response) {
        String token = getCookieValue(request, "auth");
        if (token != null) {
            authTokenRepository.findByToken(token).ifPresent(authTokenRepository::delete);
        }

        Cookie cookie = new Cookie("auth", "");
        cookie.setMaxAge(0);
        cookie.setPath("/");
        response.addCookie(cookie);

        return success(null);
    }

    // GET /user
    // Reads the "auth" cookie and returns the logged-in user's info
    @GetMapping("/user")
    public ResponseEntity<ApiResponse<Object>> getUser(HttpServletRequest request) {
        String token = getCookieValue(request, "auth");
        if (token == null) {
            return error(401, "Not logged in");
        }

        Optional<AuthToken> authTokenOpt = authTokenRepository.findByToken(token);
        if (authTokenOpt.isEmpty()) {
            return error(401, "Invalid or expired session");
        }

        AuthToken authToken = authTokenOpt.get();
        if (authToken.getExpireTime() < Instant.now().getEpochSecond()) {
            authTokenRepository.delete(authToken);
            return error(401, "Session expired");
        }

        Optional<User> userOpt = userRepository.findByUserName(authToken.getUserName());
        if (userOpt.isEmpty()) {
            return error(404, "User not found");
        }

        return success(new UserResponse(userOpt.get().getUserName()));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private String getCookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> c.getName().equals(name))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private ResponseEntity<ApiResponse<Object>> success(Object data) {
        return ResponseEntity.ok(new ApiResponse<>(true, data, null));
    }

    private ResponseEntity<ApiResponse<Object>> error(int code, String message) {
        return ResponseEntity.status(code).body(new ApiResponse<>(false, null, message));
    }
}
