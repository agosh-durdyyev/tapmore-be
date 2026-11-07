import {
  DataSet,
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity'

// Shared policy: keep the dashboard and backend copies byte-for-byte identical.
// Neutral anatomical/educational terms are not profanity by themselves.
const dataset = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .removePhrasesIf((phrase) =>
    ['sex', 'penis', 'vagina'].includes(phrase.metadata?.originalWord || ''),
  )
const matcher = new RegExpMatcher({
  ...dataset.build(),
  ...englishRecommendedTransformers,
})

export function textIssue(value: string, label: string): string | null {
  const normalized = value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '')
  // Also catch deliberately separated single-letter spellings without joining normal words.
  const joined = normalized.replace(
    /(?<![\p{L}\p{N}])(?:[\p{L}\p{N}][\s._*-]+){2,}[\p{L}\p{N}](?![\p{L}\p{N}])/gu,
    (letters) => letters.replace(/[\s._*-]/g, ''),
  )
  return matcher.hasMatch(normalized) || matcher.hasMatch(joined)
    ? `${label} can’t contain profanity or slurs.`
    : null
}

export interface ContentIssue {
  field: string
  message: string
}
interface PageText {
  username: string
  name: string
  bio: string
  initials: string
  links: readonly { title: string }[]
}

export function contentIssues(page: PageText): ContentIssue[] {
  const issues: ContentIssue[] = []
  const check = (field: string, value: string, label: string) => {
    const message = textIssue(value, label)
    if (message) issues.push({ field, message })
  }
  check('username', page.username.replace(/[_-]+/g, ' '), 'Your page address')
  check('name', page.name, 'Your profile name')
  check('bio', page.bio, 'Your bio')
  check('initials', page.initials, 'Your initials')
  page.links.forEach((link, index) =>
    check(`links.${index}.title`, link.title, `Link ${index + 1}’s title`),
  )
  return issues
}
