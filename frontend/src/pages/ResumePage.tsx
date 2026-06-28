import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { PortfolioData } from '../api/client'
import { ExportButton } from '../components/ExportButton'
import { ProjectCard } from '../components/ProjectCard'


export function ResumePage() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getPortfolio()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
      </div>
    )
  }

  if (!data) return null

  return (
    <main className="resume-container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header row */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Resume</h1>
        <ExportButton />
      </div>

      <div className="gap-8 lg:grid lg:grid-cols-3">
        {/* ── Left column ─────────────────────────────── */}
        <aside className="mb-8 space-y-8 lg:mb-0 lg:col-span-1">
          {/* Contact */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              {data.photo_url ? (
                <img
                  src={data.photo_url}
                  alt={data.name}
                  className="h-16 w-16 rounded-full border-2 border-gray-700 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gray-700 bg-gradient-to-br from-blue-900 to-blue-700 text-2xl font-bold text-white">
                  {data.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="font-bold text-white">{data.name}</h2>
                <p className="text-sm text-blue-400">{data.title}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-400">
              {data.email && (
                <p className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {data.email}
                </p>
              )}
              {data.phone && (
                <p className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {data.phone}
                </p>
              )}
              {data.location && (
                <p className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {data.location}
                </p>
              )}
            </div>
          </section>

          {/* Links */}
          {data.links && data.links.length > 0 && (
            <section>
              <h3 className="section-header mb-3 border-b border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Links
              </h3>
              <ul className="space-y-1.5">
                {data.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 underline-offset-2 hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Skills */}
          {data.skills && data.skills.length > 0 && (
            <section>
              <h3 className="section-header mb-3 border-b border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {data.skills.map((skill) => (
                  <span
                    key={skill}
                    className="skill-badge rounded-md border border-blue-900/40 bg-blue-950/30 px-2 py-0.5 text-xs font-medium text-blue-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {data.education && data.education.length > 0 && (
            <section>
              <h3 className="section-header mb-3 border-b border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Education
              </h3>
              <ul className="space-y-3">
                {data.education.map((edu, i) => (
                  <li key={i} className="education-entry text-sm">
                    <p className="font-medium text-gray-200">{edu.institution}</p>
                    <p className="text-gray-400">{edu.degree}</p>
                    {edu.year && <p className="text-xs text-gray-500">{edu.year}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        {/* ── Right column ────────────────────────────── */}
        <div className="space-y-8 lg:col-span-2">
          {/* Summary */}
          {data.summary && (
            <section>
              <h3 className="section-header mb-3 border-b border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                About
              </h3>
              <p className="text-sm leading-relaxed text-gray-300">{data.summary}</p>
            </section>
          )}

          {/* Experience */}
          {data.experience && data.experience.length > 0 && (
            <section>
              <h3 className="section-header mb-4 border-b border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Experience
              </h3>
              <ul className="space-y-6">
                {data.experience.map((exp, i) => (
                  <li key={i} className="experience-entry relative pl-4">
                    <div className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
                    <div className="mb-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div>
                        <span className="font-semibold text-white">{exp.role}</span>
                        <span className="mx-2 text-gray-600">·</span>
                        <span className="text-gray-400">{exp.company}</span>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {exp.start_date} — {exp.end_date}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-400">{exp.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Projects */}
          {data.projects && data.projects.length > 0 && (
            <section>
              <h3 className="section-header mb-4 border-b border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Projects
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.projects.map((project) => (
                  <ProjectCard key={project.slug} project={project} />
                ))}
              </div>
            </section>
          )}

          {/* Awards */}
          {data.awards && data.awards.length > 0 && (
            <section>
              <h3 className="section-header mb-4 border-b border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Awards
              </h3>
              <ul className="space-y-4">
                {data.awards.map((award, i) => (
                  <li key={i} className="relative pl-4">
                    <div className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-yellow-500" />
                    <div className="mb-0.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <span className="font-semibold text-white">{award.title}</span>
                      {award.date && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">{award.date}</span>
                      )}
                    </div>
                    {award.issuer && (
                      <p className="text-sm text-blue-400">{award.issuer}</p>
                    )}
                    {award.description && (
                      <p className="mt-1 text-sm leading-relaxed text-gray-400">{award.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Back home */}
      <div className="mt-12 flex justify-center">
        <Link
          to="/"
          className="text-sm text-gray-500 transition-colors hover:text-gray-300"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  )
}
