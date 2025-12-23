package com.example.flaskr;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ユーザー管理サービス
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 新しいユーザーを登録する
     * パスワードはPbkdf2PasswordEncoderでハッシュ化される
     * 
     * @param username ユーザー名
     * @param rawPassword 平文パスワード
     * @return 登録されたユーザー
     * @throws IllegalArgumentException ユーザー名が既に存在する場合
     */
    @Transactional
    public User registerUser(String username, String rawPassword) {
        // ユーザー名の重複チェック
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username already exists: " + username);
        }

        // パスワードのハッシュ化
        String hashedPassword = passwordEncoder.encode(rawPassword);

        // ユーザーエンティティの作成
        User user = new User();
        user.setUsername(username);
        user.setPassword(hashedPassword);

        // データベースに保存
        return userRepository.save(user);
    }

    /**
     * ユーザー名でユーザーを検索する
     * 
     * @param username ユーザー名
     * @return ユーザー（見つからない場合はnull）
     */
    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }
}
