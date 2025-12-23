package com.example.flaskr;

import org.springframework.data.domain.Page;
import org.springframework.data.jdbc.core.mapping.AggregateReference;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.LocalDateTime;
import java.util.Optional;

@Controller
@RequestMapping("/")
public class FlaskrController {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostService postService;

    public FlaskrController(UserRepository userRepository, PostRepository postRepository, PostService postService) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.postService = postService;
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

    /**
     * 指定したユーザーIDの記事を取得するエンドポイント（ページング対応）
     * 例: /users/1/posts?page=0&size=10
     */
    @GetMapping("/users/{userId}/posts")
    @ResponseBody
    public Page<Post> getUserPosts(
            @PathVariable Integer userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return postService.getPostsByUserId(userId, page, size);
    }
}
