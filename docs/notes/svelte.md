# Svelte 考察メモ

> 現在のスタック（React 19）を Svelte に置き換えた場合どうなるか、という個人的な考察。決定ではない。

作成：2026-02-22

---

## きっかけ

SolidJS・Vue の考察と同じ問いを Svelte に向けた整理。Svelte は「コンパイラがフレームワークである」という点で React・Vue・SolidJS のいずれとも異なる立場を取っている。設計目標（VDOM なし・細粒度リアクティビティ）は SolidJS に近いが、構文（テンプレート SFC）は Vue に近い——三者の中間に位置する存在として、四者の座標を明確にするために書いた。

---

## Part 1 — 移行した場合の技術マッピング

### 現行スタックとの対応

| 現行（React） | Svelte での対応 | 変化の大きさ |
|--------------|----------------|------------|
| `useState` | `$state()` Rune | 小（概念は近い、構文が変わる） |
| `useContext` + SWR | `.svelte.ts` のモジュールレベル `$state` | 大（Provider 不要） |
| SWR | TanStack Query for Svelte / SvelteKit `load` | 中 |
| Zustand / Jotai | `.svelte.ts` の `$state`（外部ライブラリ不要） | 大 |
| React Router v7 Declarative | SvelteKit（ファイルベース） | **大（構造が全く変わる）** |
| Vitest + MSW | そのまま使える | なし |
| Vite | SvelteKit が内包（設定変更あり） | 小 |
| JSX / `.tsx` | SFC（`.svelte` ファイル） | **大（テンプレート構文に変わる）** |

Vue への移行と同様、React → Svelte は JSX を捨ててテンプレート構文を習得する変化が加わる。ただし Svelte のテンプレートは Vue の `v-if` / `v-for` ディレクティブと異なり、`{#if}` / `{#each}` / `{#await}` という Svelte 独自の構文を使う——Vue より JSX に近い表現力がある。

ルーティングは最大の変化。SvelteKit はファイルベースルーティングが前提であり、`+page.svelte` / `+layout.svelte` / `+page.server.ts` の命名規則と、load 関数・form actions という新しい概念を覚える必要がある。

---

### 設計プリミティブの変化

#### 認証状態管理 — `.svelte.ts` ファイルで Provider が不要になる

現行の `contexts/auth.tsx` は SWR + Context を組み合わせるため、Context 定義・Provider コンポーネント・`useAuth` フックという3層構造が必要になっている。

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
// Svelte 5 — auth.svelte.ts（モジュールレベルで Rune が使える）
import { authApi } from '$lib/api/auth'

// $state をオブジェクトに使うとプロパティが細粒度で追跡される
export const auth = $state({
  user: null as User | null,
  isLoading: false,
})

export async function login(credentials: LoginRequest) {
  auth.isLoading = true
  try {
    const res = await authApi.login(credentials)
    auth.user = { userId: res.userId, username: res.username }
  } finally {
    auth.isLoading = false
  }
}

export async function logout() {
  await authApi.logout()
  auth.user = null
}
```

```svelte
<!-- コンポーネント側 — Provider なしに直接 import して使える -->
<script lang="ts">
  import { auth, login, logout } from '$lib/stores/auth.svelte'
</script>

