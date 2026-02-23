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

React の状態は**所在とスコープ**によって4層に分類できる（Kent C. Dodds、TanStack、React Router のドキュメントでも類似の分類が用いられている）。

| 層 | スコープ | 本プロジェクトでの実装 |
|----|---------|----------------------|
| **URL State** | URL パス・クエリパラメータに符号化された状態 | ルートパス（`/posts/:id`）、`searchParams`（ページ番号） |
| **Server State** | サーバー由来のデータ（クライアントはスナップショットを借りている） | React Router `loader`（投稿一覧・詳細・認証状態） |
| **Global State** | コンポーネントツリー横断の共有クライアント状態 | 該当なし — 後述 |
| **Local State** | 単一コンポーネント内の UI 状態 | `useState` |

この分類の基準は「状態がどこに存在し、誰が所有するか」である。React Router の設計思想では URL を Single Source of Truth として扱い、URL が他の層を駆動する（URL → loader → Server State → UI）。

本プロジェクトでは **Global State が不要**になっている点が特徴的である。認証状態は `rootLoader` でサーバーから取得し `useRouteLoaderData('root')` で参照するため、Context や外部ストア（Redux、Zustand）でのグローバル管理が不要になった。データが URL に紐づく設計では、従来 Global State として管理されていたものの多くが Server State + URL State に吸収される。

#### ミューテーションとフォーム状態の位置づけ

ミューテーション（データの作成・更新・削除）は状態の「層」ではなく、Server State を変更する**操作**である。同様にフォーム状態は Local State の一種である。ただしミューテーションには固有のライフサイクル（送信中・成功・エラー）が伴うため、設計上の独立した考慮が必要になる。

| 関心事 | 本プロジェクトでの実装 |
|--------|----------------------|
| ミューテーション実行 | React Router `action` + `<Form method="post">` |
| 再検証 | action 完了後に loader が自動再実行（`<Form>` / `useFetcher` いずれも）。`useRevalidator` による明示的な再実行も可能。手動キャッシュ無効化が不要 |
| フォーム入力管理 | `<Form>` の name 属性（非制御）。React Router が FormData を管理するため `useState` 不要 |
| エラーハンドリング | action が `{ error }` を返し、`useActionData()` で表示 |

React Router Data モードでは Server State の取得（loader）と変更（action）がルーター層で一元化され、ミューテーション後のデータ整合性をフレームワークが保証する。

> **React 19 以降の方向性**：`useActionState`・`useFormStatus`・`useOptimistic` の標準化により、ミューテーションのライフサイクル（pending / error / optimistic update）を React 本体が宣言的に扱えるようになった。これらは「ミューテーションという操作に付随する一時的な UI 状態」を管理する API であり、独立した状態層を増やすものではない。

#### なぜこのアプリではキャッシュ層が不要か

本プロジェクトでは当初 SWR を使用していたが、loader/action への移行後に廃止した。キャッシュ層なしで成立しているのは、以下の3条件が段階的に満たされているためである。

**1. データが URL（ルート）に紐づいているか**

紐づいていなければ loader に取得契機がないので、キャッシュ層がほぼ必須になる（通知、フィーチャーフラグ、ルートをまたぐ共有データなど）。本プロジェクトでは全データがルートまたはクエリパラメータに対応しており、この条件を満たす。

**2. 全 mutation が React Router の action を経由するか**

React Router では action を経由する mutation であれば、ナビゲーションの有無にかかわらず全アクティブ loader が自動再実行される。`<Form>` は action 後にナビゲーションを起こすが、`useFetcher` は URL を変えずに action を実行し同じ自動再検証を得る。さらに `useRevalidator` を使えば action を介さない明示的な再検証も可能である。つまり React Router の再検証能力はナビゲーションに限定されない。

本プロジェクトでは `<Form>` + `redirect('/')` のみを使用しており、mutation → ナビゲーション → loader 再実行の流れが常に成立する。これは CRUD の全操作がページ遷移を伴うという要件に合致しているためであり、ナビゲーションなしの mutation（インライン編集など）が必要になっても `useFetcher` で対応でき、直ちにキャッシュ層が必要になるわけではない。

