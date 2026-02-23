# SolidJS 考察メモ

> 現在のスタック（React 19）を SolidJS に置き換えた場合どうなるか、という個人的な考察。決定ではない。

作成：2026-02-22
更新：2026-02-23

---

## きっかけ

README に記載した技術トレンドの多くが React を前提にした整理になっている。同じ構成を SolidJS で組んだ場合に何が変わり、何が変わらないかを整理したくなった。

---

## Part 1 — 移行した場合の技術マッピング

### 現行スタックとの対応

| 現行（React） | SolidJS での対応 | 変化の大きさ |
|--------------|----------------|------------|
| `useState` | `createSignal` | 小（概念は近い） |
| `rootLoader` + `useRouteLoaderData` | モジュールレベルの Signal | 中（ルーターとの結合がなくなる） |
| React Router `loader` | `createResource`（組み込み）/ TanStack Query for Solid | 中 |
| Zustand / Jotai | `createStore`（組み込み） | 大（外部ライブラリ不要） |
| React Router v7 Data | `@solidjs/router` | 小（構造は近い） |
| Vitest + MSW | そのまま使える | なし |
| Vite | そのまま使える | なし |

本プロジェクトでは SWR を廃止し React Router `loader` に移行済み。React Router の `loader` はナビゲーション完了前にデータを取得してブロックする設計だが、SolidJS の `createResource` はレンダリング中にフェッチを開始し Suspense と連携して表示を制御する。ルーター単位のプリフェッチが必要な場合は `@solidjs/router` の `preload` 関数を使う。

### 設計プリミティブの変化

各改善がどの設計的変化に起因するかをコード例と合わせて示す。

#### 認証状態管理 — Signal のグローバル利用でルーターとの結合が不要になる

現行の React Router Data モードでは、`rootLoader` がルートレベルで認証状態を取得し、`useLoaderData` / `useRouteLoaderData` で子ルートに提供している。Provider/Context は不要だが、認証状態がルーターのライフサイクルに結合している。

```tsx
// 現行 React — rootLoader でルーター経由の認証状態管理
export async function rootLoader(): Promise<{ user: User | null }> {
  try {
    const response = await authApi.getCurrentUser()
    if (response.success) {
      return { user: { userId: response.userId, username: response.username } }
    }
    return { user: null }
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return { user: null }
    throw error
  }
}

// Layout: const { user } = useLoaderData()
// 子ルート: const { user } = useRouteLoaderData('root')
```

```ts
// SolidJS — モジュール export で済む（ルーターと無関係に状態管理）
export const [user, { refetch: refetchUser }] = createResource(fetchCurrentUser);

export async function login(credentials) {
  await apiLogin(credentials);
  refetchUser();
}
```

React Router Data モードでは Provider/Context こそ不要になったが、認証状態はルーターの `loader` に組み込まれている——ナビゲーション時に再実行され、ルーティングと状態管理が結合する設計。SolidJS の Signal はモジュールのトップレベルに置けるため、ルーターやコンポーネントツリーとは完全に独立した状態管理が可能になる。この差は**「状態をどのレイヤーにも結合させない設計自由度」**。

#### 複数 Mutation の状態管理 — 細粒度リアクティビティで操作ごとの状態を区別できる

現行の `Update.tsx` では、1つの `action` 関数が `intent` パターンで update / delete を区別し、`useNavigation` でフォーム全体の送信状態を管理している。

```tsx
// 現行 React — action + intent パターン（更新・削除を1つの action で処理）
export async function updateAction({ request, params }) {
  const formData = await request.formData()
  const intent = formData.get('intent')
  if (intent === 'delete') { /* 削除処理 */ }
  // 更新処理
}

// コンポーネント側 — navigation.state はフォーム全体の状態
const actionData = useActionData<UpdateActionData>()
const navigation = useNavigation()
const isSubmitting = navigation.state === 'submitting'
```

```tsx
// SolidJS（TanStack Query for Solid）— 操作ごとに状態が分離
const updateMutation = createMutation(() => ({ mutationFn: updatePost }));
const deleteMutation = createMutation(() => ({ mutationFn: deletePost }));

<button disabled={updateMutation.isPending}>Save</button>
<button disabled={deleteMutation.isPending}>Delete</button>
```

