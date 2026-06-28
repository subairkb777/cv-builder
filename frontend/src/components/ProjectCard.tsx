import { Link } from 'react-router-dom'
import type { Project } from '../api/client'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const dateRange = [
    project.start_date,
    project.end_date && project.end_date !== project.start_date ? project.end_date : null,
  ]
    .filter(Boolean)
    .join(' — ')

  return (
    <Link
      to={`/projects/${project.slug}`}
      className="project-card group block rounded-xl border border-gray-800/80 bg-gray-900/60 p-6 backdrop-blur-sm transition-all hover:border-blue-500/40 hover:bg-gray-800/60 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
          {project.title}
        </h3>
        <svg
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600 transition-colors group-hover:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>

      {dateRange && (
        <p className="mb-3 text-xs text-gray-500">{dateRange}</p>
      )}

      <p className="mb-4 text-sm text-gray-400 line-clamp-3">{project.summary}</p>

      {project.tech_stack && project.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.tech_stack.slice(0, 5).map((tech) => (
            <span
              key={tech}
              className="tech-badge inline-block rounded-md border border-blue-900/40 bg-blue-950/40 px-2 py-0.5 text-xs font-medium text-blue-300"
            >
              {tech}
            </span>
          ))}
          {project.tech_stack.length > 5 && (
            <span className="inline-block rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
              +{project.tech_stack.length - 5}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
