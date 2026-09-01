package edu.sfsu.app.dto;

public class ApiResponse<T> {

    private boolean status;
    private T data;
    private String error;

    public ApiResponse(boolean status, T data, String error) {
        this.status = status;
        this.data = data;
        this.error = error;
    }

    public boolean isStatus() { return status; }
    public T getData() { return data; }
    public String getError() { return error; }
}
