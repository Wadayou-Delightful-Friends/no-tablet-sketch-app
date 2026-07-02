import { Link } from 'react-router-dom'

export function SelectPage() {
  return (
    <main>
      <h1>Select</h1>
      <nav>
        <Link to="/display">Display</Link> | <Link to="/controller">Controller</Link>
      </nav>
    </main>
  )
}
