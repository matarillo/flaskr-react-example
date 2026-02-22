# SolidJS 考察メモ

> 現在のスタック（React 19）を SolidJS に置き換えた場合どうなるか、という個人的な考察。決定ではない。

作成：2026-02-22

---

## きっかけ

README に記載した技術トレンドの多くが React を前提にした整理になっている。同じ構成を SolidJS で組んだ場合に何が変わり、何が変わらないかを整理したくなった。

---

## Part 1 — 移行した場合の技術マッピング

### 現行スタックとの対応

| 現行（React） | SolidJS での対応 | 変化の大きさ |
|--------------|----------------|------------|
| `useState` | `createSignal` | 小（概念は近い） |
| `useContext` + SWR | モジュールレベルの Signal | 大（Provider 不要になることが多い） |
| SWR | `createResource`（組み込み）/ TanStack Query for Solid | 中 |
| Zustand / Jotai | `createStore`（組み込み） | 大（外部ライブラリ不要） |
| React Router v7 Declarative | `@solidjs/router` | 小（構造は近い） |
| Vitest + MSW | そのまま使える | なし |
| Vite | そのまま使える | なし |

SWR の公式 Solid アダプターは存在しない（コミュニティ製のみ）。小規模 CRUD なら `createResource` で代替できる範囲に収まる。

### 設計プリミティブの変化

各改善がどの設計的変化に起因するかをコード例と合わせて示す。

#### 認証状態管理 — Signal のグローバル利用で Provider が不要になる

現行の `contexts/auth.tsx` は SWR + Context を組み合わせるために、Context 定義・Provider コンポーネント・`useAuth` フックという3層構造が必要になっている。

```tsx
// 現行 React — 3層構造が必要
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  const { data: user, isLoading } = useSWR('/api/me', fetcher);
  const { trigger: login }        = useSWRMutation('/api/login', ...);
  const { trigger: logout }       = useSWRMutation('/api/logout', ...);
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext)!;
```

```ts
// SolidJS — モジュール export で済む（Provider 不要）
export const [user] = createResource(fetchCurrentUser);

export async function login(credentials) {
  await apiLogin(credentials);
  user.refetch();
}
```

React の Hook はコンポーネント内でしか呼び出せない。この制約が「グローバル状態を共有するには Provider でラップするしかない」という設計上の強制を生んでいる。SolidJS の Signal はただの値であり、モジュールのトップレベルに置いてそのまま export できるため、Provider という概念が不要になる。この差は「コード量の節約」ではなく、**「状態をコンポーネントツリーの外に切り出せる」という設計自由度の差**。

#### 複数 Mutation の状態合成 — 細粒度リアクティビティで手動合成が不要になる

`Update.tsx` では更新と削除の2つの Mutation を管理し、状態を手動で合成している。

```tsx
// 現行 React — isMutating と error を手動合成
const { trigger: update,  isMutating: isUpdating, error: updateError } = useSWRMutation(...);
const { trigger: remove,  isMutating: isDeleting, error: deleteError } = useSWRMutation(...);

const isMutating = isUpdating || isDeleting;
const error      = updateError ?? deleteError;
```

```tsx
// SolidJS（TanStack Query for Solid）— JSX 内で直接参照
const updateMutation = createMutation(() => ({ mutationFn: updatePost }));
const deleteMutation = createMutation(() => ({ mutationFn: deletePost }));

<button disabled={updateMutation.isPending || deleteMutation.isPending}>
```

SolidJS では JSX 内の式がリアクティブスコープとして実行されるため、Signal や Mutation 状態を直接参照できる。加えて、SolidJS にはコンポーネントの「再レンダリング」という概念がない。コンポーネント関数は初回の1回だけ実行され、Signal が変化したときに **Signal を読んでいる DOM 式だけ**が更新されるため、`useMemo` / `useCallback` / `React.memo` が不要になる——最適化する対象の再実行そのものが起きない設計になっている。

#### URL パラメータとデータ取得の連動 — createResource で依存追跡が自動になる

```tsx
// 現行 React — SWR のキャッシュキー変化を経由して間接的に連動
const [searchParams] = useSearchParams();
const page = Number(searchParams.get('page') ?? '1');
const { data: posts } = useSWR(`/api/posts?page=${page}`, fetcher);
```

```tsx
// SolidJS — searchParams はリアクティブプロキシ。source 変化で自動再フェッチ
const [searchParams] = useSearchParams();
const [posts] = createResource(
  () => searchParams.page ?? '1',   // ← ここが変わると自動で再フェッチ
  (page) => fetchPosts(page)
);
```

React では「SWR がキャッシュキーの変化を検知する」という間接的な仕組みに依存している。SolidJS の `createResource` はリアクティビティシステムに組み込まれた非同期プリミティブであり、ソース関数がリアクティブスコープ内で実行されるため依存関係が自動追跡される。SWR の Suspense 統合は `{ suspense: true }` オプション経由の後付けで既知の挙動問題があるが、`createResource` + `<Suspense>` は設計の一部として統合されている。

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

README では React の設計都合から状態を4層に分類した。SolidJS では Signal がグローバルにも使えるため、層の境界が一部融合する。

- **サーバー状態** → `createResource` または TanStack Query for Solid
- **グローバルUI状態** → Signal をモジュール export するだけ。Context + Provider が不要になるケースが多い
- **複雑なネストオブジェクト** → `createStore`（Zustand / Jotai 不要）
- **フォーム・ローカル状態** → `createSignal`（変わらない）

### ルーティング設計

`@solidjs/router` は React Router v7 Declarative と構造が近く、置き換えコストは低い。`load` 関数でルート単位のデータフェッチも組み込みでできるため、「描画前データ取得ができない」問題も SolidStart を使えばフレームワークレベルで解決できる。

ただし SolidStart は 2024 年に 1.0 到達したばかりで、Next.js と同列に語れる成熟度ではまだない。

### React 19 実験候補との対応

README の「次の実験候補」を SolidJS 視点で見ると：

- **`useActionState`** → Signal + `createResource` で自然に代替できる。専用 API は不要
- **`useOptimistic`** → Signal を即時更新してサーバー応答で上書きするパターンで代替できる
- **Suspense + `React.lazy`** → Solid 組み込みの `<Suspense>` と `lazy()` で対応。`createResource` とネイティブ統合しており React より安定して動く
- **RSC** → SolidStart はサーバー関数ベースの別路線。RSC とは設計思想が異なる

---

## Part 2 — 採用動機の批判的分析

### 誇張されがちな改善

「React より直感的」「React の複雑さから解放される」という声は実態を半分しか伝えていない。

Signal ベースのリアクティビティにも別種の複雑さが存在する：

- `untrack()` でトラッキングを意図的に切る必要がある場面がある
- リアクティブスコープ外で Signal を読んでも値が追跡されず、無音で失敗する
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
