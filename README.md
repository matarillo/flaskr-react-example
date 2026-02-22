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

### 技術選定の考察

| 技術 | 選択理由 |
|------|---------|
| **SWR** | ルーティングとデータ取得を別レイヤーで管理する構成を試したかった。`useSWR` でキャッシュ、`useSWRMutation` でログイン・ログアウトを実装 |
| **セッション認証** | JWT ではなく Cookie ベースの認証フローを Spring Security で実装し、`withCredentials` によるクロスオリジン送信を確認する |
| **Spring Data JDBC** | JPA より明示的で SQL に近い ORM を試す。`AggregateReference` による外部キー表現も確認 |
| **React Router v7 Declarative** | SWR にデータ取得を任せる構成では、ルーターにデータレイヤーを持たせない Declarative モードと相性が良い |
| **Vitest + MSW** | Vite ネイティブのテスト環境と API モックを組み合わせたフロントエンドテストを試す |
| **SonarQube / JaCoCo** | バックエンド・フロントエンドの静的解析とカバレッジ計測を CI に組み込む |

### 状態管理の設計

React の状態管理を4層に分類するモデルがある。このプロジェクトでの実装は以下の通り。

| 層 | 担うもの | 本プロジェクトでの実装 |
|----|---------|----------------------|
| **サーバー状態** | API から来るデータ | SWR（投稿一覧・詳細のキャッシュ） |
| **グローバルUI状態** | 認証状態 | React Context（内部で SWR を使用） |
| **フォーム状態** | 入力・バリデーション | `useState`（各フォームコンポーネント内） |
| **ローカル状態** | コンポーネント内 UI | `useState` |

`contexts/auth.tsx` は SWR と Context を組み合わせている点が特徴的。認証状態を `useSWR` でキャッシュ・再バリデーションしつつ、Context でコンポーネントツリーに提供している。サーバー状態とグローバルUI状態の境界が SWR によって一本化された形になっている。

#### SWR と TanStack Query

4層モデルではサーバー状態のツールとして TanStack Query が挙げられることが多いが、これは TanStack 側の立場からの整理であり、SWR も同じ層を担える。

| | SWR | TanStack Query |
|--|--|--|
| API の複雑さ | シンプル | 豊富だが学習コストあり |
| Mutation の DX | 基本的 | invalidation・楽観的更新が強力 |
| DevTools | なし | あり |
| バンドルサイズ | 小さい | やや大きい |

小規模な GET 中心の CRUD アプリでは SWR で十分。TanStack Query が優位になるのは、Mutation 後に複数のキャッシュを連動して無効化したい / 楽観的更新が必要 / DevTools で状態を可視化したい、といったケース。このプロジェクトの規模ではいずれも当てはまらない。

### ルーティング設計とトレンド

#### React Router v7 の3モード

| モード | API | 特徴 |
|--------|-----|------|
| **Declarative** ← 本プロジェクト | `BrowserRouter` + `Routes` + `Route` | 基本ルーティングのみ。独自のデータレイヤーと組み合わせやすい |
| **Data** | `createBrowserRouter` + `RouterProvider` | `loader` / `action` でルート単位のデータ取得・処理が可能 |
| **Framework** | `routes.ts` による設定ファイル | SSR、型安全 href、自動コード分割など最フル機能 |

Declarative モードでは `<Link to="...">` や `useParams()` に型が付かない。存在しないパスを渡しても、パラメータ名を間違えてもコンパイルエラーにならずランタイムまで気づけない。

#### 2025年のカスタムSPAにおけるルーター比較

| ルーター | 型安全性 | ファイルベース | 備考 |
|----------|----------|--------------|------|
| **TanStack Router** | コンパイル時に100% | ✅ `routeTree.gen.ts` 自動生成 | カスタムSPAのデファクトに近い |
| **React Router v7 Framework** | 部分的 | ✅ `routes.ts` | SSR対応あり |
| **React Router v7 Declarative** ← 本プロジェクト | なし | ❌ コード定義 | シンプル・学習向き |

#### ファイルベースルーティング

