package com.example.flaskr;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.jdbc.core.mapping.AggregateReference;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

@Table("POSTS")
@Data
public class Post {
    @Id
    private Integer id;
    private AggregateReference<User, Integer> authorId;
    private LocalDateTime created;
    private String title;
    private String body;
}
