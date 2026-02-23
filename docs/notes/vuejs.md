# Vue.js 考察メモ

> 現在のスタック（React 19）を Vue に置き換えた場合どうなるか、という個人的な考察。決定ではない。

作成：2026-02-22
更新：2026-02-23

---

## きっかけ

SolidJS 考察と同じ問いを Vue に向けた整理。Vue と SolidJS はどちらも「React の代替」として語られることがあるが、設計思想のレベルでは全く異なる判断をしている。両方の考察を対比させることで、三者の選択理由をより明確にしたい。

---

## Part 1 — 移行した場合の技術マッピング

### 現行スタックとの対応

| 現行（React） | Vue での対応 | 変化の大きさ |
|--------------|------------|------------|
| `useState` | `ref()` / `reactive()` | 小（概念は近い） |
| `rootLoader` + `useRouteLoaderData` | Pinia store | 中（ルーターとの結合がなくなる） |
| React Router `loader` | TanStack Query for Vue / VueUse `useFetch` | 中 |
| Zustand / Jotai | Pinia（公式）| 大（外部ライブラリが公式に統合されている）|
| React Router v7 Data | Vue Router | 小（構造は近い） |
| Vitest + MSW | そのまま使える | なし |
| Vite | そのまま使える | なし |
| JSX / `.tsx` | SFC（`.vue` ファイル） | **大（テンプレート構文に変わる）** |

SolidJS への移行と比べた最大の差は最後の行。React → SolidJS は JSX という構文を維持したまま別のリアクティビティモデルを学ぶ変化だが、React → Vue は JSX を捨ててテンプレート構文を習得する変化が加わり、ツールチェーンも大きく変わる。

---

### 設計プリミティブの変化

#### 認証状態管理 — Pinia store でルーターとの結合が不要になる

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
// Vue + Pinia — store 1 つで済む（Provider 不要）
// stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const user      = ref<User | null>(null)
  const isLoading = ref(false)

  async function fetchCurrentUser() {
    isLoading.value = true
    try {
      const res = await authApi.getCurrentUser()
      user.value = res.success
        ? { userId: res.userId, username: res.username }
        : null
    } catch { user.value = null }
    finally { isLoading.value = false }
  }

  async function login(credentials: LoginRequest) {
    const res = await authApi.login(credentials)
    user.value = { userId: res.userId, username: res.username }
    return user.value
  }

  async function logout() {
    await authApi.logout()
    user.value = null
  }

  return { user, isLoading, fetchCurrentUser, login, logout }
})
```

React Router Data モードでは Provider/Context こそ不要になったが、認証状態はルーターの `loader` に組み込まれている——ナビゲーション時に再実行され、ルーティングと状態管理が結合する設計。Pinia store はルーターやコンポーネントツリーとは独立して状態を管理できるため、**「状態をどのレイヤーにも結合させない設計自由度」**がある。

ただし SolidJS と異なり、Pinia はアプリのインスタンスに紐づくため、モジュールレベルに状態を直接置ける SolidJS の Signal より若干制約がある。

#### URL パラメータとデータ取得の連動 — Vue Router のリアクティブ route

```tsx
// 現行 React — loader が request.url から直接 searchParams を取得
export async function postsLoader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '0', 10)
  const size = parseInt(url.searchParams.get('size') || '10', 10)
  return postApi.list({ page, size })
}
```

```vue
<!-- Vue + TanStack Query for Vue -->
<script setup lang="ts">
const route = useRoute()
const page  = computed(() => Number(route.query.page  ?? 0))
const size  = computed(() => Number(route.query.size ?? 10))

const { data, isLoading } = useQuery({
  queryKey: computed(() => ['posts', page.value, size.value]),
  queryFn:  () => postApi.list({ page: page.value, size: size.value }),
})
</script>
```

Vue Router が返す `route` はリアクティブオブジェクトであり、URL が変わると `route.query.page` が自動更新される。TanStack Query for Vue の `queryKey` が `computed` を受け取ることで、key 変化時に自動再フェッチが走る。React Router の loader はナビゲーション時に再実行されるため URL パラメータの取得は直接的だが、「URL は変えずにデータだけ再取得する」操作には向かない。Vue の `computed` + TanStack Query は依存関係がより宣言的。

#### 複数 Mutation の状態管理

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

```vue
<script setup lang="ts">
const updateMutation = useMutation({ mutationFn: updatePost })
const deleteMutation = useMutation({ mutationFn: deletePost })

const isMutating = computed(
  () => updateMutation.isPending.value || deleteMutation.isPending.value
)
</script>

<template>
  <button :disabled="isMutating">Save</button>
  <button :disabled="isMutating" class="danger">Delete</button>
