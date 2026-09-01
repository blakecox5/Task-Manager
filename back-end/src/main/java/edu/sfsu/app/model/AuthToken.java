package edu.sfsu.app.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "auth_tokens")
public class AuthToken {

    @Id
    private String id;

    private String userName;
    private String token;
    private long expireTime;

    public String getId() { return id; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public long getExpireTime() { return expireTime; }
    public void setExpireTime(long expireTime) { this.expireTime = expireTime; }
}
