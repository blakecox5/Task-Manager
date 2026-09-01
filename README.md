# Task Manager

Task Manager is a collaborative full-stack task management application built with Spring Boot, MongoDB, and Next.js. It supports account-based task tracking, task editing, task sharing, notifications, and custom task ordering.

## Overview

This repository contains a four-person software engineering team project focused on helping users organize personal work and collaborate on shared tasks. The application combines a Next.js front end with a Spring Boot REST API and a MongoDB data store.

The project demonstrates end-to-end feature development across authentication, CRUD task management, cross-user sharing, notification workflows, and frontend state synchronization.

## Technology Stack

- Java 17
- Spring Boot 3
- Maven
- MongoDB
- Next.js 15
- React 19
- JavaScript

## Features

- User registration and login with cookie-based session handling
- Create, edit, complete, and delete personal tasks
- Due dates and priority levels for task organization
- Shared-task workflows between registered users
- Notification center for task shares and completion updates
- Multiple sorting modes, including custom task ordering

## Architecture

The frontend lives in `front-end/` and renders the login and dashboard experiences in Next.js. Browser requests to `/api/*` are rewritten by `front-end/next.config.js` to the Spring Boot backend running on `http://localhost:8080`.

The backend lives in `back-end/` and exposes REST endpoints for authentication, task operations, task sharing, and notifications. Spring Data MongoDB persists users, auth tokens, tasks, and notifications in MongoDB.

## Repository Structure

```text
back-end/
  pom.xml
  src/main/java/edu/sfsu/app/
    config/
    controller/
    dto/
    model/
    repository/
  src/main/resources/application.properties

front-end/
  package.json
  next.config.js
  src/app/
    login/
    dashboard/
```

## Running Locally

### Prerequisites

- Java 17 or newer
- Maven
- Node.js 18 or newer
- MongoDB running locally on port `27017`

### Backend

```bash
cd back-end
mvn spring-boot:run
```

The backend starts on `http://localhost:8080`.

### Frontend

```bash
cd front-end
npm install
npm run dev
```

The frontend starts on `http://localhost:3000`.

### Configuration

- No environment variables are required for the default local setup.
- The backend currently expects MongoDB at `mongodb://localhost:27017/app`.
- The frontend currently proxies API requests to `http://localhost:8080`.

## Team Project

This application was developed collaboratively by a four-person team, with work contributed across both the frontend and backend.

The four-person development team contributed across authentication, task management, task ordering, task sharing, notifications, and frontend user experience.

## My Contributions

Blake Cox contributed across the full stack and implemented task retrieval and task editing functionality that connected the React frontend to authenticated Spring Boot endpoints and MongoDB-backed task updates.

- Implemented authenticated `GET /getAllTasks` and `PUT /updateTask` functionality in `TaskController`
- Added ownership checks, input validation, MongoDB persistence, and API error handling for task updates
- Built the dashboard edit flow with pre-populated task data, asynchronous update requests, and automatic UI refresh after successful saves
- Contributed technical implementation while also stepping into a leadership role to help coordinate work, prioritize remaining tasks, and keep the project moving toward completion

## Known Limitations

This academic software engineering project includes authentication intended for demonstration and local development. A production deployment should replace the current password hashing and session approach with production-grade security controls.

## Notes

- `back-end/README.md` contains additional backend-specific project notes from the original team workflow.
- This repository is intentionally preserved as a representative team project rather than being substantially rewritten after the fact.
