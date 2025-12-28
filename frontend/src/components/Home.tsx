import { useAuth } from "../contexts/auth";
import PostList from "./PostList";

function Home() {
  const { user } = useAuth();

  return (
    <>
      <title>Posts - Flaskr</title>
      <header>
        <h1>Posts</h1>
        {user && <a className="action" href="/create">New</a>}
      </header>
      <PostList />
    </>
  );
}

export default Home;
