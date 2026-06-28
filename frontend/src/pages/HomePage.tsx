import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { PortfolioData } from '../api/client'
import { ProjectCard } from '../components/ProjectCard'
import { ExportButton } from '../components/ExportButton'

const SKILLS_VISIBLE = 16

export function HomePage() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [skillsExpanded, setSkillsExpanded] = useState(false)

  useEffect(() => {
    api.getPortfolio()
      .then(setData)
      .catch(() => setError('Failed to load portfolio data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-800 border-t-blue-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">{error || 'No data available'}</p>
      </div>
    )
  }

  const skills = data.skills ?? []
  const visibleSkills = skillsExpanded ? skills : skills.slice(0, SKILLS_VISIBLE)
  const hiddenCount = skills.length - SKILLS_VISIBLE

  return (
    <div className="relative">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/8 blur-[100px]" />
        <div className="absolute left-1/3 top-20 h-[200px] w-[400px] rounded-full bg-purple-600/6 blur-[80px]" />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="mb-24">
          <div className="flex flex-col items-center gap-10 text-center lg:flex-row lg:text-left lg:items-start">

            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="avatar-ring glow-blue inline-block">
                {data.photo_url ? (
                  <img
                    src={data.photo_url}
                    alt={data.name}
                    className="h-36 w-36 rounded-full object-cover ring-4 ring-gray-950"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-purple-900 ring-4 ring-gray-950 text-5xl font-bold text-white">
                    {data.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Availability badge */}
              <div className="mb-4 flex justify-center lg:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-700/40 bg-green-900/20 px-3 py-1 text-xs font-medium text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  Available · UAE & India Work Permit
                </span>
              </div>

              <h1 className="mb-2 text-5xl font-bold tracking-tight text-gradient lg:text-6xl">
                {data.name}
              </h1>

              <p className="mb-5 text-lg font-medium text-blue-400 lg:text-xl">
                {data.title}
              </p>

              {/* Stats row */}
              <div className="mb-6 flex flex-wrap justify-center gap-4 lg:justify-start">
                {[
                  { label: 'Years Exp.', value: '12+' },
                  { label: 'Companies', value: '6' },
                  { label: 'Projects', value: '7+' },
                  { label: 'Skills', value: `${skills.length}+` },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center lg:items-start">
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                    <span className="text-xs text-gray-500">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              {data.summary && (
                <p className="mb-6 max-w-2xl text-sm leading-7 text-gray-400 lg:text-base">
                  {data.summary}
                </p>
              )}

              {/* Contact info */}
              <div className="mb-5 flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start">
                {data.email && (
                  <a href={`mailto:${data.email}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-blue-400">
                    <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {data.email}
                  </a>
                )}
                {data.phone && (
                  <a href={`tel:${data.phone}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-blue-400">
                    <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {data.phone}
                  </a>
                )}
                {data.location && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                    <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {data.location}
                  </span>
                )}
              </div>

              {/* Links */}
              {data.links && data.links.length > 0 && (
                <div className="mb-6 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {data.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700/60 bg-gray-800/40 px-3.5 py-1.5 text-sm text-gray-300 transition-all hover:border-blue-500/50 hover:bg-gray-800 hover:text-blue-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {link.label}
                    </a>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link
                  to="/resume"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-105"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Full Resume
                </Link>
                <ExportButton />
              </div>
            </div>
          </div>
        </section>

        {/* ── Skills ────────────────────────────────────────────────────── */}
        {data.skills && data.skills.length > 0 && (
          <section className="mb-20">
            <SectionHeading label="Core Skills" />
            <div className="flex flex-wrap gap-2">
              {visibleSkills.map((skill) => (
                <span
                  key={skill}
                  className="skill-badge rounded-lg border border-blue-900/30 bg-gradient-to-br from-blue-950/60 to-blue-900/20 px-3 py-1.5 text-sm font-medium text-blue-300 transition-colors hover:border-blue-500/50 hover:text-blue-200"
                >
                  {skill}
                </span>
              ))}
            </div>
            {data.skills.length > SKILLS_VISIBLE && (
              <button
                onClick={() => setSkillsExpanded((v) => !v)}
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-blue-400"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${skillsExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {skillsExpanded ? 'Show less' : `Show ${hiddenCount} more skills`}
              </button>
            )}
          </section>
        )}

        {/* ── Experience ────────────────────────────────────────────────── */}
        {data.experience && data.experience.length > 0 && (
          <section className="mb-20">
            <div className="mb-8 flex items-center justify-between">
              <SectionHeading label="Experience" />
              <Link to="/resume" className="text-xs text-gray-600 transition-colors hover:text-blue-400">
                Full details →
              </Link>
            </div>
            <div className="relative space-y-3 pl-8">
              {/* vertical line */}
              <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-blue-500/60 via-purple-500/30 to-transparent" />
              {data.experience.map((exp, i) => {
                const highlight = exp.description
                  ? exp.description.split('. ')[0].replace(/\.$/, '') + '.'
                  : ''
                return (
                  <div key={i} className="relative">
                    {/* dot */}
                    <div className="absolute -left-8 top-4 flex h-6 w-6 items-center justify-center">
                      <div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-blue-400 shadow-md shadow-blue-400/50' : 'bg-gray-700 ring-1 ring-gray-600'}`} />
                    </div>
                    <div className="glow-card rounded-xl border border-gray-800/80 bg-gray-900/60 p-5 backdrop-blur-sm transition-all hover:border-gray-700">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-white">{exp.role}</span>
                          <span className="mx-2 text-gray-700">·</span>
                          <span className="text-sm text-blue-400">{exp.company}</span>
                        </div>
                        <span className="rounded-full border border-gray-800 bg-gray-800/60 px-2.5 py-0.5 text-xs text-gray-500">
                          {exp.start_date} — {exp.end_date}
                        </span>
                      </div>
                      {highlight && (
                        <p className="mt-2 text-sm leading-relaxed text-gray-400">{highlight}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Projects ──────────────────────────────────────────────────── */}
        {data.projects && data.projects.length > 0 && (
          <section className="mb-20">
            <div className="mb-8 flex items-center justify-between">
              <SectionHeading label="Featured Projects" />
              {data.projects.length > 4 && (
                <Link to="/resume" className="text-xs text-gray-600 transition-colors hover:text-blue-400">
                  +{data.projects.length - 4} more →
                </Link>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.projects.slice(0, 4).map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          </section>
        )}

        {/* ── Awards & Recognition ──────────────────────────────────────── */}
        {data.awards && data.awards.length > 0 && (
          <section className="mb-8">
            <SectionHeading label="Awards & Recognition" />
            <div className="grid gap-4 sm:grid-cols-2">
              {data.awards.map((award, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-xl border border-yellow-800/30 bg-gradient-to-br from-yellow-950/30 to-amber-950/10 p-5 transition-all hover:border-yellow-700/50"
                >
                  {/* subtle corner glow */}
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-yellow-500/10 blur-2xl" />
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-yellow-700/30 bg-yellow-900/30">
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-yellow-200">{award.title}</p>
                      {award.issuer && <p className="text-sm text-gray-400">{award.issuer}</p>}
                      {award.date && <p className="mb-2 text-xs text-gray-600">{award.date}</p>}
                      {award.description && (
                        <p className="text-sm leading-relaxed text-gray-400">{award.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <h2 className="section-header text-xl font-bold text-white">{label}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent" />
    </div>
  )
}
