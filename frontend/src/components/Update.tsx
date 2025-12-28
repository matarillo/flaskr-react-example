function Update() {
  return (
    <>
      <title>Edit - Flaskr</title>
      <header>
        <h1>Edit</h1>
      </header>
      <form method="post">
        <label htmlFor="title">Title</label>
        <input name="title" id="title" required />
        <label htmlFor="body">Body</label>
        <textarea name="body" id="body"></textarea>
        <input type="submit" value="Save" />
      </form>
      <hr />
      <form method="post">{ /* action="url_for('blog.delete', id=post['id'])" */ }
        <input className="danger" type="submit" value="Delete" />{ /* onClick="return confirm('Are you sure?');"" */ }
      </form>
    </>
  )
}

export default Update;
