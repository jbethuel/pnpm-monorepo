import { greet } from "@monorepo/core"
import { Button } from "@monorepo/ui"
import { useCallback, useMemo, useState } from "react"

export function App() {
  const [count, setCount] = useState(0)

  const increment = useCallback(() => {
    setCount((prev) => prev + 1)
  }, [])

  const renderGreeting = useMemo(() => {
    return greet("Vite")
  }, [])

  return (
    <div>
      <header>
        <div>{renderGreeting}</div>
        <div>
          <Button type="button" onClick={increment}>
            count is: {count}
          </Button>
        </div>
      </header>
    </div>
  )
}
