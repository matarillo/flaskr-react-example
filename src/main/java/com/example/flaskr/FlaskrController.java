package com.example.flaskr;

import org.springframework.data.jdbc.core.mapping.AggregateReference;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.LocalDateTime;
import java.util.Optional;

@Controller
@RequestMapping("/")
public class FlaskrController {

    private final UserRepository userRepository;
    private final PostRepository postRepository;

    public FlaskrController(UserRepository userRepository, PostRepository postRepository) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
    }

    @GetMapping("/hello")
    @ResponseBody
    public String hello() {
        Optional<User> oUser = userRepository.findByUsername("user1");
        if (oUser.isPresent()) {
            User u = oUser.get();
            AggregateReference<User, Integer> author = AggregateReference.to(u.getId());
            Post p = new Post();
            p.setAuthorId(author);
            p.setCreated(LocalDateTime.now());
            p.setTitle("Dummy Title");
            p.setBody("Dummy Body");
            postRepository.save(p);
        }
        return oUser.map(user -> "User ID = " + user.getId()).orElse("User not found");
    }


    private String hash(String password) {
        Pbkdf2PasswordEncoder encoder = Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8();
        return encoder.encode(password);
    }
}
