import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(
  fileURLToPath(new URL('../../src/client/UsageInsightsSection.module.css', import.meta.url)),
  'utf8',
)

describe('usage heatmap styles', () => {
  it('uses a structural skeleton with a reduced-motion fallback', () => {
    expect(styles).toMatch(/\.skeletonSummary\s*\{[^}]*grid-template-columns:\s*repeat\(5,/s)
    expect(styles).toMatch(/\.skeletonBlock,\s*\.skeletonParticles i\s*\{[^}]*animation:\s*skeleton-pulse/s)
    expect(styles).toMatch(/prefers-reduced-motion:\s*reduce/s)
  })

  it('gives the dashboard a settings-native vertical rhythm', () => {
    expect(styles).toMatch(/\.section\s*\{[^}]*padding:\s*0\s+0\s+36px/s)
    expect(styles).toMatch(/\.pageHeader\s*\{[^}]*margin-bottom:\s*20px/s)
    expect(styles).toMatch(/\.pageTitle\s*\{[^}]*font-size:\s*16px;[^}]*line-height:\s*24px;[^}]*font-weight:\s*500/s)
    expect(styles).toMatch(/\.pageIntro\s*\{[^}]*font-size:\s*14px;[^}]*line-height:\s*22px/s)
    expect(styles).toMatch(/\.activityHeader\s*\{[^}]*margin-top:\s*32px/s)
    expect(styles).toMatch(/\.chartPanel\s*\{[^}]*margin-top:\s*16px/s)
    expect(styles).toMatch(/\.detailsGrid\s*\{[^}]*margin-top:\s*44px/s)
  })

  it('keeps the original 53 by 7 geometry and keeps idle particles readable', () => {
    expect(styles).toMatch(/\.heatmap\s*\{[^}]*grid-template-rows:\s*repeat\(7,/s)
    expect(styles).toMatch(/\.heatmap\s*\{[^}]*grid-auto-flow:\s*column/s)
    expect(styles).toMatch(/\.heatmap\s*\{[^}]*aspect-ratio:\s*53\s*\/\s*7/s)
    expect(styles).toMatch(/\.heatmapWeek\s*\{[^}]*display:\s*contents/s)
    // A day without usage must still paint its cell. A transparent idle
    // particle erases the seven-row grid, leaving only the days that have
    // usage visible, which reads as a single stray dot.
    expect(styles).toMatch(/\.day\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--dsw-alias-label-primary\)\s*10%,\s*transparent\)/s)
    expect(styles).not.toMatch(/\.day\s*\{[^}]*background:\s*transparent/s)
    // Every recorded level still overrides that idle fill with the accent ramp.
    for (const level of [1, 2, 3, 4, 5]) {
      expect(styles).toMatch(new RegExp(`\\.day\\[data-level='${level}'\\]\\s*\\{[^}]*background:\\s*oklch\\(`, 's'))
    }
    expect(styles).not.toMatch(/\.weekly\s*\{/)
    expect(styles).not.toMatch(/\.cumulative\s*\{/)
    expect(styles).toMatch(/\.heatmapStage\s*\{[^}]*position:\s*relative/s)
    expect(styles).toMatch(/\.tooltip\s*\{[^}]*position:\s*absolute/s)
    expect(styles).toMatch(/\.tooltip\s*\{[^}]*border-radius:\s*8px/s)
  })

  it('reverses the ramp on the dark palette so brightness tracks usage', () => {
    /** Lightness the rule for one level sets, within a given selector scope. */
    const lightness = (scope: string, level: number): number => {
      const pattern = new RegExp(
        `${scope}\\.day\\[data-level='${level}'\\]\\s*\\{[^}]*`
        + 'oklch\\(from var\\(--dsw-alias-state-business-primary\\)\\s+([0-9.]+)',
        's',
      )
      const match = styles.match(pattern)
      expect(match, `${scope || 'light'} level ${level} rule missing`).not.toBeNull()
      return Number(match?.[1])
    }
    const DARK = 'body\\[data-ds-dark-theme\\] '
    for (let level = 1; level < 5; level += 1) {
      // Light surface: the ramp must darken as usage grows.
      expect(lightness('', level), `light level ${level}`)
        .toBeGreaterThan(lightness('', level + 1))
      // Dark surface: the same ramp reversed, so the busiest day is brightest.
      expect(lightness(DARK, level), `dark level ${level}`)
        .toBeLessThan(lightness(DARK, level + 1))
    }
    // The dimmest dark step still has to clear its own empty cell.
    expect(lightness(DARK, 1)).toBeGreaterThan(0.4)
  })
})
