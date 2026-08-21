import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx'
import type { ProfessionalProfile, EnvoyDocument } from '@/types'

export async function generateDocxBlob(
  profile: ProfessionalProfile,
  _document: EnvoyDocument
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

  const contactParts = []
  if (identity.email) contactParts.push(identity.email)
  if (identity.phone) contactParts.push(identity.phone)
  if (identity.location) contactParts.push(identity.location)
  if (identity.linkedin) contactParts.push('Linkedin: ' + identity.linkedin)
  if (identity.github) contactParts.push('Github: ' + identity.github)

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

  if (profile.summary) {
    addSectionTitle('Professional Summary')
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
  }

  if (profile.experience.length > 0) {
    addSectionTitle('Work Experience')
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
              text: `\t${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`,
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

  if (profile.education.length > 0) {
    addSectionTitle('Education')
    for (const edu of profile.education) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: `${edu.degree} in ${edu.field}  -  `,
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
              text: `\t${edu.startDate} - ${edu.current ? 'Present' : edu.endDate}`,
              bold: true,
              size: 18,
              font: 'Arial',
            }),
          ],
        })
      )
    }
  }

  if (profile.skills.length > 0) {
    addSectionTitle('Skills')
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
  }

  if (profile.projects.length > 0) {
    addSectionTitle('Projects')
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
