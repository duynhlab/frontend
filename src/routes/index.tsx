import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Catalog,
})

function Catalog() {
  return <h1 className="p-6 text-2xl font-semibold tracking-tight">Store</h1>
}
