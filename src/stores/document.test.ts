import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from './document'
import type { ProfessionalProfile, EnvoyDocument } from '@/types'

const testProfile: ProfessionalProfile = {
  id: 'p-test',
  userId: 'u-test',
  summary: 'Original Summary',
  identity: {
    name: 'Jane Doe',
    headline: 'Full Stack Engineer',
    email: 'jane@example.com',
    phone: '',
    location: '',
  },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  achievements: [],
  publications: [],
  awards: [],
  volunteering: [],
  languages: [],
  interests: [],
  customSections: [],
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

const testDocument: EnvoyDocument = {
  id: 'doc-test',
  userId: 'u-test',
  profileId: 'p-test',
  type: 'resume',
  title: 'Test Resume',
  settings: {
    template: 'modern',
    accentColor: '#6366f1',
    fontFamily: 'inter',
    fontSize: 'normal',
    pageMargin: 'normal',
    showPhoto: false,
  },
  sections: [
    { id: 's1', type: 'summary', title: 'Summary', visible: true, order: 0 },
  ],
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

describe('Document Store - Versioning & State Management', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      profile: testProfile,
      document: testDocument,
      versions: [],
      saveStatus: 'idle',
    })
  })

  it('creates document versions and prepends them to version history', () => {
    const store = useDocumentStore.getState()
    const ver = store.createVersion('Initial Checkpoint', 'manual', 'First version snapshot')
    
    expect(ver).not.toBeNull()
    expect(ver?.label).toBe('Initial Checkpoint')
    
    const updatedVersions = useDocumentStore.getState().versions
    expect(updatedVersions.length).toBe(1)
    expect(updatedVersions[0].profileSnapshot.summary).toBe('Original Summary')
  })

  it('reorders sections cleanly', () => {
    const multiSectionDoc: EnvoyDocument = {
      ...testDocument,
      sections: [
        { id: 's1', type: 'summary', title: 'Summary', visible: true, order: 0 },
        { id: 's2', type: 'experience', title: 'Experience', visible: true, order: 1 },
      ],
    }
    useDocumentStore.setState({ document: multiSectionDoc })

    useDocumentStore.getState().reorderSections(0, 1)

    const updatedDoc = useDocumentStore.getState().document
    expect(updatedDoc?.sections[0].type).toBe('experience')
    expect(updatedDoc?.sections[1].type).toBe('summary')
  })

  it('toggles section visibility', () => {
    useDocumentStore.getState().toggleSectionVisibility('s1')

    const updatedDoc = useDocumentStore.getState().document
    expect(updatedDoc?.sections[0].visible).toBe(false)
  })
})
