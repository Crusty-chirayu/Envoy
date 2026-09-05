import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx'
import type { ProfessionalProfile, EnvoyDocument, SectionType } from '@/types'

const DEFAULT_SECTION_ORDER: SectionType[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'achievements',
  'publications',
  'awards',
  'volunteering',
  'languages',
  'interests',
  'custom',
]

export async function generateDocxBlob(
  profile: ProfessionalProfile,
  document?: EnvoyDocument
): Promise<Blob> {
  const { identity } = profile

  const headerParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: identity.name.toUpperCase(),
          bold: true,
          size: 32, // 16pt
          font: 'Arial',
        }),
      ],
    }),
  ]

  if (identity.headline) {
    headerParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: identity.headline.toUpperCase(),
            bold: true,
            size: 20, // 10pt
            color: '666666',
            font: 'Arial',
          }),
        ],
      })
    )
  }

  const contactParts: string[] = []
  if (identity.email) contactParts.push(identity.email)
  if (identity.phone) contactParts.push(identity.phone)
  if (identity.location) contactParts.push(identity.location)
  if (identity.linkedin) contactParts.push('Linkedin: ' + identity.linkedin)
  if (identity.github) contactParts.push('Github: ' + identity.github)
  if (identity.website) contactParts.push('Website: ' + identity.website)

  headerParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: contactParts.join('  |  '),
          size: 18,
          font: 'Arial',
        }),
      ],
    })
  )

  const children: Paragraph[] = [...headerParagraphs]

  const addSectionTitle = (title: string) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: 24, // 12pt
            font: 'Arial',
            color: '000000',
          }),
        ],
      })
    )
  }

  let activeSections: { type: SectionType; title?: string; customSectionId?: string }[] = []

  if (document?.sections && document.sections.length > 0) {
    activeSections = [...document.sections]
      .filter((s) => s.visible)
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ type: s.type, title: s.title, customSectionId: s.customSectionId }))
  } else {
    activeSections = DEFAULT_SECTION_ORDER.map((type) => ({ type }))
  }

  const renderSection = (item: { type: SectionType; title?: string; customSectionId?: string }) => {
    switch (item.type) {
      case 'summary':
        if (!profile.summary) return
        addSectionTitle(item.title || 'Professional Summary')
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: profile.summary,
                size: 20,
                font: 'Arial',
              }),
            ],
          })
        )
        break

      case 'experience':
        if (!profile.experience || profile.experience.length === 0) return
        addSectionTitle(item.title || 'Work Experience')
        for (const exp of profile.experience) {
          children.push(
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: [
                new TextRun({
                  text: `${exp.role}  -  `,
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
                new TextRun({
                  text: `${exp.company} (${exp.location || 'Remote'})`,
                  italics: true,
                  size: 20,
                  font: 'Arial',
                }),
                new TextRun({
                  text: `\t${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || ''}`,
                  bold: true,
                  size: 18,
                  font: 'Arial',
                }),
              ],
            })
          )

          if (exp.technologies && exp.technologies.length > 0) {
            children.push(
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: `Technologies: ${exp.technologies.join(', ')}`,
                    italics: true,
                    size: 18,
                    color: '444444',
                    font: 'Arial',
                  }),
                ],
              })
            )
          }

          if (exp.bullets) {
            for (const bullet of exp.bullets) {
              children.push(
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: bullet,
                      size: 20,
                      font: 'Arial',
                    }),
                  ],
                })
              )
            }
          }
        }
        break

      case 'education':
        if (!profile.education || profile.education.length === 0) return
        addSectionTitle(item.title || 'Education')
        for (const edu of profile.education) {
          children.push(
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: [
                new TextRun({
                  text: edu.field ? `${edu.degree} in ${edu.field}  -  ` : `${edu.degree}  -  `,
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
                new TextRun({
                  text: `${edu.institution}`,
                  italics: true,
                  size: 20,
                  font: 'Arial',
                }),
                new TextRun({
                  text: `\t${edu.startDate} - ${edu.current ? 'Present' : edu.endDate || ''}`,
                  bold: true,
                  size: 18,
                  font: 'Arial',
                }),
              ],
            })
          )
        }
        break

      case 'skills':
        if (!profile.skills || profile.skills.length === 0) return
        addSectionTitle(item.title || 'Skills')
        for (const group of profile.skills) {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: `${group.category}: `,
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
                new TextRun({
                  text: group.skills.join(', '),
                  size: 20,
                  font: 'Arial',
                }),
              ],
            })
          )
        }
        break

      case 'projects':
        if (!profile.projects || profile.projects.length === 0) return
        addSectionTitle(item.title || 'Projects')
        for (const proj of profile.projects) {
          children.push(
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: [
                new TextRun({
                  text: `${proj.name}  `,
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
                new TextRun({
                  text: `(${proj.technologies.join(', ')})`,
                  italics: true,
                  size: 18,
                  color: '444444',
                  font: 'Arial',
                }),
              ],
            })
          )

          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: proj.description,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            })
          )

          if (proj.bullets) {
            for (const bullet of proj.bullets) {
              children.push(
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: bullet,
                      size: 20,
                      font: 'Arial',
                    }),
                  ],
                })
              )
            }
          }
        }
        break

      case 'certifications':
        if (!profile.certifications || profile.certifications.length === 0) return
        addSectionTitle(item.title || 'Certifications')
        for (const cert of profile.certifications) {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: `${cert.name} `, bold: true, size: 20, font: 'Arial' }),
                new TextRun({ text: `- ${cert.issuer} ${cert.date ? `(${cert.date})` : ''}`, size: 20, font: 'Arial' }),
              ],
            })
          )
        }
        break

      case 'achievements':
        if (!profile.achievements || profile.achievements.length === 0) return
        addSectionTitle(item.title || 'Key Achievements')
        for (const ach of profile.achievements) {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: `${ach.title} `, bold: true, size: 20, font: 'Arial' }),
                new TextRun({
                  text: `${ach.organization ? `| ${ach.organization} ` : ''}${ach.date ? `(${ach.date})` : ''}`,
                  italics: true,
                  size: 18,
                  font: 'Arial',
                }),
              ],
            })
          )
        }
        break

      case 'publications':
        if (!profile.publications || profile.publications.length === 0) return
        addSectionTitle(item.title || 'Publications')
        for (const pub of profile.publications) {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: `${pub.title} (${pub.date})`, bold: true, size: 20, font: 'Arial' }),
              ],
            })
          )
        }
        break

      case 'awards':
        if (!profile.awards || profile.awards.length === 0) return
        addSectionTitle(item.title || 'Honors & Awards')
        for (const awd of profile.awards) {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: `${awd.title} `, bold: true, size: 20, font: 'Arial' }),
                new TextRun({ text: `- ${awd.issuer} ${awd.date ? `(${awd.date})` : ''}`, size: 20, font: 'Arial' }),
              ],
            })
          )
        }
        break

      case 'volunteering':
        if (!profile.volunteering || profile.volunteering.length === 0) return
        addSectionTitle(item.title || 'Volunteer Work')
        for (const vol of profile.volunteering) {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: `${vol.role} - ${vol.organization} `, bold: true, size: 20, font: 'Arial' }),
                new TextRun({ text: `(${vol.startDate} - ${vol.current ? 'Present' : vol.endDate || ''})`, size: 18, font: 'Arial' }),
              ],
            })
          )
        }
        break

      case 'languages':
        if (!profile.languages || profile.languages.length === 0) return
        addSectionTitle(item.title || 'Languages')
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: profile.languages.map((l) => `${l.language} (${l.proficiency})`).join(', '),
                size: 20,
                font: 'Arial',
              }),
            ],
          })
        )
        break

      case 'interests':
        if (!profile.interests || profile.interests.length === 0) return
        addSectionTitle(item.title || 'Interests')
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: profile.interests.map((i) => i.interest).join(', '),
                size: 20,
                font: 'Arial',
              }),
            ],
          })
        )
        break

      case 'custom':
        if (!profile.customSections || profile.customSections.length === 0) return
        const matches = item.customSectionId
          ? profile.customSections.filter((c) => c.id === item.customSectionId)
          : profile.customSections
        for (const cs of matches) {
          if (!cs.visible) continue
          addSectionTitle(item.title || cs.title)
          for (const entry of cs.entries) {
            children.push(
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: entry.title, bold: true, size: 20, font: 'Arial' }),
                ],
              })
            )
            if (entry.content) {
              children.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({ text: entry.content, size: 20, font: 'Arial' }),
                  ],
                })
              )
            }
          }
        }
        break
    }
  }

  for (const s of activeSections) {
    renderSection(s)
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  return await Packer.toBlob(doc)
}
