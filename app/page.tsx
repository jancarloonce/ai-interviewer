import dynamic from "next/dynamic"

const AIInterviewer = dynamic(() => import("./components/AIInterviewer"), { ssr: false })

export default function Home() {
  return (
    <main className="h-screen">
      <AIInterviewer />
    </main>
  )
}

