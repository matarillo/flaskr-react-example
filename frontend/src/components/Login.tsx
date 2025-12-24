import './Login.css'

function Login() {
  return (
    <>
      <title>Log in - Flaskr</title>
      <header>
        <h1>Log In</h1>
      </header>

      <form method="post">
        <label htmlFor="username">Username</label>
        <input name="username" id="username" required />
        <label htmlFor="password">Password</label>
        <input type="password" name="password" id="password" required />
        <input type="submit" value="Log In" />
      </form>
    </>
  )
}

export default Login
