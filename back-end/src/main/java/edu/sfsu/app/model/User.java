package edu.sfsu.app.model;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userName;

    private String password;

    private List<String> taskOrder = new ArrayList<>();

    public String getId() { return id; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public List<String> getTaskOrder() { return taskOrder; }
    public void setTaskOrder(List<String> taskOrder) { this.taskOrder = taskOrder; }
}
