package com.example.flaskr;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Securityの設定クラス
 * - セッションベースの認証を使用
 * - Pbkdf2PasswordEncoderでパスワードをハッシュ化
 * - クッキーでセッションを管理
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    /**
     * Pbkdf2PasswordEncoderのBean定義
     * Spring Security 5.8のデフォルト設定を使用
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    /**
     * AuthenticationManagerのBean定義
     */
    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http) throws Exception {
        AuthenticationManagerBuilder authenticationManagerBuilder =
                http.getSharedObject(AuthenticationManagerBuilder.class);
        authenticationManagerBuilder
                .userDetailsService(userDetailsService)
                .passwordEncoder(passwordEncoder());
        return authenticationManagerBuilder.build();
    }

    /**
     * SecurityFilterChainの設定
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CSRF保護を有効化（本番環境では推奨）
                .csrf(csrf -> csrf.disable()) // 開発用に無効化、本番では有効化を検討

                // 認証ルールの設定
                .authorizeHttpRequests(authz -> authz
                        // 標準的な静的リソース（JS, CSS, 画像など）を一括で許可
                        .requestMatchers(PathRequest.toStaticResources().atCommonLocations()).permitAll()
                        // H2 Consoleを許可 (開発環境用)
                        .requestMatchers(PathRequest.toH2Console()).permitAll()
                        // SPAのビルド生成物を許可
                        .requestMatchers("/", "/index.html", "/assets/**").permitAll()
                        // 公開APIを許可
                        .requestMatchers("/api/auth/**").permitAll()
                        .anyRequest().authenticated() // その他のリクエストは認証が必要
                )

                // HTTPBasic認証を無効化
                .httpBasic(httpBasic -> httpBasic.disable())

                // フォームログインを無効化（JSON APIベースの認証を使用）
                .formLogin(form -> form.disable());

        // H2コンソール用の設定（開発環境のみ）
        http.headers(headers -> headers.frameOptions(frame -> frame.disable()));

        return http.build();
    }
}