利点：URL構造とディレクトリ構造が一致する / `<Link>` やパスパラメータが自動型付けされコンパイル時にタイポを検出 / ルート単位のコード分割が自動化される

欠点：`$param.tsx` / `_layout.tsx` などの命名規則に慣れるまでコストがかかる / 複雑な条件分岐ルーティングが書きにくい / ルーティングの仕組みを基礎から理解したい段階では自動生成が邪魔になる

ファイルベースへの移行が進む背景として、TypeScript 普及による型安全性への要求の高まりと、Next.js によって「ファイルがルートになる」モデルが標準感覚になったことがある。

#### ルーティングとデータ取得を分離する構成のトレードオフ

本プロジェクトは Declarative Router + SWR を独立したレイヤーとして組み合わせている。

メリット：各ライブラリが単一責任を持ち入れ替えが容易 / データ取得の流れをコードレベルで明示的に追える / ルーティングとキャッシュ戦略を独立して最適化できる

デメリット：

- **描画前データ取得ができない** — コンポーネントがマウントされて初めてフェッチが始まるため、ルート遷移のたびにスピナーが出る。Data モードの `loader` はルート解決と並行してフェッチを開始するのでこの問題がない
- **認証チェックのフラッシュ** — `Create.tsx` / `Update.tsx` で発生している現象。未認証ユーザーに一瞬ページが見えてからリダイレクトされる
- **キャッシュキー管理が分散する** — ルート定義とデータ取得の対応関係がコードを横断するため、規模が増すと把握しにくくなる

小規模（5〜10 ルート程度）なら上記デメリットは UX 上許容できるケースが多く、構成の単純さと学習効率が優先される。

Data モードや TanStack Router への移行を検討するシグナル：ルート数が増えネストが深くなる / 認証フラッシュが UX 上許容できなくなる / Mutation が複雑になり DevTools が欲しくなる

## 次の実験候補

### 現在のスタックで即実施可能

1. **`useActionState`（React 19 ネイティブ）** — 現在 `useState` で手動管理している「送信中か / エラーは何か」を React 19 標準 API に置き換える。ライブラリ追加なしで完結する最小の実験
2. **SWR の楽観的更新** — `useSWRMutation` の `optimisticData` オプションで投稿削除・更新を即時反映する。現在はサーバー応答を待ってから再フェッチしているため、体感 UX の変化と実装コストを比較できる
3. **`useOptimistic`（React 19 ネイティブ）による楽観的UI** — SWR の `optimisticData` とは異なり React が直接管理する楽観的更新の仕組みを試す。SPA では `useTransition` + 非同期関数と組み合わせて使えるが、本来の力は Server Actions + RSC との組み合わせで発揮される。SWR アプローチとの実装コスト・コードの明快さを比較する
4. **Suspense + `React.lazy` によるコード分割** — 各ルートコンポーネントを遅延読み込みし Suspense でローディング UI を宣言的に配置する。データフェッチとの統合（`useSWR({ suspense: true })`）も試せるが、安定性は TanStack Query の方が高い

### ライブラリの追加・変更を伴う

5. **React Router Data モード** — `createBrowserRouter` + `loader` を導入することで2つの問題を同時に解決できる：ルート遷移と並行してデータフェッチを開始する（ウォーターフォール排除）/ 認証チェックをレンダリング前に完了してフラッシュを防ぐ（`App.tsx` 内にすでにメモあり）
6. **Zustand / Jotai によるグローバルUI状態の分離** — `contexts/auth.tsx` で混在している SWR（サーバー状態）と Context（グローバルUI状態）を切り離し、4層の境界を明確にする。現状の小規模アプリでは Context で十分なため、規模が増してから検討する方が学びが大きい
7. **TanStack Router** — ファイルベース＋完全型安全ルーティングを体験する。SWR との相性も良い。Suspense を使ったデータフェッチのローディング体験統合は SWR より TanStack Query + TanStack Router の組み合わせで実現しやすい
8. **React Router Framework モード** — `routes.ts` によるファイルベースルーティングを試す

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
