package edu.sfsu.app.repository;

import edu.sfsu.app.model.TaskModel;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskRepository extends MongoRepository<TaskModel, String> {

    List<TaskModel> findByUserName(String userName);

    List<TaskModel> findBySharedWithContaining(String userName);
}
