import { client } from "@/lib/opencode"

export default async function HomePage() {
  let health: { healthy: boolean; version: string } | null = null
  let error: string | null = null

  try {
    const res = await client.global.health()
    health = res.data as { healthy: boolean; version: string }
  } catch (e) {
    error = String(e)
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">PM Workstation</h1>
      {health ? (
        <p className="text-green-400">
          OpenCode: {health.healthy ? "connected" : "disconnected"} · v{health.version}
        </p>
      ) : (
        <p className="text-red-400">OpenCode: disconnected — {error}</p>
      )}
    </main>
  )
}
