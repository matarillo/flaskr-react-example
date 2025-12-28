function Create() {
  return (
    <>
      <title>New Post - Flaskr</title>
      <header>
        <h1>New Post</h1>
      </header>
      <form method="post">
        <label htmlFor="title">Title</label>
        <input name="title" id="title" required />
        <label htmlFor="body">Body</label>
        <textarea name="body" id="body"></textarea>
        <input type="submit" value="Save" />
      </form>
    </>
  )
}

export default Create;
