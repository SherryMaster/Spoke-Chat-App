const features = [
  { title: 'BYO key', body: 'Your OpenCode API key is encrypted at rest with AES-256-GCM. You stay in control.' },
  { title: 'Every model', body: 'OpenCode Go subscription models, Zen paid models, and free models — all in one picker.' },
  { title: 'Cross-device', body: 'Sign in anywhere. Your conversations follow you, encrypted in transit and at rest.' },
]

export function FeatureBlocks() {
  return (
    <section className="grid gap-6 px-6 py-16 md:grid-cols-3">
      {features.map((f) => (
        <div key={f.title} className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">{f.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
        </div>
      ))}
    </section>
  )
}