{#if auth.user}
  <span>{auth.user.username}</span>
  <button onclick={logout}>ログアウト</button>
{/if}
```

Svelte 5 では `.svelte.ts` 拡張子を持つファイル内で Rune（`$state` 等）をコンポーネント外で使える。これが「ユニバーサルリアクティビティ」と呼ばれる設計変更。React の Hook がコンポーネント内でしか呼び出せない制約——「グローバル状態には Provider が必要」という強制——をコンパイラが解消する。

SolidJS のモジュールレベル Signal と最終結果は同じだが、手段が異なる。SolidJS は「Signal はただの JavaScript の値であり、どこでも使える」という**ランタイムの設計**。Svelte は「`.svelte.ts` ファイルをコンパイル対象に広げる」という**コンパイラの設計**。

#### URL パラメータとデータ取得の連動 — SvelteKit load 関数

```tsx
// 現行 React — SWR のキャッシュキー変化を経由して間接的に連動
const [searchParams] = useSearchParams();
const page = Number(searchParams.get('page') ?? '1');
const { data: posts } = useSWR(`/api/posts?page=${page}`, fetcher);
```

```ts
// SvelteKit — +page.server.ts（URL パラメータに連動したサーバーサイドフェッチ）
import type { PageServerLoad } from './$types'
import { postApi } from '$lib/api/post'

export const load: PageServerLoad = async ({ url }) => {
  const page = Number(url.searchParams.get('page') ?? '1')
  const posts = await postApi.list({ page })
  return { posts }
}
```

```svelte
<!-- +page.svelte — load の返り値が $props として渡される -->
<script lang="ts">
  import type { PageData } from './$types'
  let { data }: { data: PageData } = $props()
</script>

{#each data.posts as post}
  <article>...</article>
{/each}
```

SvelteKit の `load` 関数はルート遷移と**並行して**フェッチを開始する。React Router v7 Declarative が抱えていた「コンポーネントがマウントされて初めてフェッチが始まる（スピナーが出る）」という問題がアーキテクチャレベルで解消されている。ただしこれは `+page.server.ts` を使った SSR/SSG 構成での話。純粋な SPA として動かす場合は `+page.ts`（クライアントサイド load）を使うことになり、SWR に近い構成になる。

#### 複数 Mutation の状態合成 — `$derived` で依存追跡が自動になる

```tsx
// 現行 React — isMutating と error を手動合成
const { trigger: update, isMutating: isUpdating, error: updateError } = useSWRMutation(...);
const { trigger: remove, isMutating: isDeleting, error: deleteError } = useSWRMutation(...);

const isMutating = isUpdating || isDeleting;
const error      = updateError ?? deleteError;
```

```svelte
<script lang="ts">
  import { createMutation } from '@tanstack/svelte-query'

  const updateMutation = createMutation({ mutationFn: updatePost })
  const deleteMutation = createMutation({ mutationFn: deletePost })

  // $derived — 参照した $state/$store が変化すると自動で再計算
  const isMutating = $derived(
    $updateMutation.isPending || $deleteMutation.isPending
  )
  const error = $derived($updateMutation.error ?? $deleteMutation.error)
</script>

<button disabled={isMutating}>保存</button>
<button disabled={isMutating} class="danger">削除</button>
```

`$derived` は `useMemo` に近いが、依存配列を書かなくていい。参照した値を自動追跡し、変化があったときだけ再計算する——`watchEffect`（Vue）・`createMemo`（SolidJS）と同じ設計。TanStack Query for Svelte は現在もストアベースの API を返すため、テンプレート内では `$` 自動購読構文（`$updateMutation.isPending`）でアクセスする。

---

### 状態管理の4層モデル（Svelte 版）

| 層 | 担うもの | Svelte での実装 |
|----|---------|----------------|
| **サーバー状態** | API から来るデータ | SvelteKit `load` 関数 / TanStack Query for Svelte |
| **グローバルUI状態** | 認証状態など | `.svelte.ts` の `$state`（外部ライブラリ不要） |
| **複雑なネストオブジェクト** | フォーム・ウィザードなど | `$state`（プロキシで深いプロパティも細粒度追跡） |
| **フォーム・ローカル状態** | 入力値 | `$state` / `bind:value` |

`$state` をオブジェクトに適用すると、プロキシを通じてネストしたプロパティも細粒度で追跡される。Vue の `reactive()` と同じ仕組みだが、`.value` アクセスが不要な分コードが短くなる。SolidJS の `createStore` に対応する。

```ts
// ネストオブジェクトの更新
const form = $state({ title: '', body: '', errors: {} as Record<string, string> })

form.title = '新しいタイトル'          // React: setForm(prev => ({ ...prev, title: '...' }))
form.errors.title = 'タイトルは必須'  // Vue: form.errors.title = '...'（同じ記述）
```

React の「イミュータブル更新」という精神的負荷が、Svelte では通常の代入で消える——ただしこれはコンパイラが代入をフックして DOM 更新コードに変換しているためであり、「普通の代入」に見えても内部的にはリアクティブな操作になっている。

---

### ルーティング設計

SvelteKit のファイル構成は React Router v7 Declarative とは大きく異なる：

```
routes/
  +layout.svelte          # 全ページ共通レイアウト
  +layout.server.ts       # レイアウトレベルのサーバー load
  +page.svelte            # / (投稿一覧)
  +page.server.ts         # サーバー load + form actions
  posts/
    [id]/
      +page.svelte        # /posts/:id（動的ルート）
      +page.server.ts
    create/
      +page.svelte        # /posts/create
      +page.server.ts
  auth/
    login/
      +page.svelte
```

`+page.server.ts` の `actions` は `<form>` と連携したサーバーサイドミューテーションを実現し、JavaScript なしでも動作する Progressive Enhancement を設計の一部に持っている。これは React Router Data モードの `action` に相当するが、SSR・CSR・Form Actions が一体化している点が違う。

型安全性については、SvelteKit が自動生成する `./$types` から `PageData` / `PageServerLoad` 等の型が使えるため、ルートのデータ型が end-to-end で保証される。React Router v7 Declarative が抱えていた「`<Link to="...">` に型が付かない」問題も解消している。

---

### React 19 実験候補との対応

README の「次の実験候補」を Svelte 視点で見ると：

- **`useActionState`** → SvelteKit の Form Actions（`+page.server.ts` の `actions`）が対応する。`use:enhance` のコールバックで `pending` 状態とエラーが自動管理される。SPA 構成では `$state` + 非同期関数で代替できる
- **`useOptimistic`** → `$state` を即時更新してサーバー応答で上書きするパターンで代替できる。Svelte の代入ベース更新は `useOptimistic` より自然に書ける
- **`Suspense + React.lazy`** → `{#await promise}` ブロックがコンポーネントレベルの非同期 UI に対応する。ルート単位のコード分割は SvelteKit が自動化しており `React.lazy` に相当するものを書く必要がない
- **RSC（React Server Components）** → SvelteKit の `+page.server.ts` はサーバーサイドのデータ取得・ミューテーションを担う点で概念的に近いが、RSC の「サーバーコンポーネントをクライアントに組み込む」モデルとは異なる。SvelteKit は「サーバー関数がデータを返し、クライアントコンポーネントが受け取る」という明確な分離を持つ別路線

---

## Part 2 — 採用動機の批判的分析

### 誇張されがちな改善

「書く量が少ない」「React より直感的」という声は実態を半分しか伝えていない。Svelte 固有の難しさが別に存在する：

- **Svelte 4 → 5 の概念的断絶** — 暗黙的リアクティビティ（`let count = 0` が自動でリアクティブ）から明示的 Rune（`let count = $state(0)`）への変更は、既存の Svelte 4 学習リソースとの互換性を壊す。2026年時点で移行中のコードベースやドキュメントが混在しており、検索で出てくる記事が Svelte 4 の書き方を教えている場合がある
- **コンパイラへの依存** — リアクティビティがランタイムではなくコンパイラで実現されているため、`.svelte.ts` 外で `$state` を書いてもコンパイルエラーになる。この「コンパイラが全部見ている」という前提を理解するまで混乱しやすい
- **テンプレート構文の独自性** — `{#if}` / `{#each}` / `{#await}` は HTML でも JSX でもない Svelte 独自の DSL。「HTML のスーパーセット」を謳いながら、実際にはコンパイラが理解できる構文
- **`$` シジル（sigil）の乱立** — `$state` / `$derived` / `$effect` / `$props` の Rune と、Svelte ストア（`writable` / `readable`）の自動購読構文（テンプレート内の `$store`）が同じ `$` 接頭辞を使っており、文脈で区別が必要

「Svelte は書きやすかった」という評価の一部は、小規模アプリで `$state` を `useState` の代わりに使った体験に基づいている可能性がある。SvelteKit でのルーティング・SSR・Form Actions・Progressive Enhancement の学習コストは、React Router + SWR の組み合わせと比べてむしろ高い。

### 批判的に見るべき採用動機

#### バンドルサイズ信仰

「フレームワークがコンパイルで消えるから軽い」という主張は小規模では正しいが、スケールすると逆転する。

Svelte はコンポーネントごとにリアクティビティのコードをコンパイル出力に含める。コンポーネント数が少ない段階ではランタイムを持つ React / Vue より軽いが、コンポーネント数が増えるとコンパイル済みコードの総量が増え続け、React / Vue のランタイム共有の恩恵を上回る逆転が起きる——これは Svelte コミュニティで「Svelte のスケーリング問題」として認識されている課題。一般的な CRUD アプリのボトルネックはバンドルサイズでも DOM 操作速度でもない、という前提は React / SolidJS 比較と変わらない。

#### エコシステム

| 観点 | React | Svelte |
|------|-------|--------|
| npm 週間 DL | 約 2,500 万 | 約 200〜300 万 |
| UI コンポーネントライブラリ | MUI・shadcn/ui 等が豊富 | shadcn-svelte・Skeleton・Flowbite Svelte など |
| メタフレームワーク | Next.js（成熟） | SvelteKit（成熟、Vercel 支援） |
| TanStack 対応 | フル対応 | Query / Router / Table / Form すべて Svelte 版あり |
| DevTools | 成熟 | ブラウザ拡張あり、機能は限定的 |

SolidJS よりエコシステムは厚く、SvelteKit は SolidStart より成熟している。ただし React の「大体ある」とは言えず、ライブラリ選定のたびに「Svelte 版があるか」を確認するコストがかかる。

#### Svelte 4 → 5 の破壊的変化

Svelte 5（2024年11月）は Runes という大きな概念変更を伴った。後方互換はあるが問題がある：

- 既存の Svelte 4 コードは Svelte 5 でも動作するが、新しい書き方を使うためには段階的な書き直しが必要
- Svelte 4 の `$:` リアクティブ宣言・`writable` / `readable` ストアは Svelte 5 でも使えるが、「どちらを使うべきか」が曖昧になりやすい
- React も Hook 導入（v16.8）で同様の断絶を経験したが、Hooks への移行は現在ほぼ完了している。Svelte の Runes への移行は 2026 年時点でまだ進行中

---

### SolidJS との比較 — 「コンパイラ」と「ランタイム Signal」

Svelte と SolidJS は**設計上の最終目標が最も近い**。どちらも「VDOM なし・細粒度リアクティビティ・コンポーネントの再実行がない」を実現しているが、手段が対照的。

| 観点 | Svelte 5 | SolidJS |
|------|----------|---------|
| リアクティビティの実現 | **コンパイラ**が `$state` の代入を変換 | **ランタイム** Signal（`createSignal`） |
| 構文 | HTML テンプレート（`.svelte`） | JSX（`.tsx`） |
| コンポーネントの再実行 | なし（コンパイル済みコードが直接 DOM 更新） | なし（Signal を読んでいる箇所だけ更新） |
| ユニバーサルリアクティビティ | `.svelte.ts` ファイルで Rune が使える | JavaScript のどこでも Signal が使える |
| TypeScript 統合 | テンプレート内に制約あり（JSX より精度が落ちる場面） | JSX のため完全な型推論 |
| メタフレームワーク | SvelteKit（成熟） | SolidStart（1.0、発展中） |
| エコシステム | 小〜中 | 小 |

最大の違いは「何を頼りにしているか」。SolidJS は JavaScript の実行時セマンティクスを活かしてリアクティビティを実現する——Signal は普通の関数であり、呼び出すと追跡される。Svelte は JavaScript のセマンティクスをコンパイラが**書き換える**——`$state` への代入は「普通の代入」ではなく、コンパイラが DOM 更新コードに変換する。

実用上の差として表れるのは TypeScript の型推論。SolidJS は JSX + TypeScript の標準的な恩恵をそのまま受けられる。Svelte のテンプレート内は JSX ほどの精度ではなく、コンポーネント間の型の受け渡しに煩雑さが残る場面がある。エコシステムの厚さでは Svelte が SolidJS を上回り、SvelteKit は SolidStart より成熟している——「小さいが確立されたエコシステム」を求めるなら Svelte、「最小限のランタイムと JSX の自由度」を求めるなら SolidJS、という棲み分け。

---

### Vue.js との比較 — SFC という共通点と VDOM という差異


Svelte と Vue はどちらも SFC（Single File Component）を採用しており、開発体験の面では最も近い。

| 観点 | Svelte 5 | Vue 3 |
|------|----------|-------|
| ファイル形式 | `.svelte`（template + script + style） | `.vue`（template + script + style） |
| テンプレート構文 | `{#if}`・`{#each}`（Svelte 独自） | `v-if`・`v-for`（Vue ディレクティブ） |
| リアクティビティ | `$state`（`.value` 不要） | `ref().value` / `reactive()` |
| VDOM | **なし**（コンパイル時に Direct DOM） | あり（Vapor Mode で廃止方向） |
| グローバル状態 | `.svelte.ts` の `$state` | Pinia store |
| `useEffect` 相当 | `$effect`（自動依存追跡） | `watchEffect`（自動依存追跡） |
| パラダイム | なし（Runes に統一） | Options API / Composition API の混在 |

最大の技術的差異は VDOM の扱い。Svelte はコンパイル時に Direct DOM 操作コードを生成し、最初から VDOM を持たない。Vue 3 は Vapor Mode（Vue 3.6 目標）で同じ方向へ移行中だが、既存エコシステムとの互換性を保ちながら段階的に移行するため、Svelte の「設計当初からない」とは出自が異なる。

`ref().value` の煩雑さは Vue のよく指摘される問題で、Svelte はこれを持たない。ただし Svelte は `$` シジルのルールを覚える必要があり（Rune と store 自動購読の区別など）、別の認知コストがある。Vue が Options API / Composition API の二重パラダイムを抱えているのに対し、Svelte は Svelte 5 から Runes への統一が進んでいる——これは Vue より明確な方向性。

---

### 四者の設計的位置づけ

SolidJS 考察・Vue 考察に Svelte を加えた整理：

- **React**：「JavaScript の中で UI を記述する」という JSX モデルを徹底。フレームワーク機能を最小限にし、状態管理・ルーティング・データ取得はエコシステムに委ねる。慣性が最も大きい
- **Vue**：「HTML のスーパーセットとしてのテンプレート」と「段階的採用」を軸に、公式ライブラリ（Pinia・Vue Router）で選択を一意にする。VDOM を Vapor Mode で段階的に廃止方向
- **SolidJS**：「リアクティビティを言語プリミティブにする」という設計純粋主義。JSX を使いながら VDOM を排除し、Signal というランタイムのプリミティブで細粒度更新を実現
- **Svelte**：「コンパイラがフレームワークである」という立場。テンプレート SFC を使いながら VDOM を持たず、リアクティビティをコンパイル時に解決する

Svelte は「SolidJS の目標（VDOM なし・細粒度リアクティビティ）を、Vue に近い構文（テンプレート SFC）で実現する」と整理できる。SolidJS がランタイムで実現し、Vue が Vapor Mode で段階移行しようとしている部分を、Svelte は最初からコンパイラベースで設計している。

Vue の Vapor Mode が完成した後の世界では、「VDOM なしのリアクティブ UI」という Svelte / SolidJS のアドバンテージが Vue のエコシステムの厚さと組み合わさることになる——その時点での四者比較を改めて行う方が判断材料として有効。

---

## Part 3 — ロードマップ

### Svelte 5（2024年11月リリース済み）

Svelte 5 の最大の変更点は **Runes**。暗黙的なリアクティビティ（コンパイラが `let` を自動でリアクティブに変換）から、明示的なコンパイラマクロへの転換。

#### コア3 Rune

```svelte
<script lang="ts">
  // $state — リアクティブな変数（React: useState）
  let count = $state(0)
  let post  = $state<Post | null>(null)

  // $derived — 導出値（React: useMemo。依存配列不要）
  const doubled  = $derived(count * 2)
  const hasError = $derived.by(() => post?.title.trim().length === 0)

  // $effect — 副作用（React: useEffect。依存配列不要）
  $effect(() => {
    document.title = `Count: ${count}`
    return () => { document.title = 'App' }  // クリーンアップは return で
  })
</script>
```

`$effect` の依存配列が不要な点は `watchEffect`（Vue）・`createEffect`（SolidJS）と同じ設計。コンパイラがスコープ内で参照している `$state` / `$derived` を自動追跡する。その他のRune：`$props`（コンポーネント props）・`$bindable`（双方向バインド可能な prop）・`$effect.pre`（DOM 更新前の副作用）・`$inspect`（開発時デバッグ）も提供されている。

#### Svelte 4 との比較

| 書き方 | Svelte 4 | Svelte 5 |
|--------|----------|----------|
| リアクティブ変数 | `let count = 0`（暗黙） | `let count = $state(0)`（明示） |
| 導出値 | `$: doubled = count * 2` | `const doubled = $derived(count * 2)` |
| 副作用 | `$: { console.log(count) }` | `$effect(() => { console.log(count) })` |
| props 定義 | `export let title: string` | `let { title }: Props = $props()` |

Svelte 4 の「コンパイラが `let` を見て自動でリアクティブにする」設計は、コード量は少ないが IDE の補完・型推論・デバッグのしやすさに限界があった。Runes は明示的にすることで TypeScript との統合を改善し、コンポーネント外（`.svelte.ts`）でも使える設計にした。

---

### SvelteKit 2.x（現行）

- **ファイルベースルーティング** — `+page.svelte` / `+page.server.ts` / `+layout.svelte` / `+error.svelte` の命名規則
- **Form Actions** — `+page.server.ts` の `actions` で HTML `<form>` をサーバーサイドで処理。`use:enhance` ディレクティブで JavaScript ありの場合の体験を改善しつつ、JS なしでも動作する Progressive Enhancement を設計の一部に持つ
- **型安全なルーティング** — `./$types` から自動生成された `PageData` / `PageServerLoad` 型が使える。`<a href="...">` はまだ型なしだが、`$lib` エイリアスは型解決される

```ts
// SvelteKit — form action の例（JavaScript なしでも動作）
// +page.server.ts
export const actions = {
  create: async ({ request, locals }) => {
    const data = await request.formData()
    const title = data.get('title') as string
    await postApi.create({ title, body: data.get('body') as string })
    throw redirect(303, '/')
  }
}
```

```svelte
<!-- +page.svelte — use:enhance で JS ありの体験を改善 -->
<form method="POST" action="?/create" use:enhance>
  <input name="title" />
  <textarea name="body"></textarea>
  <button>作成</button>
</form>
```

---

## 判断

このプロジェクトの規模（5〜10 ルート、シンプル CRUD）で Svelte を試すことは技術的に筋が通っている。特に SvelteKit の `+page.server.ts` + `load` 関数の構成は、現行の Declarative Router + SWR が持つ「描画前データ取得ができない」「認証チェックのフラッシュ」という2つの問題をアーキテクチャレベルで解消する——これは現行構成の課題への**直接的な回答**として体験する価値がある。

一方で「React の代替として採用する」ための動機はまだない：

- Svelte 4 → 5 移行期（2026年時点）でエコシステムのリソースが混在している
- TypeScript とテンプレートの統合は React（JSX）・SolidJS（JSX）より精度が落ちる場面がある
- SvelteKit の SSR 前提の設計が強く、純粋な SPA としての運用は現行構成より概念的に複雑

**SolidJS 考察との比較**：「学習目的なら価値がある」という結論は同じだが理由が違う。SolidJS はエコシステムが小さすぎることが障壁で、Svelte は Runes 移行期の学習リソース混在と JSX 不在による型安全性の制約が障壁。SvelteKit のメタフレームワークとしての成熟度は SolidStart より高い。

**Vue 考察との比較**：Vue は「テンプレート・二重パラダイム・`.value`」という学習コスト、Svelte は「`$` シジルのルール・コンパイラへの依存・SvelteKit 特有の命名規則」という別種の学習コスト。どちらが楽かはバックグラウンドによる。国内の実務案件への接続という点では Vue に軍配が上がる。

**現時点の結論：** 学習目的で別ブランチに実装して比較するなら価値がある。SvelteKit の load 関数・form actions を体験するのは現行構成の課題への直接的な対案として参考になる。本番スタックの変更を検討するなら、Runes エコシステムの安定と TypeScript 統合の改善を確認してから ADR に昇格させる。
