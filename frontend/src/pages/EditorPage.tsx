import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, APIError } from '../api/client'
import type { PortfolioData, Experience, Education, Project, Award, Link as PortfolioLink, LlmStatus } from '../api/client'
import { useAuthStore } from '../store/authStore'

type Tab = 'basic' | 'links' | 'skills' | 'experience' | 'education' | 'projects' | 'awards'

const TABS: { key: Tab; label: string }[] = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'links', label: 'Links' },
  { key: 'skills', label: 'Skills' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'projects', label: 'Projects' },
  { key: 'awards', label: 'Awards' },
]

const emptyPortfolio: PortfolioData = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  photo_url: '',
  links: [],
  skills: [],
  experience: [],
  education: [],
  projects: [],
  awards: [],
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function EditorPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('basic')
  const [data, setData] = useState<PortfolioData>(emptyPortfolio)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null)

  // PDF import state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [rawTextModal, setRawTextModal] = useState('')
  const [reviewData, setReviewData] = useState<PortfolioData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Photo state
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Skill input state
  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
      return
    }
    Promise.all([api.getPortfolio(), api.llmStatus()])
      .then(([portfolio, status]) => {
        setData(portfolio)
        setLlmStatus(status)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isAuthenticated, navigate])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      const saved = await api.savePortfolio(data)
      setData(saved)
      setSaveMsg('Saved successfully!')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveMsg(err instanceof APIError ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleParsePDF = async () => {
    if (!pdfFile) return
    setPdfParsing(true)
    setPdfError('')
    try {
      const result = await api.parsePdf(pdfFile)
      if (!result.llm_enabled) {
        setRawTextModal(result.raw_text ?? '')
      } else if (result.data) {
        setReviewData(result.data)
      }
    } catch (err) {
      setPdfError(err instanceof APIError ? err.message : 'PDF parsing failed')
    } finally {
      setPdfParsing(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    try {
      const { url } = await api.uploadPhoto(file)
      setData((d) => ({ ...d, photo_url: url }))
    } catch (err) {
      console.error('Photo upload failed:', err)
    } finally {
      setPhotoUploading(false)
    }
  }

  const acceptReview = () => {
    if (reviewData) {
      setData(reviewData)
      setReviewData(null)
    }
  }

  // ── Experience helpers ──────────────────────────────────────────────
  const addExperience = () =>
    setData((d) => ({
      ...d,
      experience: [...d.experience, { company: '', role: '', start_date: '', end_date: '', description: '' }],
    }))

  const updateExperience = (i: number, field: keyof Experience, value: string) =>
    setData((d) => {
      const exp = [...d.experience]
      exp[i] = { ...exp[i], [field]: value }
      return { ...d, experience: exp }
    })

  const removeExperience = (i: number) =>
    setData((d) => ({ ...d, experience: d.experience.filter((_, idx) => idx !== i) }))

  // ── Education helpers ───────────────────────────────────────────────
  const addEducation = () =>
    setData((d) => ({
      ...d,
      education: [...d.education, { institution: '', degree: '', year: '' }],
    }))

  const updateEducation = (i: number, field: keyof Education, value: string) =>
    setData((d) => {
      const edu = [...d.education]
      edu[i] = { ...edu[i], [field]: value }
      return { ...d, education: edu }
    })

  const removeEducation = (i: number) =>
    setData((d) => ({ ...d, education: d.education.filter((_, idx) => idx !== i) }))

  // ── Project helpers ─────────────────────────────────────────────────
  const addProject = () =>
    setData((d) => ({
      ...d,
      projects: [
        ...d.projects,
        { title: '', slug: '', summary: '', my_contribution: '', tech_stack: [], outcomes: '', start_date: '', end_date: '' },
      ],
    }))

  const updateProject = <K extends keyof Project>(i: number, field: K, value: Project[K]) =>
    setData((d) => {
      const projects = [...d.projects]
      projects[i] = { ...projects[i], [field]: value }
      if (field === 'title' && typeof value === 'string' && !projects[i].slug) {
        projects[i].slug = slugify(value)
      }
      return { ...d, projects }
    })

  const removeProject = (i: number) =>
    setData((d) => ({ ...d, projects: d.projects.filter((_, idx) => idx !== i) }))

  const updateProjectTechStack = (i: number, raw: string) => {
    const stack = raw.split(',').map((s) => s.trim()).filter(Boolean)
    updateProject(i, 'tech_stack', stack)
  }

  // ── Link helpers ────────────────────────────────────────────────────
  const addLink = () =>
    setData((d) => ({ ...d, links: [...d.links, { label: '', url: '' }] }))

  const updateLink = (i: number, field: keyof PortfolioLink, value: string) =>
    setData((d) => {
      const links = [...d.links]
      links[i] = { ...links[i], [field]: value }
      return { ...d, links }
    })

  const removeLink = (i: number) =>
    setData((d) => ({ ...d, links: d.links.filter((_, idx) => idx !== i) }))

  // ── Award helpers ───────────────────────────────────────────────────
  const addAward = () =>
    setData((d) => ({
      ...d,
      awards: [...(d.awards ?? []), { title: '', date: '', issuer: '', description: '' }],
    }))

  const updateAward = (i: number, field: keyof Award, value: string) =>
    setData((d) => {
      const awards = [...(d.awards ?? [])]
      awards[i] = { ...awards[i], [field]: value }
      return { ...d, awards }
    })

  const removeAward = (i: number) =>
    setData((d) => ({ ...d, awards: (d.awards ?? []).filter((_, idx) => idx !== i) }))

  // ── Skill helpers ───────────────────────────────────────────────────
  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !data.skills.includes(trimmed)) {
      setData((d) => ({ ...d, skills: [...d.skills, trimmed] }))
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) =>
    setData((d) => ({ ...d, skills: d.skills.filter((s) => s !== skill) }))

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* PDF Import Panel */}
      <section className="mb-8 rounded-xl border border-gray-700 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">PDF Import</h2>
          {llmStatus && (
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                llmStatus.enabled
                  ? 'border-green-900/50 bg-green-950/30 text-green-400'
                  : 'border-gray-700 bg-gray-800 text-gray-400'
              }`}
            >
              {llmStatus.enabled ? `LLM: ${llmStatus.provider}` : 'LLM: disabled'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
          >
            {pdfFile ? pdfFile.name : 'Choose PDF…'}
          </button>
          <button
            onClick={handleParsePDF}
            disabled={!pdfFile || pdfParsing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pdfParsing ? 'Parsing…' : 'Parse PDF'}
          </button>
        </div>

        {pdfError && (
          <p className="mt-3 text-sm text-red-400">{pdfError}</p>
        )}

        {!llmStatus?.enabled && (
          <p className="mt-3 text-xs text-gray-500">
            LLM is disabled. PDF text will be extracted and shown so you can copy-paste manually.
            Enable an LLM provider in config.yaml for auto-fill.
          </p>
        )}
      </section>

      {/* Editor header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Edit Portfolio</h1>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span
              className={`text-sm ${saveMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}
            >
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="editor-controls rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-shrink-0 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
              tab === key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {tab === 'basic' && (
          <div className="space-y-5">
            {/* Profile Photo — top of form */}
            <div className="flex items-center gap-5 rounded-xl border border-gray-700 bg-gray-800/40 p-4">
              <input ref={photoInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handlePhotoUpload} className="hidden" />
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="group relative flex-shrink-0 focus:outline-none"
                title="Click to upload photo"
              >
                {data.photo_url ? (
                  <img
                    src={data.photo_url}
                    alt="Profile"
                    className="h-20 w-20 rounded-full border-2 border-blue-500 object-cover transition group-hover:opacity-70"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-gray-600 bg-gray-800 transition group-hover:border-blue-500">
                    <svg className="h-7 w-7 text-gray-500 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-gray-700 bg-blue-600 text-white shadow">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </button>
              <div>
                <p className="mb-1 text-sm font-medium text-gray-200">Profile Photo</p>
                <p className="mb-2 text-xs text-gray-500">JPEG, PNG or WebP · max 5 MB</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-gray-600 disabled:opacity-50"
                  >
                    {photoUploading ? 'Uploading…' : data.photo_url ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {data.photo_url && (
                    <button
                      onClick={() => setData((d) => ({ ...d, photo_url: '' }))}
                      className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-950/40"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full Name">
                <input value={data.name} onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))} className={inputCls} placeholder="Alex Morgan" />
              </Field>
              <Field label="Title / Role">
                <input value={data.title} onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))} className={inputCls} placeholder="Senior Software Engineer" />
              </Field>
              <Field label="Email">
                <input type="email" value={data.email} onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))} className={inputCls} placeholder="you@example.com" />
              </Field>
              <Field label="Phone">
                <input value={data.phone} onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))} className={inputCls} placeholder="+1 555 000 0000" />
              </Field>
              <Field label="Location" className="sm:col-span-2">
                <input value={data.location} onChange={(e) => setData((d) => ({ ...d, location: e.target.value }))} className={inputCls} placeholder="San Francisco, CA" />
              </Field>
            </div>
            <Field label="Summary">
              <textarea
                rows={4}
                value={data.summary}
                onChange={(e) => setData((d) => ({ ...d, summary: e.target.value }))}
                className={inputCls}
                placeholder="One paragraph about you…"
              />
            </Field>
          </div>
        )}

        {tab === 'links' && (
          <div className="space-y-3">
            {data.links.map((link, i) => (
              <div key={i} className="flex gap-3">
                <input
                  value={link.label}
                  onChange={(e) => updateLink(i, 'label', e.target.value)}
                  className={`${inputCls} w-32 flex-shrink-0`}
                  placeholder="GitHub"
                />
                <input
                  value={link.url}
                  onChange={(e) => updateLink(i, 'url', e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="https://…"
                />
                <button onClick={() => removeLink(i)} className="text-gray-600 hover:text-red-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button onClick={addLink} className={addBtnCls}>+ Add Link</button>
          </div>
        )}

        {tab === 'skills' && (
          <div>
            <div className="mb-4 flex gap-3">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                className={`${inputCls} flex-1`}
                placeholder="Type a skill and press Enter or Add"
              />
              <button onClick={addSkill} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-900/40 bg-blue-950/30 px-3 py-1.5 text-sm text-blue-300"
                >
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="text-blue-500 hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {tab === 'experience' && (
          <div className="space-y-6">
            {data.experience.map((exp, i) => (
              <div key={i} className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-300">Experience {i + 1}</h3>
                  <button onClick={() => removeExperience(i)} className="text-gray-600 hover:text-red-400 text-sm">Remove</button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company">
                    <input value={exp.company} onChange={(e) => updateExperience(i, 'company', e.target.value)} className={inputCls} placeholder="Acme Corp" />
                  </Field>
                  <Field label="Role">
                    <input value={exp.role} onChange={(e) => updateExperience(i, 'role', e.target.value)} className={inputCls} placeholder="Software Engineer" />
                  </Field>
                  <Field label="Start Date">
                    <input value={exp.start_date} onChange={(e) => updateExperience(i, 'start_date', e.target.value)} className={inputCls} placeholder="2022-03" />
                  </Field>
                  <Field label="End Date">
                    <input value={exp.end_date} onChange={(e) => updateExperience(i, 'end_date', e.target.value)} className={inputCls} placeholder="Present" />
                  </Field>
                  <Field label="Description" className="sm:col-span-2">
                    <textarea rows={3} value={exp.description} onChange={(e) => updateExperience(i, 'description', e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </div>
            ))}
            <button onClick={addExperience} className={addBtnCls}>+ Add Experience</button>
          </div>
        )}

        {tab === 'education' && (
          <div className="space-y-6">
            {data.education.map((edu, i) => (
              <div key={i} className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-300">Education {i + 1}</h3>
                  <button onClick={() => removeEducation(i)} className="text-gray-600 hover:text-red-400 text-sm">Remove</button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Institution" className="sm:col-span-2">
                    <input value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)} className={inputCls} placeholder="UC Berkeley" />
                  </Field>
                  <Field label="Year">
                    <input value={edu.year} onChange={(e) => updateEducation(i, 'year', e.target.value)} className={inputCls} placeholder="2020" />
                  </Field>
                  <Field label="Degree" className="sm:col-span-3">
                    <input value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} className={inputCls} placeholder="B.S. Computer Science" />
                  </Field>
                </div>
              </div>
            ))}
            <button onClick={addEducation} className={addBtnCls}>+ Add Education</button>
          </div>
        )}

        {tab === 'projects' && (
          <div className="space-y-6">
            {data.projects.map((proj, i) => (
              <div key={i} className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-300">Project {i + 1}</h3>
                  <button onClick={() => removeProject(i)} className="text-gray-600 hover:text-red-400 text-sm">Remove</button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title">
                    <input
                      value={proj.title}
                      onChange={(e) => {
                        updateProject(i, 'title', e.target.value)
                        if (!proj.slug || proj.slug === slugify(proj.title)) {
                          updateProject(i, 'slug', slugify(e.target.value))
                        }
                      }}
                      className={inputCls}
                      placeholder="My Awesome Project"
                    />
                  </Field>
                  <Field label="Slug (URL)">
                    <input value={proj.slug} onChange={(e) => updateProject(i, 'slug', e.target.value)} className={inputCls} placeholder="my-awesome-project" />
                  </Field>
                  <Field label="Start Date">
                    <input value={proj.start_date} onChange={(e) => updateProject(i, 'start_date', e.target.value)} className={inputCls} placeholder="2023-01" />
                  </Field>
                  <Field label="End Date">
                    <input value={proj.end_date} onChange={(e) => updateProject(i, 'end_date', e.target.value)} className={inputCls} placeholder="Present" />
                  </Field>
                  <Field label="Summary" className="sm:col-span-2">
                    <textarea rows={2} value={proj.summary} onChange={(e) => updateProject(i, 'summary', e.target.value)} className={inputCls} placeholder="What did this project do?" />
                  </Field>
                  <Field label="My Contribution" className="sm:col-span-2">
                    <textarea rows={4} value={proj.my_contribution} onChange={(e) => updateProject(i, 'my_contribution', e.target.value)} className={inputCls} placeholder="What specifically did YOU build or design?" />
                  </Field>
                  <Field label="Tech Stack (comma-separated)" className="sm:col-span-2">
                    <input
                      value={proj.tech_stack.join(', ')}
                      onChange={(e) => updateProjectTechStack(i, e.target.value)}
                      className={inputCls}
                      placeholder="Go, React, Kubernetes"
                    />
                  </Field>
                  <Field label="Outcomes / Results" className="sm:col-span-2">
                    <textarea rows={2} value={proj.outcomes} onChange={(e) => updateProject(i, 'outcomes', e.target.value)} className={inputCls} placeholder="What was the impact?" />
                  </Field>
                </div>
              </div>
            ))}
            <button onClick={addProject} className={addBtnCls}>+ Add Project</button>
          </div>
        )}

        {tab === 'awards' && (
          <div className="space-y-6">
            {(data.awards ?? []).map((award, i) => (
              <div key={i} className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-300">Award {i + 1}</h3>
                  <button onClick={() => removeAward(i)} className="text-gray-600 hover:text-red-400 text-sm">Remove</button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Award Title" className="sm:col-span-2">
                    <input value={award.title} onChange={(e) => updateAward(i, 'title', e.target.value)} className={inputCls} placeholder="Bravo Award" />
                  </Field>
                  <Field label="Date">
                    <input value={award.date} onChange={(e) => updateAward(i, 'date', e.target.value)} className={inputCls} placeholder="Oct 2023" />
                  </Field>
                  <Field label="Issued By">
                    <input value={award.issuer} onChange={(e) => updateAward(i, 'issuer', e.target.value)} className={inputCls} placeholder="Company / Organisation" />
                  </Field>
                  <Field label="Description" className="sm:col-span-2">
                    <textarea rows={3} value={award.description} onChange={(e) => updateAward(i, 'description', e.target.value)} className={inputCls} placeholder="What was this award for?" />
                  </Field>
                </div>
              </div>
            ))}
            <button onClick={addAward} className={addBtnCls}>+ Add Award</button>
          </div>
        )}
      </div>

      {/* Raw text modal (LLM disabled) */}
      {rawTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-gray-700 bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-800 p-4">
              <div>
                <h3 className="font-semibold text-white">Extracted PDF Text</h3>
                <p className="text-xs text-gray-400">LLM is disabled — copy this text and fill the fields manually.</p>
              </div>
              <button onClick={() => setRawTextModal('')} className="text-gray-400 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">{rawTextModal}</pre>
            <div className="border-t border-gray-800 p-4">
              <button
                onClick={() => { navigator.clipboard.writeText(rawTextModal); }}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal (LLM enabled) */}
      {reviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-gray-700 bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-800 p-4">
              <div>
                <h3 className="font-semibold text-white">Review Extracted Data</h3>
                <p className="text-xs text-gray-400">LLM parsed your PDF. Review and accept to fill the editor.</p>
              </div>
              <button onClick={() => setReviewData(null)} className="text-gray-400 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(reviewData, null, 2)}
              </pre>
            </div>
            <div className="flex gap-3 border-t border-gray-800 p-4">
              <button
                onClick={acceptReview}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Accept &amp; Fill
              </button>
              <button
                onClick={() => setReviewData(null)}
                className="rounded-lg border border-gray-700 px-5 py-2 text-sm text-gray-400 hover:bg-gray-800"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

const addBtnCls =
  'rounded-lg border border-dashed border-gray-600 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:border-blue-500 hover:text-blue-400 w-full'

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  )
}
