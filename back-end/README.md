# Task List App

## Overview

This project is a full-stack task management application built with Spring Boot, React, and MongoDB. Users can register, log in, create tasks, update tasks, mark tasks as complete, and delete tasks. Authentication is handled using cookies and session tokens stored in MongoDB.

---

# Technologies Used

* Java
* Spring Boot
* React
* MongoDB
* Maven

---

# Features

* User registration
* User login with authentication cookie
* Create tasks
* Update tasks
* Mark tasks as complete/incomplete
* Delete tasks
* View all tasks for the logged-in user
* Share tasks with other registered users
* Real-time notifications for task sharing and task completion

---

# Backend Features

## Authentication

* Register new users
* Login validation
* Session token creation
* Cookie-based authentication

## Task Management

* Create new tasks
* Edit task information
* Toggle completion status
* Delete tasks
* Retrieve all user tasks
* Share tasks with other registered users
* Notify recipient when a task is shared with them
* Notify task owner when a shared user marks a task complete

---

# Database Collections

## users

Stores:

* username
* password hash

## tasks

Stores:

* title
* description
* due date
* priority
* completion status
* associated username
* sharedWith (list of usernames the task has been shared with)

## auth_tokens

Stores:

* session token
* expiration time
* associated username

## notifications

Stores:

* message
* recipient username
* sender username
* task title
* read status

---

# API Endpoints

## Authentication

* POST /register
* POST /login
* GET /user

## Tasks

* POST /createTask
* PUT /updateTask
* PUT /completeTask
* DELETE /deleteTask
* GET /getAllTasks
* PUT /shareTask
* GET /getNotifications
* PUT /markNotificationsRead
* DELETE /deleteNotification
* DELETE /clearAllNotifications
* POST /logout

---

# Team Contributions

This application was collaboratively developed by a four-person team. Contributions spanned backend endpoints, MongoDB persistence, authentication validation, task creation and editing, task ordering, task sharing, notifications, and the corresponding frontend workflows.

Key team-delivered capabilities include:

* task creation, retrieval, editing, completion, deletion, and custom ordering
* task sharing and notification workflows
* authentication and session handling
* frontend validation, loading states, feedback, task management, and dashboard interactions
---

# How to Run Backend

1. Start MongoDB locally on port 27017
2. Run:
   mvn spring-boot:run
3. Backend runs on:
   http://localhost:8080

---

# Frontend

The React frontend communicates with the backend through REST API endpoints and displays task data dynamically for the logged-in user.

