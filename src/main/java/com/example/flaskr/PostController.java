package com.example.flaskr;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 投稿記事関連のエンドポイントを提供するコントローラー
 */
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final UserService userService;

    /**
     * インデックス - すべての投稿記事を取得
     * GET /posts?page=0&size=10
     * 最新の投稿記事を最初にして、投稿記事をすべて取得（ページングをサポート）
     * 結果の中でuserテーブルから作者情報を使用
     * ユーザが投稿記事の作者であったときは、その投稿記事に対するupdateのURL Pathを含む
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> index(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        // 現在ログインしているユーザーを取得
        Integer currentUserId = getCurrentUserId();
        
        // すべての投稿を取得（最新順）
        Page<Post> postsPage = postService.getAllPosts(page, size);
        
        // 投稿のリストを作成（作者情報とupdateパスを含む）
        List<Map<String, Object>> postsList = new ArrayList<>();
        for (Post post : postsPage.getContent()) {
            Map<String, Object> postData = new HashMap<>();
            postData.put("id", post.getId());
            postData.put("title", post.getTitle());
            postData.put("body", post.getBody());
            postData.put("created", post.getCreated().toString());
            
            // 作者情報を取得して追加
            Integer authorId = post.getAuthorId().getId();
            postData.put("authorId", authorId);
            
            postService.getUserById(authorId).ifPresent(author -> {
                Map<String, Object> authorData = new HashMap<>();
                authorData.put("id", author.getId());
                authorData.put("username", author.getUsername());
                postData.put("author", authorData);
            });
            
            // 現在のユーザーが作者である場合、updateパスを含む
            if (currentUserId != null && currentUserId.equals(authorId)) {
                postData.put("updateUrl", "/posts/" + post.getId() + "/update");
                postData.put("deleteUrl", "/posts/" + post.getId() + "/delete");
            }
            
            postsList.add(postData);
        }
        
        // レスポンスを作成
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("posts", postsList);
        response.put("page", postsPage.getNumber());
        response.put("size", postsPage.getSize());
        response.put("totalElements", postsPage.getTotalElements());
        response.put("totalPages", postsPage.getTotalPages());
        response.put("isFirst", postsPage.isFirst());
        response.put("isLast", postsPage.isLast());
        
        return ResponseEntity.ok(response);
    }

    /**
     * 作成 - 新しい投稿記事を作成
     * POST /posts
     * Body: {"title": "タイトル", "body": "本文"}
     * ユーザはログインしている必要がある
     * postされたデータが検証されてから、データベースへその投稿記事が追加されるか、またはエラーを返す
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody CreatePostRequest request) {
        // ログインチェック
        Integer currentUserId = getCurrentUserId();
        if (currentUserId == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Authentication required. Please login first.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
        
        try {
            // 投稿を作成
            Post post = postService.createPost(request.getTitle(), request.getBody(), currentUserId);
            
            // 作者情報を取得
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Post created successfully");
            response.put("postId", post.getId());
            response.put("title", post.getTitle());
            response.put("body", post.getBody());
            response.put("created", post.getCreated().toString());
            response.put("authorId", currentUserId);
            
            postService.getUserById(currentUserId).ifPresent(author -> {
                Map<String, Object> authorData = new HashMap<>();
                authorData.put("id", author.getId());
                authorData.put("username", author.getUsername());
                response.put("author", authorData);
            });
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * 更新 - 既存の投稿記事を更新
     * POST /posts/{id}/update
     * Body: {"title": "新しいタイトル", "body": "新しい本文"}
     * ログインしているユーザと作者が一致しているかチェックして更新
     */
    @PostMapping("/{id}/update")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable Integer id,
            @RequestBody UpdatePostRequest request) {
        
        // ログインチェック
        Integer currentUserId = getCurrentUserId();
        if (currentUserId == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Authentication required. Please login first.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
        
        // 投稿を取得
        Post post = postService.getPostById(id).orElse(null);
        if (post == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Post not found with id: " + id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
        
        // 作者チェック
        Integer authorId = post.getAuthorId().getId();
        if (!currentUserId.equals(authorId)) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "You are not authorized to update this post");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
        }
        
        try {
            // 投稿を更新
            Post updatedPost = postService.updatePost(id, request.getTitle(), request.getBody());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Post updated successfully");
            response.put("postId", updatedPost.getId());
            response.put("title", updatedPost.getTitle());
            response.put("body", updatedPost.getBody());
            response.put("created", updatedPost.getCreated().toString());
            response.put("authorId", authorId);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * 削除 - 既存の投稿記事を削除
     * POST /posts/{id}/delete
     * ログインしているユーザと作者が一致しているかチェックして削除
     */
    @PostMapping("/{id}/delete")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Integer id) {
        // ログインチェック
        Integer currentUserId = getCurrentUserId();
        if (currentUserId == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Authentication required. Please login first.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
        
        // 投稿を取得
        Post post = postService.getPostById(id).orElse(null);
        if (post == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Post not found with id: " + id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
        
        // 作者チェック
        Integer authorId = post.getAuthorId().getId();
        if (!currentUserId.equals(authorId)) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "You are not authorized to delete this post");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
        }
        
        try {
            // 投稿を削除
            postService.deletePost(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Post deleted successfully");
            response.put("postId", id);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * 現在ログインしているユーザーのIDを取得する
     * 
     * @return ユーザーID（ログインしていない場合はnull）
     */
    private Integer getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated() || 
            authentication.getPrincipal().equals("anonymousUser")) {
            return null;
        }
        
        String username = authentication.getName();
        User user = userService.findByUsername(username);
        
        return (user != null) ? user.getId() : null;
    }

    @Data
    public static class CreatePostRequest {
        private String title;
        private String body;
    }

    @Data
    public static class UpdatePostRequest {
        private String title;
        private String body;
    }
}
