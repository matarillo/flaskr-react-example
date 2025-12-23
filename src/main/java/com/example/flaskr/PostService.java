package com.example.flaskr;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jdbc.core.mapping.AggregateReference;
import org.springframework.stereotype.Service;

/**
 * PostServiceクラス
 * 記事の取得や管理を行うサービスクラス
 */
@Service
@RequiredArgsConstructor
public class PostService {
    
    private final PostRepository postRepository;
    
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
}