**3. 常に最新データの取得を待つ UX が許容されるか**

上の2条件を満たしていても、ナビゲーションのたびにサーバーからの応答を待つことになる。ページネーションで「次へ」→「戻る」と操作したとき、前のページの URL が復元されて loader が再実行されるので正しいデータは表示されるが、キャッシュがないので毎回ローディングが発生する。本プロジェクトはブログ投稿の CRUD であり応答が軽量なので許容されるが、stale-while-revalidate で即時表示したい場合はキャッシュ層が必要になる。

#### SWR / TanStack Query が必要になるケース

上記3条件のいずれかが満たされない場合に、専用のキャッシュ層が必要になる：

| ユースケース | 例 | なぜ loader では不十分か |
|----|----|----|
| ポーリング / リアルタイム更新 | チャット、通知バッジ | `useRevalidator` で定期再取得は可能だが全 loader が再実行される。特定データだけの軽量なポーリングにはキャッシュキー単位で制御できる専用ライブラリが適する |
| 複数コンポーネントでのデータ共有 | サイドバーとメインで同一データ | loader はルート単位。グローバルキャッシュで重複リクエストを排除したい |
| 無限スクロール | フィード、検索結果 | loader は「現在のページ」を返すだけ。過去ページの蓄積は自前管理が必要 |
| 楽観的更新 | いいねボタン、トグル | React Router にも optimistic UI はあるが、SWR/TanStack Query の方がシンプルな場合がある |
| ルートと無関係なバックグラウンドデータ | 設定、フィーチャーフラグ | URL 遷移と関係なく取得・キャッシュしたいデータ |

判断の流れ：**データが URL に紐づかない → ほぼ確実にキャッシュ層が必要**。紐づく場合でも、mutation が React Router の action を経由しない、または stale 表示なしの UX が許容されないなら、SWR / TanStack Query の導入を検討する。

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
- **intent パターン**：1つのルートで複数の操作（update / delete）を `<input type="hidden" name="intent">` で区別する。`navigation.formData?.get('intent')` を参照すれば送信中の操作を特定でき、`useFetcher` をフォームごとに使えば完全に独立した送信状態も得られる
- **revalidation**：action 完了後、全アクティブルートの loader が自動で再実行される。手動のキャッシュ無効化は不要。`<Form>` による action はナビゲーションを伴うが、`useFetcher` は URL を変えずに action を実行し同じ自動再検証を得る。`useRevalidator` を使えば action を介さない明示的な再検証も可能

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

### 現アーキテクチャの深掘り

React Router Data モード + React 19 の能力と限界を見極める実験。

1. **`useActionState`（React 19）** — 現在 `useActionData` + `useNavigation` で管理している「送信中か / エラーは何か」を React 19 標準 API に置き換える。最小の API 置換実験
2. **いいね機能 — ナビゲーションなしの revalidation + `useOptimistic`** — 投稿へのいいねトグルを実装し、`useFetcher` action による URL 変更なしの自動再検証と `useOptimistic` による楽観的 UI を統合的に試す。一覧ページで複数 fetcher が並行動作する状況、1件の変更でルート全体が再取得される revalidation 粒度の制約、連打時の race condition など、Data モードの能力の境界が体感できる
3. **Suspense + `React.lazy` によるコード分割** — 各ルートコンポーネントを遅延読み込みし Suspense でローディング UI を宣言的に配置する

### 代替アーキテクチャの体験

異なるルーティング・データ取得パラダイムとの比較。上記の実験で感じた Data モードの制約が、別のアプローチでどう解決されるかを確認する。

4. **TanStack Router** — ファイルベース＋完全型安全ルーティングを体験する。TanStack Query との組み合わせで、正規化キャッシュによるルート横断のデータ共有や Suspense ベースのローディング統合が実現しやすい
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
