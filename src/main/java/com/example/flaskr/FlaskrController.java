package com.example.flaskr;

import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Optional;

@Controller
@RequestMapping("/")
public class FlaskrController {

    private final UserRepository usersRepository;

    public FlaskrController(UserRepository userRepository) {
        this.usersRepository = userRepository;
    }

    @GetMapping("/hello")
    @ResponseBody
    public String hello() {
        Optional<User> oUser = usersRepository.findByUsername("user1");
        return oUser.map(user -> "User ID = " + user.getId()).orElse("User not found");
    }


    private String hash(String password) {
        Pbkdf2PasswordEncoder encoder = Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8();
        return encoder.encode(password);
    }
}
