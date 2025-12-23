package com.example.flaskr;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.jdbc.core.mapping.AggregateReference;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * PostServiceのテストクラス
 */
@SpringBootTest
class PostServiceTest {

    @Autowired
    private PostService postService;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    private Integer testUserId;

    @BeforeEach
    void setUp() {
        // テストデータのクリーンアップ
        postRepository.deleteAll();
        userRepository.deleteAll();

        // テストユーザーの作成
        User testUser = new User();
        testUser.setUsername("testuser");
        testUser.setPassword("password123");
        testUser = userRepository.save(testUser);
        testUserId = testUser.getId();

        // テスト記事の作成（15件）
        for (int i = 1; i <= 15; i++) {
            Post post = new Post();
            post.setAuthorId(AggregateReference.to(testUserId));
            post.setTitle("Test Post " + i);
            post.setBody("This is test post body " + i);
            post.setCreated(LocalDateTime.now().minusDays(15 - i));
            postRepository.save(post);
        }
    }

    @Test
    void testGetPostsByUserId_WithPagination() {
        // ページ0、サイズ10で取得
        Page<Post> page = postService.getPostsByUserId(testUserId, 0, 10);

        // ページング情報の検証
        assertNotNull(page);
        assertEquals(15, page.getTotalElements());
        assertEquals(2, page.getTotalPages());
        assertEquals(10, page.getContent().size());
        assertEquals(0, page.getNumber());
        assertTrue(page.hasNext());
        assertFalse(page.hasPrevious());

        // 最初の記事が最新であることを確認（降順ソート）
        Post firstPost = page.getContent().getFirst();
        assertEquals("Test Post 15", firstPost.getTitle());
    }

    @Test
    void testGetPostsByUserId_SecondPage() {
        // ページ1、サイズ10で取得
        Page<Post> page = postService.getPostsByUserId(testUserId, 1, 10);

        // ページング情報の検証
        assertNotNull(page);
        assertEquals(15, page.getTotalElements());
        assertEquals(2, page.getTotalPages());
        assertEquals(5, page.getContent().size());
        assertEquals(1, page.getNumber());
        assertFalse(page.hasNext());
        assertTrue(page.hasPrevious());
    }

    @Test
    void testGetPostsByUserId_DefaultPagination() {
        // デフォルト設定で取得（ページ0、サイズ10）
        Page<Post> page = postService.getPostsByUserId(testUserId);

        // ページング情報の検証
        assertNotNull(page);
        assertEquals(15, page.getTotalElements());
        assertEquals(10, page.getContent().size());
        assertEquals(0, page.getNumber());
    }

    @Test
    void testGetPostsByUserId_NoPostsFound() {
        // 存在しないユーザーIDで取得
        Page<Post> page = postService.getPostsByUserId(9999, 0, 10);

        // 空のページが返されることを確認
        assertNotNull(page);
        assertEquals(0, page.getTotalElements());
        assertEquals(0, page.getContent().size());
    }

    @Test
    void testGetPostsByUserId_CustomPageSize() {
        // カスタムページサイズで取得
        Page<Post> page = postService.getPostsByUserId(testUserId, 0, 5);

        // ページング情報の検証
        assertNotNull(page);
        assertEquals(15, page.getTotalElements());
        assertEquals(3, page.getTotalPages());
        assertEquals(5, page.getContent().size());
    }

    @Test
    void testGetPostsByUserId_SortedByCreatedDesc() {
        // 記事が作成日時の降順でソートされていることを確認
        Page<Post> page = postService.getPostsByUserId(testUserId, 0, 15);

        LocalDateTime previousCreated = null;
        for (Post post : page.getContent()) {
            if (previousCreated != null) {
                // 前の記事の作成日時が現在の記事より後（降順）
                assertTrue(previousCreated.isAfter(post.getCreated()) || previousCreated.isEqual(post.getCreated()));
            }
            previousCreated = post.getCreated();
        }
    }

    @Test
    void testUpdatePost_WithInvalidId_ShouldNotThrowException() {
        // わざと失敗するテスト：存在しないIDで更新しても例外が投げられないと期待（実際は例外が投げられる）
        Integer nonExistentId = 99999;
        
        // このテストは失敗する - 実際にはIllegalArgumentExceptionが投げられるため
        assertDoesNotThrow(() -> {
            postService.updatePost(nonExistentId, "Updated Title", "Updated Body");
        });
    }
}
