package com.example.flaskr;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 認証機能の統合テスト
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        // テストデータのクリーンアップ
        userRepository.deleteAll();
    }

    @Test
    void testUserRegistration_Success() throws Exception {
        // ユーザー登録リクエスト
        String requestBody = objectMapper.writeValueAsString(
            new AuthController.RegisterRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.userId").exists());
    }

    @Test
    void testUserRegistration_DuplicateUsername() throws Exception {
        // 最初のユーザー登録
        String requestBody = objectMapper.writeValueAsString(
            new AuthController.RegisterRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isCreated());

        // 重複ユーザー名で登録試行
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Username already exists: testuser"));
    }

    @Test
    void testLogin_Success() throws Exception {
        // ユーザー登録
        String registerBody = objectMapper.writeValueAsString(
            new AuthController.RegisterRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody))
                .andExpect(status().isCreated());

        // ログイン
        String loginBody = objectMapper.writeValueAsString(
            new AuthController.LoginRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void testLogin_InvalidCredentials() throws Exception {
        // ユーザー登録
        String registerBody = objectMapper.writeValueAsString(
            new AuthController.RegisterRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody))
                .andExpect(status().isCreated());

        // 間違ったパスワードでログイン
        String loginBody = objectMapper.writeValueAsString(
            new AuthController.LoginRequest() {{
                setUsername("testuser");
                setPassword("wrongpassword");
            }}
        );

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    void testGetCurrentUser_Authenticated() throws Exception {
        // ユーザー登録
        String registerBody = objectMapper.writeValueAsString(
            new AuthController.RegisterRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody))
                .andExpect(status().isCreated());

        // ログイン（セッションを保持）
        String loginBody = objectMapper.writeValueAsString(
            new AuthController.LoginRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession();
        assertNotNull(session);

        // 現在のユーザー情報を取得
        mockMvc.perform(get("/api/auth/current")
                .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.userId").exists());
    }

    @Test
    void testGetCurrentUser_NotAuthenticated() throws Exception {
        // 認証なしで現在のユーザー情報を取得
        mockMvc.perform(get("/api/auth/current"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Not authenticated"));
    }

    @Test
    void testLogout() throws Exception {
        // ユーザー登録
        String registerBody = objectMapper.writeValueAsString(
            new AuthController.RegisterRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody))
                .andExpect(status().isCreated());

        // ログイン
        String loginBody = objectMapper.writeValueAsString(
            new AuthController.LoginRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession();
        assertNotNull(session);

        // ログアウト
        mockMvc.perform(post("/api/auth/logout")
                .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Logout successful"));

        // ログアウト後、認証が必要なエンドポイントにアクセス
        mockMvc.perform(get("/api/auth/current")
                .session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testProtectedEndpoint_RequiresAuthentication() throws Exception {
        // 認証なしで保護されたエンドポイントにアクセス
        // Spring Securityはformログインを無効にした場合、403を返す
        mockMvc.perform(get("/users/1/posts"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testProtectedEndpoint_WithAuthentication() throws Exception {
        // ユーザー登録
        String registerBody = objectMapper.writeValueAsString(
            new AuthController.RegisterRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody))
                .andExpect(status().isCreated());

        // ログイン
        String loginBody = objectMapper.writeValueAsString(
            new AuthController.LoginRequest() {{
                setUsername("testuser");
                setPassword("password123");
            }}
        );

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession();
        assertNotNull(session);

        // 認証済みで保護されたエンドポイントにアクセス
        mockMvc.perform(get("/api/posts")
                .session(session))
                .andExpect(status().isOk());
    }
}
