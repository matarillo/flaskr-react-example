import { Link } from "react-router";
import { useAuth } from "../contexts/auth";
import PostList from "./PostList";

function Home() {
  const { user } = useAuth();

  return (
    <>
      <title>Posts - Flaskr</title>
      <header>
        <h1>Posts</h1>
        {user && <Link className="action" to="/create">New</Link>}
      </header>
      <PostList />
    </>
  );
}

export default Home;
