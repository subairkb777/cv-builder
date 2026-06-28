import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Project } from '../api/client'
import { ExportButton } from '../components/ExportButton'

export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api
      .getPortfolio()
      .then((data) => {
        const found = data.projects.find((p) => p.slug === slug)
        if (found) {
          setProject(found)
        } else {
          setNotFound(true)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Project not found.</p>
        <Link to="/" className="text-sm text-blue-400 hover:underline">
          Back to Home
        </Link>
      </div>
    )
  }

  const dateRange = [project.start_date, project.end_date].filter(Boolean).join(' — ')

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 animate-fade-in">
      {/* Top bar */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
        <ExportButton label="Export" />
      </div>

      {/* Title + dates */}
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">{project.title}</h1>
        {dateRange && (
          <p className="text-sm font-medium text-gray-500">{dateRange}</p>
        )}
      </header>

      {/* Summary */}
      <section className="mb-8">
        <p className="text-lg leading-relaxed text-gray-300">{project.summary}</p>
      </section>

      {/* My Contribution — highlighted */}
      <section className="mb-8 rounded-xl border border-blue-900/40 bg-blue-950/20 p-6">
        <h2 className="section-header mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Contribution
        </h2>
        <p className="leading-relaxed text-gray-200">{project.my_contribution}</p>
      </section>

      {/* Tech Stack */}
      {project.tech_stack && project.tech_stack.length > 0 && (
        <section className="mb-8">
          <h2 className="section-header mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Tech Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.tech_stack.map((tech) => (
              <span
                key={tech}
                className="tech-badge rounded-lg border border-blue-900/40 bg-blue-950/30 px-3 py-1.5 text-sm font-medium text-blue-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Outcomes */}
      {project.outcomes && (
        <section className="mb-8 rounded-xl border border-green-900/30 bg-green-950/10 p-6">
          <h2 className="section-header mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-green-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Outcomes &amp; Results
          </h2>
          <p className="leading-relaxed text-gray-300">{project.outcomes}</p>
        </section>
      )}

      {/* Back link */}
      <div className="mt-12 border-t border-gray-800 pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Portfolio
        </Link>
      </div>
    </main>
  )
}