</template>
```

React Router の intent パターンでは `navigation.state` がフォーム全体に対する状態であり、「更新中か削除中か」の区別がつかない。Vue で個別の Mutation を管理すれば、操作ごとの loading / error 状態が分離する。`computed` が依存関係を自動追跡するため、依存配列の書き忘れという問題も発生しない。テンプレート内では `.value` が自動アンラップされる。

### React Hooks と Vue Composition API の比較

Vue の Composition API は React Hooks にインスパイアされたが、重要な差異がある：

| | React Hooks | Vue Composition API |
|--|------------|---------------------|
| 呼び出し位置の制限 | コンポーネント関数のトップレベルのみ | `<script setup>` 内なら自由 |
| セットアップ関数の再実行 | レンダリング毎に全部実行 | 初回の1回のみ |
| 依存関係追跡 | `useEffect` の依存配列を手動管理 | `computed` / `watchEffect` が自動追跡 |
| カスタムロジックの切り出し | コンポーネント外に切り出し可能 | コンポーネント外に切り出し可能 |

「`useEffect` の依存配列を手動管理する」問題は React の設計上の負債であり、`watchEffect` / `computed` による自動追跡は実用上の明確な改善。一方、セットアップ関数が1回しか実行されないことは、SolidJS と同様の設計——ただし SolidJS が細粒度リアクティビティでコンポーネント再実行自体をなくしているのに対し、Vue は VDOM レベルでの再レンダリングを残している。

---

### 状態管理の4層モデル（Vue 版）

README の4層分類（URL State / Server State / Global State / Local State）を Vue で実装する場合：

| 層 | スコープ | Vue での実装 |
|----|---------|------------|
| **URL State** | URL パス・クエリパラメータ | Vue Router の `useRoute()`（リアクティブオブジェクト） |
| **Server State** | サーバー由来のデータ | TanStack Query for Vue / VueUse `useFetch` |
| **Global State** | コンポーネントツリー横断の共有状態 | Pinia store |
| **Local State** | 単一コンポーネント内の UI 状態 | `ref()` / `v-model` |

Pinia が公式に統合されているため、「どのグローバル状態管理を使うか」の選択コストが React より小さい。SolidJS では Signal だけで全層をカバーできる（Zustand / Jotai 不要）のと比べると、Vue は「公式ライブラリが整理されている」という違いがある——不要にはなっていないが、選択は一意。ネストしたオブジェクト状態には `reactive()` が使える。

---

## Part 2 — 採用動機の批判的分析

### 誇張されがちな改善

「React より書きやすい」「学習コストが低い」という声は実態を半分しか伝えていない。

Vue 固有の難しさが別に存在する：

- `ref` の `.value` は記述が冗長なだけでなく、`<template>` では自動アンラップされるが `<script setup>` 内では `.value` が必要という「文脈依存のルール」が初学者を混乱させる
- Options API か Composition API かの選択が常についてまわる。公式ドキュメントは両方を併記しており、チーム内で混在が起きやすい
- SFC の `.vue` ファイルはテンプレート・スクリプト・スタイルが混在する。TypeScript の型推論はテンプレート内で JSX より精度が落ちる場面がある

「Vue は簡単だった」という評価の一部は、小規模アプリで Vue の難しい部分（大規模コンポーネント設計・型安全なテンプレート・Options/Composition の統一）に達する前の評価である可能性がある。

### エコシステムと国内の文脈

| 観点 | React | Vue |
|------|-------|-----|
| npm 週間 DL | 約 2,500 万 | 約 500〜600 万 |
| UI コンポーネントライブラリ | MUI・shadcn/ui 等が豊富 | Vuetify・PrimeVue・shadcn-vue 等 |
| メタフレームワーク | Next.js（成熟） | Nuxt（成熟） |
| TanStack 対応 | フル対応 | Query / Table / Form は Vue 版あり。Router は 2025年末に Vue アダプタが追加されたが初期段階 |
| 日本国内での採用 | 増加傾向 | **特に多い（Vue 2 資産を持つ企業が多数）** |

グローバルでは React が優勢だが、国内では Vue 2 資産を持つ中規模企業がまだ多く、Vue 2 → Vue 3 移行案件が実在する。このプロジェクトを Vue で実装する実質的な動機があるとすれば「国内実務案件への接続」が最も筋が通っている——「React の代替探し」としての動機は薄い。

### 三者の設計的位置づけ

SolidJS 考察と合わせて三者を整理すると、設計上の判断軸が見えてくる：

- **React**：「JavaScript の中で UI を記述する」という JSX モデルを徹底。フレームワーク機能を最小限にし、状態管理・ルーティング・データ取得はすべてエコシステムに委ねる。慣性が最も大きい
- **Vue**：「HTML のスーパーセットとしてのテンプレート」と「段階的採用」を軸に、公式ライブラリ（Pinia・Vue Router）で選択を一意にする。エコシステムを内側に取り込む方向
- **SolidJS**：「リアクティビティを言語プリミティブにする」という設計純粋主義。JSX を使いながら VDOM を排除した

Vapor Mode が完成した後の Vue は「テンプレートを直接 DOM 操作にコンパイルする」という実行モデルで SolidJS に近づく。しかし設計思想は依然として異なる——SolidJS が最初から VDOM を持たない設計であるのに対し、Vue は段階的オプトインで既存資産と共存させながら同じ結果を目指している。これは「技術的優位」の問題ではなく「既存エコシステムとの互換性をどこまで優先するか」という設計判断の違い。

---

## Part 3 — ロードマップ

### Vue 3.5（2024年9月リリース済み）

**Reactive Props Destructuring** — `<script setup>` 内での `defineProps` の分割代入がリアクティビティを保つようになった。`.value` を減らす方向の一手だが、根本的な解決ではない：

```ts
// Vue 3.4 まで — 分割代入するとリアクティビティが失われる
const props = defineProps<{ count: number }>()
watchEffect(() => console.log(props.count))

