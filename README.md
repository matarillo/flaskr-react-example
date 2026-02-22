# Flaskr — Spring Boot + React 実装

Flask の公式チュートリアルアプリ「Flaskr」を、Spring Boot と React のモダンスタックで再実装した学習・実験プロジェクト。

## 学習・実験の目的

### フルスタック Web アプリの基本を体得する

- シンプルなブログ CRUD アプリを題材に、バックエンドとフロントエンドの両側から実装
- Flask チュートリアルで学んだ概念（認証、セッション、CRUD）を別スタックで再現

### 試した技術・パターン

| 分野 | 内容 |
|------|------|
| **SWR** | `useSWR` / `useSWRMutation` によるデータフェッチ・キャッシュ管理 |
| **セッション認証** | Cookie ベースの認証フロー（Spring Security + `withCredentials`）|
| **Spring Data JDBC** | JPA を使わないシンプルな ORM |
| **React Router v7** | Declarative モード（`BrowserRouter` + `Routes`）でネストレイアウト構成（`<Outlet>`）|
| **Vitest + MSW** | フロントエンドのユニットテスト・API モック |
| **SonarQube / JaCoCo** | 静的解析とカバレッジ計測 |
| **Bitbucket Pipelines** | CI/CD パイプライン構築 |

### コミット履歴から見た実験の流れ

```
docker memory          # Dockerの設定から開始
backend / frontend     # バックエンド・フロントエンドの雛形作成
auth / login / logout  # 認証機能を段階的に実装
posts / create / update # 投稿 CRUD の実装
refactor to SWR        # データフェッチを SWR に置き換え
fix routing            # ルーティング修正
refactor（複数回）     # コード整理
```

## 技術スタック

### バックエンド

- **Java 21** / **Spring Boot 3.x**
- Spring Security（セッション認証）
- Spring Data JDBC（H2 データベース）
- Gradle

### フロントエンド

- **React 19** / **TypeScript 5**
- **SWR 2** — サーバー状態管理
- React Router 7
- Vite / Vitest
- Axios

## 主な機能

- ユーザー登録 / ログイン / ログアウト
- 投稿の作成・編集・削除（作者のみ）
- 投稿一覧（ページング）

## アーキテクチャ概要

```
frontend/               # React アプリ（Vite）
  src/
    api/                # Axios クライアント（auth / post）
    components/         # 画面コンポーネント
    contexts/auth.tsx   # SWR を使った認証状態管理
    types/              # 型定義

src/main/java/.../      # Spring Boot アプリ
  *Controller.java      # REST エンドポイント
  *Service.java         # ビジネスロジック
  *Repository.java      # Spring Data JDBC
  SecurityConfig.java   # 認証・認可設定
```

## React Router のモードについて

React Router v7 には3つのモードがある。このプロジェクトは **Declarative モード** を採用。

| モード | API | 特徴 |
|--------|-----|------|
| **Declarative** ← 本プロジェクト | `BrowserRouter` + `Routes` + `Route` | 基本ルーティングのみ。独自のデータレイヤーと組み合わせやすい |
| **Data** | `createBrowserRouter` + `RouterProvider` | `loader` / `action` でルート単位のデータ取得・処理が可能 |
| **Framework** | `routes.ts` による設定ファイル | SSR、型安全 href、自動コード分割など最フル機能 |

Declarative モードを選んだ理由は、データ取得を SWR に任せる構成と相性が良いため。
認証チェックは現状 `<Navigate>` コンポーネントで各ページ内に実装しているが、
Data モードの `loader` を使えばレンダリング前にリダイレクトできる（次の実験候補）。

## 起動方法

```bash
# バックエンド
./gradlew bootRun

# フロントエンド
cd frontend
npm install
npm run dev
```

フロントエンドの開発サーバーは `http://localhost:5173`、バックエンドは `http://localhost:8080` で起動します（Vite のプロキシ設定済み）。
