import { greet, type User } from "@monorepo/core"
import { serve } from "@hono/node-server"
import { Hono } from "hono"

const app = new Hono()

app.get("/", (c) => {
  return c.text(greet("Hono"))
})

app.get("/user", (c) => {
  const user: User = {
    id: "1",
    name: "Monorepo User",
  }
  return c.json(user)
})

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  },
)
