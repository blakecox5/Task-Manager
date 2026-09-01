package edu.sfsu.app.dto;

public class UserResponse {

    private String userName;

    public UserResponse(String userName) {
        this.userName = userName;
    }

    public String getUserName() { return userName; }
}
