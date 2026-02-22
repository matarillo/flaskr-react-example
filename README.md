# Flaskr — Spring Boot + React 実装

Flask の公式チュートリアルアプリ「Flaskr」を Spring Boot + React のモダンスタックで再実装した学習・実験プロジェクト。

## 技術スタック

**バックエンド**
- Java 21 / Spring Boot 3.x
- Spring Security（セッション認証）
- Spring Data JDBC / H2
- Gradle

**フロントエンド**
- React 19 / TypeScript 5
- SWR 2 / Axios
- React Router 7
- Vite / Vitest / MSW

## アーキテクチャと機能

**機能**
- ユーザー登録 / ログイン / ログアウト
- 投稿の作成・編集・削除（作者のみ）
- 投稿一覧（ページング）

**ディレクトリ構成**

```
frontend/src/
  api/              # Axios クライアント（auth / post）
  components/       # 画面コンポーネント
  contexts/auth.tsx # SWR を使った認証状態管理
  types/            # 型定義

src/main/java/.../
  *Controller.java  # REST エンドポイント
  *Service.java     # ビジネスロジック
  *Repository.java  # Spring Data JDBC
  SecurityConfig.java
```

## 学習記録

### 実験の経緯

```
docker memory           # Docker の設定から開始
backend / frontend      # バックエンド・フロントエンドの雛形作成
auth / login / logout   # 認証機能を段階的に実装
posts / create / update # 投稿 CRUD の実装
refactor to SWR         # データフェッチを SWR に置き換え
fix routing             # ルーティング修正
refactor（複数回）      # コード整理
```

### 試したパターンと選択理由

| 技術 | 選択理由 |
|------|---------|
| **SWR** | ルーティングとデータ取得を別レイヤーで管理する構成を試したかった。`useSWR` でキャッシュ、`useSWRMutation` でログイン・ログアウトを実装 |
| **セッション認証** | JWT ではなく Cookie ベースの認証フローを Spring Security で実装し、`withCredentials` によるクロスオリジン送信を確認する |
| **Spring Data JDBC** | JPA より明示的で SQL に近い ORM を試す。`AggregateReference` による外部キー表現も確認 |
| **React Router v7 Declarative** | SWR にデータ取得を任せる構成では、ルーターにデータレイヤーを持たせない Declarative モードと相性が良い |
| **Vitest + MSW** | Vite ネイティブのテスト環境と API モックを組み合わせたフロントエンドテストを試す |
| **SonarQube / JaCoCo** | バックエンド・フロントエンドの静的解析とカバレッジ計測を CI に組み込む |

### ルーティング設計とトレンド

**React Router v7 の3モード**

| モード | API | 特徴 |
|--------|-----|------|
| **Declarative** ← 本プロジェクト | `BrowserRouter` + `Routes` + `Route` | 基本ルーティングのみ。独自のデータレイヤーと組み合わせやすい |
| **Data** | `createBrowserRouter` + `RouterProvider` | `loader` / `action` でルート単位のデータ取得・処理が可能 |
| **Framework** | `routes.ts` による設定ファイル | SSR、型安全 href、自動コード分割など最フル機能 |

Declarative モードでは `<Link to="...">` や `useParams()` に型が付かない。存在しないパスを渡しても、パラメータ名を間違えてもコンパイルエラーにならずランタイムまで気づけない。

**2025年のカスタムSPAにおけるルーター比較**

| ルーター | 型安全性 | ファイルベース | 備考 |
|----------|----------|--------------|------|
| **TanStack Router** | コンパイル時に100% | ✅ `routeTree.gen.ts` 自動生成 | カスタムSPAのデファクトに近い |
| **React Router v7 Framework** | 部分的 | ✅ `routes.ts` | SSR対応あり |
| **React Router v7 Declarative** ← 本プロジェクト | なし | ❌ コード定義 | シンプル・学習向き |

**ファイルベースルーティングの利点・欠点**

利点：URL構造とディレクトリ構造が一致する / `<Link>` やパスパラメータが自動型付けされコンパイル時にタイポを検出 / ルート単位のコード分割が自動化される

欠点：`$param.tsx` / `_layout.tsx` などの命名規則に慣れるまでコストがかかる / 複雑な条件分岐ルーティングが書きにくい / ルーティングの仕組みを基礎から理解したい段階では自動生成が邪魔になる

ファイルベースへの移行が進む背景として、TypeScript 普及による型安全性への要求の高まりと、Next.js によって「ファイルがルートになる」モデルが標準感覚になったことがある。

**次の実験候補**

1. **React Router Data モード** — `createBrowserRouter` + `loader` で認証チェックをレンダリング前に行う（`App.tsx` 内にすでにメモあり）
2. **TanStack Router** — ファイルベース＋完全型安全ルーティングを体験する。SWR との相性も良い
3. **React Router Framework モード** — `routes.ts` によるファイルベースルーティングを試す

## 起動方法

```bash
# バックエンド
./gradlew bootRun

# フロントエンド
cd frontend
npm install
npm run dev
```

フロントエンド `http://localhost:5173`、バックエンド `http://localhost:8080`（Vite のプロキシ設定済み）。