React Router の intent パターンでは `navigation.state` がフォーム全体に対する状態であり、「更新中か削除中か」の区別がつかない。SolidJS で個別の Mutation を管理すれば、操作ごとの loading / error 状態が分離する。加えて、SolidJS にはコンポーネントの「再レンダリング」という概念がない。コンポーネント関数は初回の1回だけ実行され、Signal が変化したときに **Signal を読んでいる DOM 式だけ**が更新されるため、`useMemo` / `useCallback` / `React.memo` が不要になる——最適化する対象の再実行そのものが起きない設計になっている。

#### URL パラメータとデータ取得の連動 — createResource で宣言的な依存追跡が可能になる

```tsx
// 現行 React — loader が request.url から直接 searchParams を取得
export async function postsLoader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '0', 10)
  const size = parseInt(url.searchParams.get('size') || '10', 10)
  return postApi.list({ page, size })
}

// コンポーネント側
const data = useLoaderData() as ListPostsResponse
```

```tsx
// SolidJS — searchParams はリアクティブプロキシ。source 変化で自動再フェッチ
const [searchParams] = useSearchParams();
const [posts] = createResource(
  () => searchParams.page ?? '1',   // ← ここが変わると自動で再フェッチ
  (page) => fetchPosts(page)
);
```

React Router の loader はナビゲーション（URL 変化）時に再実行されるため、URL パラメータの取得は直接的。ただし loader はナビゲーションイベントに結合しており、「URL は変えずにデータだけ再取得する」操作には向かない。SolidJS の `createResource` はリアクティビティシステムに組み込まれた非同期プリミティブであり、ソース関数がリアクティブスコープ内で実行されるため依存関係が自動追跡される。`createResource` + `<Suspense>` は設計の一部として統合されている。

#### 複雑なネストオブジェクト — createStore で Zustand / Jotai が不要になる

このプロジェクトの規模では出番がないが、ネストしたオブジェクト状態を扱う場面では `createStore` が組み込みで利用できる。

```ts
const [state, setState] = createStore({
  user: { name: 'Alice', preferences: { theme: 'dark' } },
  posts: [] as Post[]
});

// 深いプロパティも細粒度で追跡される
setState('user', 'name', 'Bob');
// user.name を読んでいる箇所だけ更新。posts は無影響
```

React で Zustand / Jotai が必要になる理由は「Hook はコンポーネント外に置けない」「Context は変化のたびにツリーを再レンダリングする」の2点だが、SolidJS ではどちらも存在しない。Signal がコンポーネント外に置けて細粒度で追跡されるため、外部ライブラリなしに同じことができる。`createStore` の `produce` ヘルパーは Immer に相当する不変更新の書き心地を提供する。

### 状態管理の4層モデル

README では状態を所在とスコープで4層（URL State / Server State / Global State / Local State）に分類した。SolidJS では Signal がグローバルにも使えるため、層の境界が一部融合する。

| 層 | SolidJS での実装 |
|----|-----------------|
| **URL State** | `@solidjs/router` の `useSearchParams`（リアクティブプロキシ） |
| **Server State** | `createResource` または TanStack Query for Solid |
| **Global State** | Signal をモジュール export するだけ。Context + Provider が不要になるケースが多い |
| **Local State** | `createSignal`（変わらない） |

ネストしたオブジェクト状態には `createStore`（Zustand / Jotai 不要）が使える。

### ルーティング設計

`@solidjs/router` は React Router v7 Data と構造が近く、置き換えコストは低い。`preload` 関数（v0.14 で `load` から改名）でルート単位のデータプリフェッチが組み込みでできる点も Data モードの `loader` と対応している。ただし `loader` がナビゲーションをブロックしてデータを返すのに対し、`preload` はキャッシュを温めるだけでナビゲーションをブロックしない——データの消費は `createAsync` や `createResource` を通じて Suspense と連携する設計になっている。

ただし SolidStart は 2024 年に 1.0 到達したばかりで、Next.js と同列に語れる成熟度ではまだない。