// Vue 3.5 から — 分割代入してもリアクティブ（コンパイラが変換）
const { count } = defineProps<{ count: number }>()
watchEffect(() => console.log(count))
```

**`useTemplateRef()`** — テンプレート ref を文字列ではなく型付きの ref で扱えるようになった。

---

### Vapor Mode（Vue 3.6 beta、2025年12月にベータリリース）

Vue チームが最も注力している次世代の最適化。**VDOM を廃止し、テンプレートを直接 DOM 操作にコンパイルする**。Part 2 で整理した「VDOM オーバーヘッドへの問題意識」への直接的な回答。

#### 仕組み

現在の Vue コンパイラはテンプレートを「仮想 DOM ノードを返す関数」にコンパイルし、ランタイムが差分比較して実 DOM を更新する。Vapor Mode ではこの差分比較ステップがなくなる：

```js
// 現在 — VDOM ノードを生成してランタイムが diff
function render() {
  return h('div', { class: 'post' }, [h('h1', post.title), h('p', post.body)])
}

// Vapor Mode — テンプレートが直接 DOM 操作にコンパイルされる
const h1 = createElement('h1')
effect(() => { h1.textContent = post.title }) // 変化した部分だけ更新
```

SolidJS と同じアプローチを、Vue のテンプレート構文を維持しながら実現する。

#### 段階的採用（Progressive Vapor）

コンポーネント単位でオプトインできる設計になっており、パフォーマンスクリティカルな部分だけ Vapor にするという段階的移行が可能：

```vue
<!-- 通常の Vue コンポーネント（VDOM） -->
<script setup>...</script>

<!-- Vapor コンポーネント（VDOM なし） -->
<script setup vapor>...</script>
```

js-framework-benchmark では Vapor Mode のプロトタイプが SolidJS に近いスコアを記録している（VDOM 版の Vue より大幅に高速）。ただし「一般的な CRUD アプリのボトルネックは DOM 操作速度ではない」という前提は変わらない。`@vue/vapor` パッケージとして実験的に利用可能だが本番利用は推奨されない段階。

---

## 判断

このプロジェクトの規模（5〜10 ルート、シンプル CRUD）で Vue を試すこと自体は技術的に筋が通っている。Pinia + TanStack Query for Vue + Vue Router の組み合わせで実装量は現行 React と大きく変わらない。Provider の排除と Composition API の自動依存追跡は実用上の改善として体験できる。

一方で「React の代替として採用する」ための動機はまだない。SolidJS 考察と同じ結論だが理由が異なる——SolidJS はエコシステムの薄さが障壁だが、Vue は「学習コストの種類が増える（テンプレート構文・二重パラダイム・`.value`）」という別の障壁がある。

**Vapor Mode の動向は追い続ける価値がある。** SolidJS が証明した「VDOM なしのリアクティブ UI」という方向性を、Vue がテンプレート構文を維持しながら段階的に実現しようとしている。成功すれば「SolidJS の性能的利点 × Vue のエコシステムの厚さ」という組み合わせになる——それが実現したタイミングで、SolidJS 考察と合わせて三者比較を改めて行う方が判断材料として有効。

**現時点の結論：** 学習目的で別ブランチに実装して比較するなら価値がある。本番スタックの変更を検討するなら、Vapor Mode の安定を待ってから ADR に昇格させる。
