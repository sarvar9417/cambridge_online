export type SourceIdentity = {
  year: number
  series: string
  component: number
  variant: number
  kind: string
  sourceUrl: string
}

const SOURCE_URL_OVERRIDES = new Map<string, string>([
  [
    '2021/FM/2/2/QP',
    'https://drive.google.com/file/d/1haAGyQegnBtF_NEMv-Bc3TMOX-EDwE2f/view?usp=sharing',
  ],
])

function sourceKey(source: Omit<SourceIdentity, 'sourceUrl'>): string {
  return [
    source.year,
    source.series.trim().toUpperCase(),
    source.component,
    source.variant,
    source.kind.trim().toUpperCase(),
  ].join('/')
}

export function canonical0478SourceUrl(source: SourceIdentity): string {
  return SOURCE_URL_OVERRIDES.get(sourceKey(source)) ?? source.sourceUrl
}