### React 19 実験候補との対応

README の「次の実験候補」を SolidJS 視点で見ると：

- **`useActionState`** → Signal + `createResource` で自然に代替できる。専用 API は不要
- **`useOptimistic`** → Signal を即時更新してサーバー応答で上書きするパターンで代替できる
- **Suspense + `React.lazy`** → Solid 組み込みの `<Suspense>` と `lazy()` で対応。`createResource` とネイティブ統合されている。VDOM を持たないため Suspense 境界の挙動が React より単純で予測しやすい（React 19 で Suspense は正式安定したが、reconciliation モデルとの相互作用は依然複雑）
- **RSC** → SolidStart はサーバー関数ベースの別路線。RSC とは設計思想が異なる

---

## Part 2 — 採用動機の批判的分析

### 誇張されがちな改善

「React より直感的」「React の複雑さから解放される」という声は実態を半分しか伝えていない。

Signal ベースのリアクティビティにも別種の複雑さが存在する：

- `untrack()` でトラッキングを意図的に切る必要がある場面がある
- リアクティブスコープ外で Signal を読むと現在値は取得できるが購読が作られないため、値が変化しても UI が更新されない（コンポーネント関数が1回しか実行されないため、早期に変数へ展開すると追跡が切れる）
- `batch()` による更新のバッチング管理

**推測：** 「SolidJS に移行して楽になった」という声の一部は、React の複雑なユースケース（グローバル状態、複雑な Effect）から SolidJS で書いた小規模アプリへの比較をしている。同規模・同要件で比較した場合の差はより小さいはず。

### 批判的に見るべき採用動機

#### ベンチマーク信仰

`js-framework-benchmark` での優位は事実だが、一般的な CRUD アプリのボトルネックは DOM 操作速度ではない。「パフォーマンス」が採用理由として語られるとき、実際には「パフォーマンス不満」ではなく「パフォーマンスへの美的こだわり」または後付け理由であることが多い。

#### エコシステム錯覚

満足度が高い（State of JS 2023 で約 79%）一方、使用率は約 10%。満足度の母集団がアーリーアダプターに偏っている。Ryan Carniato の発信力の高さが、コミュニティの実態よりも大きな規模感を作り出している側面がある。

| 観点 | React | SolidJS |
|------|-------|---------|
| npm 週間 DL | 約 2,500 万 | 約 50〜70 万 |
| UI コンポーネントライブラリ | MUI・shadcn/ui 等が豊富 | 選択肢は限られる |
| メタフレームワーク | Next.js（成熟） | SolidStart（1.0、発展中） |
| TanStack 対応 | フル対応 | Query / Router / Form / Table すべて Solid 版あり |
| DevTools | 成熟 | β段階 |

エコシステムの薄さは実務上のリスクとして存在する。このプロジェクトの規模では表面化しにくいが、ライブラリ選定のたびに「Solid 版があるか」を確認するコストがかかる。

#### React への習熟不足の別解・ポートフォリオ差別化

「React が難しかったから SolidJS へ」という動機は、React の設計上の問題に起因する場合と、React への学習投資が不足していた場合が混在している。両者を区別しないまま「SolidJS の方が簡単だった」と結論づけると、移行後に別の難しさにぶつかったとき判断の根拠が崩れる。

個人プロジェクトでは「React ではなく SolidJS を選んだ」という事実がポートフォリオ上の差別化として機能する側面もある。これ自体は批判ではなく実際に働く動機だが、「プロダクトに最適な技術を選んだ」という語りと実際の動機が乖離している場合がある。

---

## 判断

このプロジェクトの規模（5〜10 ルート、シンプル CRUD）で SolidJS を試すこと自体は技術的に筋が通っている。Signal ベースの設計を体験できる規模感で、実装量も React より少なくなる可能性が高い。

一方、「React の代替として採用する」ための動機はまだない。エコシステムの薄さと SolidStart の未成熟さは、本番投入の障壁として実在する。

**現時点の結論：** 学習目的で別ブランチに実装して比較するなら価値がある。本番スタックの変更を検討するなら、まず移行コストと得られるものを実測してから ADR に昇格させる。
