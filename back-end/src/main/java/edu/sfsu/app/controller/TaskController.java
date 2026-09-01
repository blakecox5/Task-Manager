package edu.sfsu.app.controller;

import edu.sfsu.app.dto.ApiResponse;
import edu.sfsu.app.model.AuthToken;
import edu.sfsu.app.model.Notification;
import edu.sfsu.app.model.TaskModel;
import edu.sfsu.app.model.User;
import edu.sfsu.app.repository.AuthTokenRepository;
import edu.sfsu.app.repository.NotificationRepository;
import edu.sfsu.app.repository.TaskRepository;
import edu.sfsu.app.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;


@RestController
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private AuthTokenRepository authTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    public record CreateTaskDto(String title,
                                String description,
                                LocalDate dueDate,
                                String priority) {}

    public record DeleteTaskDto(String id) {}

    public record ToggleCompleteTaskDto(String id) {}

    public record UpdateTaskDto(String id,
                                String title,
                                String description,
                                Boolean completed,
                                LocalDate dueDate,
                                String priority) {}

    public record ShareTaskDto(String taskId, String targetUserName) {}

    public record DeleteNotificationDto(String id) {}

    public record ReorderTasksDto(List<String> orderedIds) {}

    // create a new task, set all necessary fields, save in database
    @PostMapping("/createTask")
    public ResponseEntity<ApiResponse<Object>> createTask(
            @RequestBody CreateTaskDto body, HttpServletRequest request) {

        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        if (body.description() == null || body.description().isBlank() || body.title() == null ||
                body.title().isBlank() || body.priority() == null || body.priority().isBlank()
                || body.dueDate() == null) {
            return error(400, "Invalid body");
        }

        TaskModel task = new TaskModel();
        task.setCompleted(false);
        task.setDescription(body.description());
        task.setTitle(body.title());
        task.setPriority(body.priority());
        task.setDueDate(body.dueDate());
        task.setUserName(authToken.getUserName());

        taskRepository.save(task);
        return success(task);
    }


    // delete a task that belongs to the logged-in user
    @DeleteMapping("/deleteTask")
    public ResponseEntity<ApiResponse<Object>> deleteTask(
            @RequestBody DeleteTaskDto body, HttpServletRequest request) {

        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        if (body.id() == null || body.id().isBlank()) {
            return error(400, "Invalid body");
        }

        Optional<TaskModel> taskLookup = taskRepository.findById(body.id());
        if (taskLookup.isEmpty()) {
            return error(404, "Task not found");
        }

        TaskModel task = taskLookup.get();
        if (!authToken.getUserName().equals(task.getUserName())) {
            return error(403, "Not your task");
        }

        taskRepository.delete(task);
        return ResponseEntity.ok(new ApiResponse<>(true, null, "Task deleted successfully!"));
    }


    // toggle a task complete — if a shared user completes it, notify the owner
    @PutMapping("/completeTask")
    public ResponseEntity<ApiResponse<Object>> toggleCompleteTask(
            @RequestBody ToggleCompleteTaskDto body, HttpServletRequest request) {

        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        if (body.id() == null || body.id().isBlank()) {
            return error(400, "Invalid body");
        }

        Optional<TaskModel> taskLookup = taskRepository.findById(body.id());
        if (taskLookup.isEmpty()) {
            return error(404, "Task not found");
        }

        TaskModel task = taskLookup.get();
        String requester = authToken.getUserName();

        boolean isOwner = requester.equals(task.getUserName());
        boolean isSharedUser = task.getSharedWith() != null &&
                task.getSharedWith().contains(requester);

        if (!isOwner && !isSharedUser) {
            return error(403, "Not your task");
        }

        boolean wasCompleted = task.isCompleted();
        task.setCompleted(!wasCompleted);
        taskRepository.save(task);

        // notify the task owner when a shared user marks it complete
        if (isSharedUser && !wasCompleted) {
            Notification notification = new Notification();
            notification.setOwnerUserName(task.getUserName());
            notification.setCompletedBy(requester);
            notification.setTaskTitle(task.getTitle());
            notification.setMessage(requester + " " +
                    "completed your task: \"" + task.getTitle() + "\"");
            notification.setRead(false);
            notificationRepository.save(notification);
        }

        return ResponseEntity.ok(new ApiResponse<>(true, task, "Task completion status changed"));
    }


    // update/edit fields of the task
    @PutMapping("/updateTask")
    public ResponseEntity<ApiResponse<Object>> updateTask(
            @RequestBody UpdateTaskDto updateTaskDto,
            HttpServletRequest request) {

        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        if (updateTaskDto.title() != null && updateTaskDto.title().isBlank()) {
            return error(400, "Task title required");
        }

        if (updateTaskDto.id() == null || updateTaskDto.id().isBlank()) {
            return error(400, "Task ID required");
        }

        Optional<TaskModel> taskOpt = taskRepository.findById(updateTaskDto.id());
        if (taskOpt.isEmpty()) {
            return error(404, "Task not found");
        }

        TaskModel task = taskOpt.get();
        if (!authToken.getUserName().equals(task.getUserName())) {
            return error(403, "Not your task");
        }

        if (updateTaskDto.title() != null) task.setTitle(updateTaskDto.title());
        if (updateTaskDto.description() != null) task.setDescription(updateTaskDto.description());
        if (updateTaskDto.completed() != null) task.setCompleted(updateTaskDto.completed());
        if (updateTaskDto.dueDate() != null) task.setDueDate(updateTaskDto.dueDate());
        if (updateTaskDto.priority() != null) task.setPriority(updateTaskDto.priority());

        taskRepository.save(task);
        return success(task);
    }


    // get all tasks belonging to OR shared with the logged-in user
    @GetMapping("/getAllTasks")
    public ResponseEntity<ApiResponse<Object>> getAllTasks(HttpServletRequest request) {
        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        List<TaskModel> ownedTasks = taskRepository.findByUserName(authToken.getUserName());
        List<TaskModel> sharedTasks =
                taskRepository.findBySharedWithContaining(authToken.getUserName());

        List<TaskModel> allTasks = new ArrayList<>(ownedTasks);
        allTasks.addAll(sharedTasks);

        return success(allTasks);
    }

    // reorders tasks for sort
    @PutMapping("/reorderTasks")
    public ResponseEntity<ApiResponse<Object>> reorderTasks( @RequestBody ReorderTasksDto body, HttpServletRequest request) {
        AuthToken authToken = checkAuth(request);
        if (authToken == null) return error(401, "Unauthorized");
        if (body.orderedIds() == null) return error(400, "orderedIds required");

        Optional<User> userOpt = userRepository.findByUserName(authToken.getUserName());
        if (userOpt.isEmpty()) return error(404, "User not found");
        User user = userOpt.get();
        user.setTaskOrder(body.orderedIds());
        userRepository.save(user);

        return success("Order saved");
    }

    // get reordered tasks
    @GetMapping("/getTasksOrdered")
    public ResponseEntity<ApiResponse<Object>> getTasksOrdered(HttpServletRequest request) {
        AuthToken authToken = checkAuth(request);
        if (authToken == null) return error(401, "Unauthorized");

        List<TaskModel> ownedTasks  = taskRepository.findByUserName(authToken.getUserName());
        List<TaskModel> sharedTasks = taskRepository.findBySharedWithContaining(authToken.getUserName());

        List<TaskModel> allTasks = new ArrayList<>(ownedTasks);
        allTasks.addAll(sharedTasks);

        Optional<User> user = userRepository.findByUserName(authToken.getUserName());
        if (user.isPresent()) {
            List<String> order = user.get().getTaskOrder();

            if (order != null && !order.isEmpty()) {
                Map<String, Integer> indexMap = new HashMap<>();
                for (int i = 0; i < order.size(); i++) indexMap.put(order.get(i), i);
                allTasks.sort((a, b) -> Integer.compare(
                    indexMap.getOrDefault(a.getId(), Integer.MAX_VALUE),
                    indexMap.getOrDefault(b.getId(), Integer.MAX_VALUE)
                ));
            }
        }
        return success(allTasks);
    }

    // share a task with another registered user — notify the recipient
    @PutMapping("/shareTask")
    public ResponseEntity<ApiResponse<Object>> shareTask(
            @RequestBody ShareTaskDto body, HttpServletRequest request) {

        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        if (body.taskId() == null || body.taskId().isBlank()
                || body.targetUserName() == null || body.targetUserName().isBlank()) {
            return error(400, "taskId and targetUserName are required");
        }

        Optional<TaskModel> taskOpt = taskRepository.findById(body.taskId());
        if (taskOpt.isEmpty()) {
            return error(404, "Task not found");
        }

        TaskModel task = taskOpt.get();

        if (!authToken.getUserName().equals(task.getUserName())) {
            return error(403, "You do not own this task");
        }

        if (body.targetUserName().equals(authToken.getUserName())) {
            return error(400, "Cannot share a task with yourself");
        }

        Optional<User> targetUserOpt = userRepository.findByUserName(body.targetUserName());
        if (targetUserOpt.isEmpty()) {
            return error(404, "User not found");
        }

        List<String> sharedWith = task.getSharedWith();
        if (sharedWith == null) sharedWith = new ArrayList<>();
        if (!sharedWith.contains(body.targetUserName())) {
            sharedWith.add(body.targetUserName());
            task.setSharedWith(sharedWith);
            taskRepository.save(task);

            // notify the recipient that a task was shared with them
            Notification notification = new Notification();
            notification.setOwnerUserName(body.targetUserName());
            notification.setCompletedBy(authToken.getUserName());
            notification.setTaskTitle(task.getTitle());
            notification.setMessage(authToken.getUserName() +
                    " shared a task with you: \"" + task.getTitle() + "\"");
            notification.setRead(false);
            notificationRepository.save(notification);
        }

        return success("Task shared with " + body.targetUserName());
    }


    // get all notifications for the logged-in user
    @GetMapping("/getNotifications")
    public ResponseEntity<ApiResponse<Object>> getNotifications(HttpServletRequest request) {
        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        List<Notification> notifications =
                notificationRepository.findByOwnerUserName(authToken.getUserName());
        return success(notifications);
    }


    // mark all notifications as read for the logged-in user
    @PutMapping("/markNotificationsRead")
    public ResponseEntity<ApiResponse<Object>> markNotificationsRead(HttpServletRequest request) {
        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        List<Notification> notifications =
                notificationRepository.findByOwnerUserName(authToken.getUserName());
        for (Notification n : notifications) {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        }

        return success("Notifications marked as read");
    }


    // delete a single notification belonging to the logged-in user
    @DeleteMapping("/deleteNotification")
    public ResponseEntity<ApiResponse<Object>> deleteNotification(
            @RequestBody DeleteNotificationDto body, HttpServletRequest request) {

        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        if (body.id() == null || body.id().isBlank()) {
            return error(400, "Notification ID required");
        }

        Optional<Notification> notifOpt = notificationRepository.findById(body.id());
        if (notifOpt.isEmpty()) {
            return error(404, "Notification not found");
        }

        // verify the notification belongs to the logged-in user
        Notification notification = notifOpt.get();
        if (!notification.getOwnerUserName().equals(authToken.getUserName())) {
            return error(403, "Not your notification");
        }

        notificationRepository.delete(notification);
        return success("Notification deleted");
    }


    // delete all notifications for the logged-in user
    @DeleteMapping("/clearAllNotifications")
    public ResponseEntity<ApiResponse<Object>> clearAllNotifications(HttpServletRequest request) {
        AuthToken authToken = checkAuth(request);
        if (authToken == null) {
            return error(401, "Unauthorized");
        }

        List<Notification> notifications =
                notificationRepository.findByOwnerUserName(authToken.getUserName());
        notificationRepository.deleteAll(notifications);

        return success("All notifications cleared");
    }


    private AuthToken checkAuth(HttpServletRequest parsedRequest) {
        if (parsedRequest.getCookies() == null || parsedRequest.getCookies().length == 0) {
            return null;
        }
        String token = Arrays.stream(parsedRequest.getCookies())
                .filter(cookie -> cookie.getName().equals("auth"))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);

        if (token == null) return null;

        Optional<AuthToken> authTokenOpt = authTokenRepository.findByToken(token);
        if (authTokenOpt.isEmpty()) return null;

        AuthToken authToken = authTokenOpt.get();
        if (authToken.getExpireTime() < Instant.now().getEpochSecond()) {
            authTokenRepository.delete(authToken);
            return null;
        }

        return authToken;
    }

    private ResponseEntity<ApiResponse<Object>> success(Object data) {
        return ResponseEntity.ok(new ApiResponse<>(true, data, null));
    }

    private ResponseEntity<ApiResponse<Object>> error(int code, String message) {
        return ResponseEntity.status(code).body(new ApiResponse<>(false, null, message));
    }
}
