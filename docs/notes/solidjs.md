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
| React Router v7 Declarative | `@solidjs/router` | 小（構造は近い） |
| Vitest + MSW | そのまま使える | なし |
| Vite | そのまま使える | なし |

SWR の公式 Solid アダプターは存在しない（コミュニティ製のみ）。小規模 CRUD なら `createResource` で代替できる範囲に収まる。

### コードレベルで簡潔になる箇所

#### 認証状態管理 — Provider パターンが不要になる

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

Signal はコンポーネント外に置けるため、Provider でラップするという React 固有の儀式が消える。

#### 複数 Mutation の状態合成 — Update.tsx

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

// JSX 内の式はリアクティブなので手動合成が不要
<button disabled={updateMutation.isPending || deleteMutation.isPending}>
```

#### URL パラメータとデータ取得の連動 — PostList.tsx

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

React の場合、連動は「SWR がキャッシュキーの変化を検知する」という間接的な仕組みに依存している。SolidJS では `createResource` のソース関数がリアクティブスコープ内で実行されるため、依存関係が明示的かつ自動的に追跡される。

---

### 状態管理の4層モデル

README では React の設計都合から状態を4層に分類した。SolidJS では Signal がグローバルにも使えるため、層の境界が一部融合する。

- **サーバー状態** → `createResource` または TanStack Query for Solid
- **グローバルUI状態** → Signal をモジュール export するだけ。Context + Provider が不要になるケースが多い
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

### 全体像

```
SolidJS が選ばれる実際の文脈
├── 実際に改善される（設計的根拠あり）
│   ├── Signal のグローバル利用 → Provider パターンが不要
│   ├── 細粒度リアクティビティ → useMemo / useCallback が不要
│   └── createResource のネイティブ統合 → 非同期処理が単純
│
├── 誇張されがちな改善
│   ├── 「React より簡単」← 別種の複雑さが残る
│   └── パフォーマンス優位 ← DOM 操作がボトルネックのアプリは限定的
│
└── 批判的に見るべき採用動機
    ├── ベンチマーク数字の過大解釈
    ├── 言説量が実採用量を上回るエコシステム錯覚
    ├── React への習熟不足の別解としての選択
    └── ポートフォリオ差別化動機
```

### 実際に改善される部分とその設計的背景

#### Signal のグローバル利用 → Provider パターンが不要

React の Hook はコンポーネント内でしか呼び出せない。この制約が「グローバル状態を共有するには Provider でラップするしかない」という設計上の強制を生んでいる。`contexts/auth.tsx` がその典型で、SWR・Context・useContext・Provider という複数の仕組みを組み合わせて初めて認証状態を共有できる。

SolidJS の Signal はただの値であり、モジュールのトップレベルに置いてそのまま export できる。コンポーネントツリーへの配置に依存しないため、Provider という概念が不要になる。この差は「コード量の節約」ではなく、**「状態をコンポーネントツリーの外に切り出せる」という設計自由度の差**。

#### 細粒度リアクティビティ → useMemo / useCallback / React.memo が不要

React の再レンダリングはコンポーネント単位で発生する。state が変わると、そのコンポーネント以下のツリーを原則として全部再実行する。`useMemo`・`useCallback`・`React.memo` はこの「不要な再実行を防ぐ」ための事後対処として存在する。

SolidJS にはコンポーネントの「再レンダリング」という概念がない。コンポーネント関数は初回の1回だけ実行され、以降は Signal が変化したときに **Signal を読んでいる DOM 式だけ**が更新される。最適化する「コンポーネントの再実行」自体が起きないため、最適化のための API が不要になる。

この差は規模が大きくなるほど効いてくる。小規模アプリでは React でも `useMemo` なしで動くことが多いが、中規模以上になると「どこで `memo` が必要か」の判断が散在しはじめる。

#### createResource のネイティブ統合 → 非同期処理が単純

SWR は React に非同期状態管理を追加するライブラリであり、Suspense との統合は `{ suspense: true }` オプション経由で「後付け」になっている。実際に既知の挙動の問題がある（Suspense モードでの revalidation の扱いなど）。

SolidJS の `createResource` はリアクティビティシステムに組み込まれた非同期プリミティブであり、`<Suspense>` との統合は設計の一部。loading / error / data の3状態が Signal と同じ追跡モデルで管理され、追加ライブラリなしで動く。小規模アプリでは SWR に相当するものが `createResource` 一つで済む。

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

満足度が高い（State of JS 2023 で約 79%）一方、使用率は約 10%。满足度の母集団がアーリーアダプターに偏っている。Ryan Carniato の発信力の高さが、コミュニティの実態よりも大きな規模感を作り出している側面がある。

| 観点 | React | SolidJS |
|------|-------|---------|
| npm 週間 DL | 約 2,500 万 | 約 50〜70 万 |
| UI コンポーネントライブラリ | MUI・shadcn/ui 等が豊富 | 選択肢は限られる |
| メタフレームワーク | Next.js（成熟） | SolidStart（1.0、発展中） |
| TanStack 対応 | フル対応 | Query / Router / Form / Table すべて Solid 版あり |
| DevTools | 成熟 | β段階 |

エコシステムの薄さは実務上のリスクとして存在する。このプロジェクトの規模では表面化しにくいが、ライブラリ選定のたびに「Solid 版があるか」を確認するコストがかかる。

---

## 判断

このプロジェクトの規模（5〜10 ルート、シンプル CRUD）で SolidJS を試すこと自体は技術的に筋が通っている。Signal ベースの設計を体験できる規模感で、実装量も React より少なくなる可能性が高い。

一方、「React の代替として採用する」ための動機はまだない。エコシステムの薄さと SolidStart の未成熟さは、本番投入の障壁として実在する。

**現時点の結論：** 学習目的で別ブランチに実装して比較するなら価値がある。本番スタックの変更を検討するなら、まず移行コストと得られるものを実測してから ADR に昇格させる。
