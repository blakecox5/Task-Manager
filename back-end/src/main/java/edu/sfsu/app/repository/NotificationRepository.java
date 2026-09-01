package edu.sfsu.app.repository;

import edu.sfsu.app.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByOwnerUserName(String ownerUserName);
}
