package com.example.flaskr;

import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

/**
 * Spring SecurityのUserDetailsを拡張し、userIdを含むカスタム実装
 * 認証時に取得したユーザー情報を保持することで、追加のDBアクセスを不要にする
 */
public class CustomUserDetails extends org.springframework.security.core.userdetails.User {

    private final Integer userId;

    public CustomUserDetails(Integer userId, String username, String password,
                            Collection<? extends GrantedAuthority> authorities) {
        super(username, password, authorities);
        this.userId = userId;
    }

    public Integer getUserId() {
        return userId;
    }
}
