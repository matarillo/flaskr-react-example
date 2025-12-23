package com.example.flaskr;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jdbc.core.mapping.AggregateReference;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * PostServiceクラス
 * 記事の取得や管理を行うサービスクラス
 */
@Service
@RequiredArgsConstructor
public class PostService {
    
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    
    /**
     * すべての記事を取得する（ページング機構あり）
     * 最新の記事が最初に表示されるように降順でソート
     * 
     * @param page ページ番号（0から開始）
     * @param size 1ページあたりの記事数
     * @return ページング情報を含む記事のリスト
     */
    public Page<Post> getAllPosts(int page, int size) {
        // ページネーション設定（作成日時の降順でソート）
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "created"));
        return postRepository.findAll(pageable);
    }
    
    /**
     * 指定したユーザーIDの記事を複数取得する（ページング機構あり）
     * 
     * @param userId ユーザーID
     * @param page ページ番号（0から開始）
     * @param size 1ページあたりの記事数
     * @return ページング情報を含む記事のリスト
     */
    public Page<Post> getPostsByUserId(Integer userId, int page, int size) {
        // ページネーション設定（作成日時の降順でソート）
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "created"));
        
        // ユーザーIDのAggregateReferenceを作成
        AggregateReference<User, Integer> authorId = AggregateReference.to(userId);
        
        // ユーザーIDで記事を検索
        return postRepository.findByAuthorId(authorId, pageable);
    }
    
    /**
     * 指定したユーザーIDの記事を複数取得する（デフォルトページング設定）
     * デフォルト: ページ番号0、サイズ10
     * 
     * @param userId ユーザーID
     * @return ページング情報を含む記事のリスト
     */
    public Page<Post> getPostsByUserId(Integer userId) {
        return getPostsByUserId(userId, 0, 10);
    }
    
    /**
     * IDで記事を取得する
     * 
     * @param id 記事ID
     * @return 記事（見つからない場合はOptional.empty()）
     */
    public Optional<Post> getPostById(Integer id) {
        return postRepository.findById(id);
    }
    
    /**
     * 新しい記事を作成する
     * 
     * @param title 記事のタイトル
     * @param body 記事の本文
     * @param authorId 作者のユーザーID
     * @return 作成された記事
     * @throws IllegalArgumentException タイトルまたは本文が空の場合
     */
    public Post createPost(String title, String body, Integer authorId) {
        // バリデーション
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (body == null || body.trim().isEmpty()) {
            throw new IllegalArgumentException("Body is required");
        }
        
        // 記事エンティティの作成
        Post post = new Post();
        post.setTitle(title);
        post.setBody(body);
        post.setAuthorId(AggregateReference.to(authorId));
        post.setCreated(LocalDateTime.now());
        
        // データベースに保存
        return postRepository.save(post);
    }
    
    /**
     * 記事を更新する
     * 
     * @param id 記事ID
     * @param title 新しいタイトル
     * @param body 新しい本文
     * @return 更新された記事
     * @throws IllegalArgumentException 記事が見つからない場合、またはタイトル/本文が空の場合
     */
    public Post updatePost(Integer id, String title, String body) {
        // バリデーション
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (body == null || body.trim().isEmpty()) {
            throw new IllegalArgumentException("Body is required");
        }
        
        // 記事を取得
        Post post = postRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Post not found with id: " + id));
        
        // 記事を更新
        post.setTitle(title);
        post.setBody(body);
        
        // データベースに保存
        return postRepository.save(post);
    }
    
    /**
     * 記事を削除する
     * 
     * @param id 記事ID
     * @throws IllegalArgumentException 記事が見つからない場合
     */
    public void deletePost(Integer id) {
        if (!postRepository.existsById(id)) {
            throw new IllegalArgumentException("Post not found with id: " + id);
        }
        postRepository.deleteById(id);
    }
    
    /**
     * ユーザーIDでユーザーを取得する
     * 
     * @param userId ユーザーID
     * @return ユーザー（見つからない場合はOptional.empty()）
     */
    public Optional<User> getUserById(Integer userId) {
        return userRepository.findById(userId);
    }
}
