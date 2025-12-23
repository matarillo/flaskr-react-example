package com.example.flaskr;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Data
@Table("USERS")
public class User {
    @Id
    private Integer id;
    private String username;
    private String password;
}
