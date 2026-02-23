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
- React Router 7（Data モード — loader / action）
- Axios
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
  components/       # 画面コンポーネント + loader/action
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
migrate to Data Router  # React Router を Declarative → Data モードへ移行
remove SWR              # SWR を廃止し loader/action に完全移行
```

### 技術選定の考察

| 技術 | 選択理由 |
|------|---------|
| **React Router v7 Data** | `loader` でレンダリング前にデータ取得、`action` でフォーム送信を処理。認証チェック・キャッシュ再検証がルーター層で完結する |
| **セッション認証** | JWT ではなく Cookie ベースの認証フローを Spring Security で実装し、`withCredentials` によるクロスオリジン送信を確認する |
| **Spring Data JDBC** | JPA より明示的で SQL に近い ORM を試す。`AggregateReference` による外部キー表現も確認 |
| **Vitest + MSW** | Vite ネイティブのテスト環境と API モックを組み合わせたフロントエンドテストを試す |
| **SonarQube / JaCoCo** | バックエンド・フロントエンドの静的解析とカバレッジ計測を CI に組み込む |

### 状態管理の設計

React の状態管理を4層に分類するモデルがある。このプロジェクトでの実装は以下の通り。

| 層 | 担うもの | 本プロジェクトでの実装 |
|----|---------|----------------------|
| **サーバー状態** | API から来るデータ | React Router `loader`（投稿一覧・詳細・認証状態） |
| **ミューテーション** | データの作成・更新・削除 | React Router `action` + `<Form>` |
| **フォーム状態** | 入力・バリデーション | `<Form>` の name 属性（React Router が FormData を管理） |
| **ローカル状態** | コンポーネント内 UI | `useState` |

React Router Data モードでは、サーバー状態の取得（loader）と変更（action）がルーター層で一元化される。action 完了後に loader が自動で再実行されるため、手動でのキャッシュ無効化が不要になる。

#### SWR / TanStack Query が必要になるケース

本プロジェクトでは当初 SWR を使用していたが、すべてのデータが URL（ルート）に紐づいていたため loader/action で完結でき、SWR を廃止した。

SWR や TanStack Query が必要になるのは、**URL と無関係なデータ**を扱う場合：

| ユースケース | 例 | なぜ loader では不十分か |
|----|----|----|
| ポーリング / リアルタイム更新 | チャット、通知バッジ | loader はナビゲーション時にしか走らない。定期的な再取得が必要 |
| 複数コンポーネントでのデータ共有 | サイドバーとメインで同一データ | loader はルート単位。グローバルキャッシュで重複リクエストを排除したい |
| 無限スクロール | フィード、検索結果 | loader は「現在のページ」を返すだけ。過去ページの蓄積は自前管理が必要 |
| 楽観的更新 | いいねボタン、トグル | React Router にも optimistic UI はあるが、SWR/TanStack Query の方がシンプルな場合がある |
| ルートと無関係なバックグラウンドデータ | 設定、フィーチャーフラグ | URL 遷移と関係なく取得・キャッシュしたいデータ |

判断基準：**データが URL に紐づくなら loader/action、URL と無関係なら SWR/TanStack Query**。

| | SWR | TanStack Query |
|--|--|--|
| API の複雑さ | シンプル | 豊富だが学習コストあり |
| Mutation の DX | 基本的 | invalidation・楽観的更新が強力 |
| DevTools | なし | あり |
| バンドルサイズ | 小さい | やや大きい |

### ルーティング設計とトレンド

#### React Router v7 の3モード

| モード | API | 特徴 |
|--------|-----|------|
| **Declarative** | `BrowserRouter` + `Routes` + `Route` | 基本ルーティングのみ。独自のデータレイヤーと組み合わせやすい |
| **Data** ← 本プロジェクト | `createBrowserRouter` + `RouterProvider` | `loader` / `action` でルート単位のデータ取得・処理が可能 |
| **Framework** | `routes.ts` による設定ファイル | SSR、型安全 href、自動コード分割など最フル機能 |

Declarative モードでは `<Link to="...">` や `useParams()` に型が付かない。存在しないパスを渡しても、パラメータ名を間違えてもコンパイルエラーにならずランタイムまで気づけない。

#### Data モードの loader / action 設計パターン

本プロジェクトでは以下のパターンを採用している。

- **rootLoader**：認証状態を取得し、Layout が `useLoaderData()` でユーザー情報を表示。子ルートは `useRouteLoaderData('root')` で参照
- **postsLoader**：`request.url` から searchParams を取得しページネーション付きで投稿を取得
- **protectedLoader**：認証チェックを行い、未認証なら `redirect('/')` を返す
- **action**：`<Form method="post">` からの送信を受け取り、API 呼び出し後に `redirect('/')` または `{ error }` を返す
- **intent パターン**：1つのルートで複数の操作（update / delete）を `<input type="hidden" name="intent">` で区別する
- **自動 revalidation**：action 完了後、同ルートの loader が自動で再実行される。手動のキャッシュ無効化は不要

#### 2025年のカスタムSPAにおけるルーター比較

| ルーター | 型安全性 | ファイルベース | データロード | 備考 |
|----------|----------|--------------|------------|------|
| **TanStack Router** | 100%（コンパイル時） | ✅ `routeTree.gen.ts` 自動生成 | ✅ 組み込み | カスタムSPAのデファクトに近い |
| **React Router v7 Framework** | 部分的 | ✅ `routes.ts` | ✅ loader/action | SSR対応あり |
| **React Router v7 Data** ← 本プロジェクト | なし | ❌ コード定義 | ✅ loader/action | SPA向けの中間選択肢 |
| **React Router v7 Declarative** | なし | ❌ コード定義 | ❌ | シンプル・学習向き |

#### ファイルベースルーティング

利点：URL構造とディレクトリ構造が一致する / `<Link>` やパスパラメータが自動型付けされコンパイル時にタイポを検出 / ルート単位のコード分割が自動化される

欠点：`$param.tsx` / `_layout.tsx` などの命名規則に慣れるまでコストがかかる / 複雑な条件分岐ルーティングが書きにくい / ルーティングの仕組みを基礎から理解したい段階では自動生成が邪魔になる

ファイルベースへの移行が進む背景として、TypeScript 普及による型安全性への要求の高まりと、Next.js によって「ファイルがルートになる」モデルが標準感覚になったことがある。

## 次の実験候補

### 現在のスタックで即実施可能

1. **`useActionState`（React 19 ネイティブ）** — 現在 `useActionData` + `useNavigation` で管理している「送信中か / エラーは何か」を React 19 標準 API に置き換える。ライブラリ追加なしで完結する最小の実験
2. **`useOptimistic`（React 19 ネイティブ）による楽観的UI** — React が直接管理する楽観的更新の仕組みを試す。SPA では `useTransition` + 非同期関数と組み合わせて使えるが、本来の力は Server Actions + RSC との組み合わせで発揮される
3. **Suspense + `React.lazy` によるコード分割** — 各ルートコンポーネントを遅延読み込みし Suspense でローディング UI を宣言的に配置する

### ライブラリの追加・変更を伴う

4. **TanStack Router** — ファイルベース＋完全型安全ルーティングを体験する。TanStack Query との組み合わせで Suspense を使ったデータフェッチのローディング体験統合が実現しやすい
5. **React Router Framework モード** — `routes.ts` によるファイルベースルーティングを試す

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
