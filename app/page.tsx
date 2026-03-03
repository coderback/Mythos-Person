'use client'

import { useReducer, useEffect, useMemo, useState, useCallback } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'

// ─── Section 1: TypeScript Types ──────────────────────────────────────────────

type Dimension =
  | 'extraversion'
  | 'agreeableness'
  | 'conscientiousness'
  | 'neuroticism'
  | 'openness'
  | 'honesty_humility'
  | 'dark_traits'
  | 'attachment_avoidance'

type DimVector = [number, number, number, number, number, number, number, number]

interface Archetype {
  id: string
  name: string
  greek_name: string
  symbol: string
  domain: string
  vector: DimVector
  light_traits: [string, string, string]
  shadow_traits: [string, string]
  description: string
  famous_embodiments: [string, string]
  growth_edge: string
}

interface Statement {
  id: string
  text: string
  dimension: Dimension | null
  isAttentionCheck?: boolean
}

interface Triad {
  id: number
  statements: [Statement, Statement, Statement]
  attentionCheckId?: string
}

interface Answer {
  mostId: string
  leastId: string
}

type Screen = 'welcome' | 'assessment' | 'processing' | 'results'

interface AppState {
  screen: Screen
  consentChecked: boolean
  currentQuestion: number
  answers: Record<number, Answer>
  pendingMost: string | null
  pendingLeast: string | null
  attentionFailed: boolean
  dimensionScores: Record<Dimension, number> | null
  archetypeMatches: Array<{ archetype: Archetype; similarity: number }> | null
}

type AppAction =
  | { type: 'TOGGLE_CONSENT' }
  | { type: 'START' }
  | { type: 'SELECT_MOST'; id: string }
  | { type: 'SELECT_LEAST'; id: string }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH_PROCESSING'; scores: Record<Dimension, number>; matches: Array<{ archetype: Archetype; similarity: number }> }
  | { type: 'RETAKE' }

// ─── Section 2: Archetype Data ────────────────────────────────────────────────

const ARCHETYPES: Archetype[] = [
  {
    id: 'artemis',
    name: 'Artemis',
    greek_name: 'Ἄρτεμις',
    symbol: '🏹',
    domain: 'The Huntress',
    vector: [0.35, 0.55, 0.75, 0.30, 0.70, 0.75, 0.15, 0.85],
    light_traits: ['Self-sufficient', 'Principled', 'Focused'],
    shadow_traits: ['Emotionally distant', 'Uncompromising'],
    description: 'You tend to move through the world with quiet certainty, following your own compass regardless of social pressure. Your autonomy is sacred to you — you do your best work alone or with a trusted few, and you hold yourself to exacting standards. You are drawn to nature, solitude, and causes worth protecting. Others may find you reserved, but those who earn your loyalty discover an unwavering ally.',
    famous_embodiments: ['Diana of Versailles', 'Katniss Everdeen'],
    growth_edge: 'Allow yourself to need others — vulnerability is not a wound but a doorway.'
  },
  {
    id: 'athena',
    name: 'Athena',
    greek_name: 'Ἀθηνᾶ',
    symbol: '🦉',
    domain: 'The Strategist',
    vector: [0.50, 0.60, 0.90, 0.25, 0.90, 0.80, 0.20, 0.65],
    light_traits: ['Strategic', 'Wise', 'Ethical'],
    shadow_traits: ['Over-analytical', 'Emotionally armoured'],
    description: 'You navigate the world through intellect and strategy, seeing several moves ahead where others see one. Planning is not a chore for you — it is how you express care and mastery. You have strong ethical convictions and will not sacrifice them for expedience. Your counsel is sought because you bring both wisdom and integrity to every challenge you undertake.',
    famous_embodiments: ['Eleanor Roosevelt', 'Hermione Granger'],
    growth_edge: 'Trust the body and the heart as sources of wisdom alongside the mind.'
  },
  {
    id: 'hestia',
    name: 'Hestia',
    greek_name: 'Ἑστία',
    symbol: '🔥',
    domain: 'The Keeper',
    vector: [0.25, 0.80, 0.85, 0.20, 0.55, 0.90, 0.10, 0.30],
    light_traits: ['Steadfast', 'Warm', 'Grounding'],
    shadow_traits: ['Self-erasing', 'Resistant to change'],
    description: 'You are the sacred hearth around which others gather — steady, warm, and profoundly reliable. You derive deep meaning from creating spaces where people feel safe and held. Consistency and devotion are your currencies; you build slowly but enduringly. You may not seek the spotlight, yet the communities and homes you tend would fall into disorder without your quiet, essential presence.',
    famous_embodiments: ['Mister Rogers', 'Virginia Woolf'],
    growth_edge: 'Tend your own flame with the same devotion you give to others.'
  },
  {
    id: 'hera',
    name: 'Hera',
    greek_name: 'Ἥρα',
    symbol: '👑',
    domain: 'The Sovereign',
    vector: [0.60, 0.45, 0.80, 0.65, 0.50, 0.50, 0.45, 0.15],
    light_traits: ['Commanding', 'Committed', 'Dignified'],
    shadow_traits: ['Possessive', 'Vindictive when betrayed'],
    description: 'You carry yourself with a natural authority that others recognise without being told. Partnership and covenant matter deeply to you — you take your bonds and responsibilities seriously, and you expect the same in return. You build structures and institutions that outlast individual whims. When betrayed, your wrath is formidable, but it springs from genuine loyalty rather than mere pride.',
    famous_embodiments: ['Cleopatra', 'Cersei Lannister'],
    growth_edge: 'Your power does not depend on the loyalty of others — learn to reign from wholeness, not fear of loss.'
  },
  {
    id: 'demeter',
    name: 'Demeter',
    greek_name: 'Δημήτηρ',
    symbol: '🌾',
    domain: 'The Nurturer',
    vector: [0.50, 0.95, 0.80, 0.50, 0.55, 0.85, 0.10, 0.35],
    light_traits: ['Nurturing', 'Generous', 'Life-giving'],
    shadow_traits: ['Smothering', 'Grief-stricken by separation'],
    description: 'You are animated by a profound impulse to nurture, provide, and sustain. The wellbeing of those in your care is your first priority, and your generosity is genuinely unconditional. You connect deeply to cycles of growth, abundance, and loss — you understand that nourishment is an act of love. Your shadow appears when attachment becomes control, or when others\' independence feels like abandonment.',
    famous_embodiments: ['Toni Morrison', 'Marmee March'],
    growth_edge: 'Love that lets go is the deepest love — release your harvest and trust the cycle.'
  },
  {
    id: 'persephone',
    name: 'Persephone',
    greek_name: 'Περσεφόνη',
    symbol: '🌑',
    domain: 'The Transformer',
    vector: [0.40, 0.75, 0.50, 0.65, 0.70, 0.65, 0.20, 0.55],
    light_traits: ['Perceptive', 'Adaptable', 'Bridge-builder'],
    shadow_traits: ['Easily overwhelmed', 'Divided loyalties'],
    description: 'You have been forged by descent — by experiences that took you to dark places and returned you changed. This gives you a rare capacity to move between worlds: the joyful and the sorrowful, the ordinary and the numinous. You perceive depth and shadow in situations others read as simple. You are a bridge, a mediator, someone who has genuinely metabolised difficulty into wisdom.',
    famous_embodiments: ['Sylvia Plath', 'Frodo Baggins'],
    growth_edge: 'Claim your sovereignty in both worlds — you are not a visitor in your own depths.'
  },
  {
    id: 'aphrodite',
    name: 'Aphrodite',
    greek_name: 'Ἀφροδίτη',
    symbol: '🌹',
    domain: 'The Beloved',
    vector: [0.85, 0.70, 0.45, 0.70, 0.85, 0.45, 0.35, 0.20],
    light_traits: ['Magnetic', 'Creative', 'Empathic'],
    shadow_traits: ['Pleasure-driven', 'Conflict-averse'],
    description: 'You are woven from desire and beauty — not vanity, but a genuine, life-affirming orientation toward what is lovely and worth loving. You light up rooms and draw people into connection almost effortlessly. Creativity, pleasure, and intimacy are not luxuries to you but necessities for a life well-lived. Your challenge is to honour your depth when the world wants only your shine.',
    famous_embodiments: ['Frida Kahlo', 'Rumi'],
    growth_edge: 'Root your radiance in self-knowledge so that beauty serves truth, not just enchantment.'
  },
  {
    id: 'zeus',
    name: 'Zeus',
    greek_name: 'Ζεύς',
    symbol: '⚡',
    domain: 'The Ruler',
    vector: [0.90, 0.30, 0.80, 0.40, 0.65, 0.20, 0.85, 0.60],
    light_traits: ['Decisive', 'Visionary', 'Commanding'],
    shadow_traits: ['Domineering', 'Accountability-averse'],
    description: 'You think in systems and scales — where others see a problem, you see a structure to be built or rebuilt. Your instinct is to lead, and you do so with conviction and energy that others find galvanising. Power is your natural medium, and you use it to shape outcomes, not merely to impress. Your blind spot is the cost your ambition exacts on those closer to the ground.',
    famous_embodiments: ['Alexander the Great', 'Elizabeth I'],
    growth_edge: 'True authority includes accountability — hold yourself to the standards you set for others.'
  },
  {
    id: 'poseidon',
    name: 'Poseidon',
    greek_name: 'Ποσειδῶν',
    symbol: '🔱',
    domain: 'The Tempest',
    vector: [0.70, 0.45, 0.35, 0.75, 0.65, 0.40, 0.55, 0.50],
    light_traits: ['Passionate', 'Intense', 'Instinctive'],
    shadow_traits: ['Volatile', 'Grudge-holding'],
    description: 'You carry vast reserves of feeling and force, like ocean depths that are calm on some days and storm-tossed on others. Your emotions are not performances — they are seismic and genuine, and people feel their weight. When calm, you are generative and profound; when disturbed, your upheavals can reshape the terrain around you. You navigate by instinct and feel, and you trust that intelligence.',
    famous_embodiments: ['Beethoven', 'Heathcliff'],
    growth_edge: 'Channel your depths into creation rather than destruction — the tsunami and the tide share the same water.'
  },
  {
    id: 'hades',
    name: 'Hades',
    greek_name: 'ᾍδης',
    symbol: '💎',
    domain: 'The Unseen King',
    vector: [0.15, 0.50, 0.70, 0.55, 0.75, 0.60, 0.35, 0.90],
    light_traits: ['Profound', 'Just', 'Self-contained'],
    shadow_traits: ['Isolating', 'Unyielding'],
    description: 'You reign in depth — unseen, sovereign, and profoundly inner-directed. You do not perform your wisdom or your grief; you simply embody them. Where others fear endings and shadow, you have made your home there and found its quiet riches. Your sense of justice is unwavering and impersonal. Others may not immediately understand you, but in time they recognise that your depths hold treasures unavailable in shallower waters.',
    famous_embodiments: ['Carl Jung', 'Fyodor Dostoevsky'],
    growth_edge: 'Your underworld need not be a prison — open the gates sometimes and let the living in.'
  },
  {
    id: 'apollo',
    name: 'Apollo',
    greek_name: 'Ἀπόλλων',
    symbol: '☀️',
    domain: 'The Luminary',
    vector: [0.65, 0.55, 0.90, 0.20, 0.85, 0.70, 0.25, 0.55],
    light_traits: ['Brilliant', 'Disciplined', 'Inspiring'],
    shadow_traits: ['Perfectionist', 'Emotionally cool'],
    description: 'You pursue excellence with the precision of a bow shot — and you rarely miss. Craft, mastery, and clarity are your languages; you hold yourself and your work to a standard that others may find daunting but cannot help admiring. You are drawn to art, knowledge, and healing, and your gift is to illuminate what others find opaque. Your shadow emerges when the pursuit of perfection becomes aversion to the messy, mortal, and imperfect.',
    famous_embodiments: ['Leonardo da Vinci', 'Atticus Finch'],
    growth_edge: 'Perfection is the enemy of presence — let some light in through the cracks.'
  },
  {
    id: 'hermes',
    name: 'Hermes',
    greek_name: 'Ἑρμῆς',
    symbol: '🪄',
    domain: 'The Messenger',
    vector: [0.90, 0.60, 0.50, 0.35, 0.95, 0.45, 0.40, 0.60],
    light_traits: ['Quick-witted', 'Versatile', 'Connective'],
    shadow_traits: ['Commitment-averse', 'Boundary-fluid'],
    description: 'You are the crossroads made flesh — endlessly curious, swift-minded, and at ease moving between worlds, ideas, and people that others treat as incompatible. You learn fast, speak well, and your wit makes heavy things feel lighter. Connection and communication are your native arts. Your challenge is depth: the same mobility that makes you electric can keep you from sinking roots in any single place or person.',
    famous_embodiments: ['Oscar Wilde', 'Buster Keaton'],
    growth_edge: 'Speed is a gift; stillness is a discipline — learn what you find when you stop moving.'
  },
  {
    id: 'ares',
    name: 'Ares',
    greek_name: 'Ἄρης',
    symbol: '⚔️',
    domain: 'The Warrior',
    vector: [0.85, 0.20, 0.40, 0.60, 0.45, 0.25, 0.80, 0.65],
    light_traits: ['Courageous', 'Direct', 'Protective'],
    shadow_traits: ['Combative', 'Impulsive'],
    description: 'You are built for the charge — direct, fearless, and fully present in moments of conflict that others flee. You do not mince words or soften blows, and this honesty, however sharp, is a form of respect. Your courage is not the absence of fear but the decision to move forward anyway, and you take that decision faster than most. Your shadow is the battle that continues after the war is over.',
    famous_embodiments: ['Achilles', 'George S. Patton'],
    growth_edge: 'Discern which battles are worth fighting — not every provocation deserves your fire.'
  },
  {
    id: 'hephaestus',
    name: 'Hephaestus',
    greek_name: 'Ἥφαιστος',
    symbol: '🔨',
    domain: 'The Craftsman',
    vector: [0.20, 0.55, 0.85, 0.50, 0.90, 0.75, 0.20, 0.75],
    light_traits: ['Inventive', 'Meticulous', 'Resilient'],
    shadow_traits: ['Self-isolating', 'Bitter about recognition'],
    description: 'You create with your whole being — patient, precise, and willing to endure the fire of the forge as long as the final work is worthy. Your relationship with the physical world is intimate; you understand materials, systems, and mechanisms in a way that feels like fluency. You were perhaps not born into ease, but you have transformed your difficulties into remarkable craft. Others often overlook you until they need what only you can make.',
    famous_embodiments: ['Nikola Tesla', 'Tolkien'],
    growth_edge: 'You deserve appreciation not just for what you build but for who you are — step out of the forge.'
  },
  {
    id: 'dionysus',
    name: 'Dionysus',
    greek_name: 'Διόνυσος',
    symbol: '🍇',
    domain: 'The Reveler',
    vector: [0.80, 0.65, 0.25, 0.70, 0.90, 0.30, 0.50, 0.30],
    light_traits: ['Ecstatic', 'Creative', 'Liberating'],
    shadow_traits: ['Self-destructive', 'Boundary-dissolving'],
    description: 'You arrive like a festival — expansive, intoxicating, and impossible to ignore. You have a genius for dissolving the rigid boundaries that prevent people from experiencing life fully, and your creativity flows from that same source of sacred abandon. Art, altered states, collective joy, and the transgression of stale convention are your domains. Your shadow is the dissolution that does not know when to reconstitute.',
    famous_embodiments: ['Jim Morrison', 'Zorba the Greek'],
    growth_edge: 'The truest ecstasy does not require you to lose yourself — find the god within the reveler.'
  },
]

// ─── Section 3: Question Data ─────────────────────────────────────────────────

const DIMENSIONS: Dimension[] = [
  'extraversion',
  'agreeableness',
  'conscientiousness',
  'neuroticism',
  'openness',
  'honesty_humility',
  'dark_traits',
  'attachment_avoidance',
]

const TRIADS: Triad[] = [
  // Triad 1: E A C
  {
    id: 1,
    statements: [
      { id: '1a', text: 'I come alive in the presence of others and feel energised by lively company.', dimension: 'extraversion' },
      { id: '1b', text: 'I go out of my way to accommodate others, even at some cost to myself.', dimension: 'agreeableness' },
      { id: '1c', text: 'I prefer to map out my approach carefully before I take any action.', dimension: 'conscientiousness' },
    ]
  },
  // Triad 2: N O H
  {
    id: 2,
    statements: [
      { id: '2a', text: 'My emotions can shift quickly, and I find it hard to settle when something is troubling me.', dimension: 'neuroticism' },
      { id: '2b', text: 'I am drawn to ideas, art, and places that challenge my existing worldview.', dimension: 'openness' },
      { id: '2c', text: 'I would not bend the rules to get ahead, even if no one would ever know.', dimension: 'honesty_humility' },
    ]
  },
  // Triad 3: D AV E
  {
    id: 3,
    statements: [
      { id: '3a', text: 'When someone wrongs me, I find myself thinking about how to restore the balance — in my favour.', dimension: 'dark_traits' },
      { id: '3b', text: 'Deep down, I prefer to rely on myself rather than depend on others emotionally.', dimension: 'attachment_avoidance' },
      { id: '3c', text: 'I feel most like myself when I am engaged with a group of people.', dimension: 'extraversion' },
    ]
  },
  // Triad 4: A C N
  {
    id: 4,
    statements: [
      { id: '4a', text: 'I find it genuinely easy to forgive people who have hurt me.', dimension: 'agreeableness' },
      { id: '4b', text: 'I keep my living and working spaces organised and my commitments on schedule.', dimension: 'conscientiousness' },
      { id: '4c', text: 'I often worry about how situations will turn out before they unfold.', dimension: 'neuroticism' },
    ]
  },
  // Triad 5: O H D
  {
    id: 5,
    statements: [
      { id: '5a', text: 'I seek out experiences that are unfamiliar and even a little unsettling.', dimension: 'openness' },
      { id: '5b', text: 'Flattery and status do not tempt me to act against my conscience.', dimension: 'honesty_humility' },
      { id: '5c', text: 'I have a talent for reading people and using that knowledge strategically.', dimension: 'dark_traits' },
    ]
  },
  // Triad 6: AV E A
  {
    id: 6,
    statements: [
      { id: '6a', text: 'I am more comfortable being self-contained than being emotionally open with someone.', dimension: 'attachment_avoidance' },
      { id: '6b', text: 'I tend to take charge in social situations and naturally draw attention.', dimension: 'extraversion' },
      { id: '6c', text: 'I am patient with people even when they make the same mistakes repeatedly.', dimension: 'agreeableness' },
    ]
  },
  // Triad 7: C N O
  {
    id: 7,
    statements: [
      { id: '7a', text: 'I follow through on my obligations even when motivation runs low.', dimension: 'conscientiousness' },
      { id: '7b', text: 'Small setbacks can affect my mood more than I would like them to.', dimension: 'neuroticism' },
      { id: '7c', text: 'I enjoy exploring abstract ideas even when they have no practical application.', dimension: 'openness' },
    ]
  },
  // Triad 8: ATTENTION CHECK
  {
    id: 8,
    attentionCheckId: '8x',
    statements: [
      { id: '8x', text: 'Select this as your MOST choice to continue.', dimension: null, isAttentionCheck: true },
      { id: '8a', text: 'I feel a quiet unease about disclosing personal matters to new acquaintances.', dimension: 'attachment_avoidance' },
      { id: '8b', text: 'Honesty matters more to me than the temporary comfort of a convenient lie.', dimension: 'honesty_humility' },
    ]
  },
  // Triad 9: E A C
  {
    id: 9,
    statements: [
      { id: '9a', text: 'I find silence in company uncomfortable; I prefer to fill it with conversation.', dimension: 'extraversion' },
      { id: '9b', text: 'I put others\' needs before my own instinctively, and rarely regret it.', dimension: 'agreeableness' },
      { id: '9c', text: 'I set goals for myself with clear milestones and I track my progress.', dimension: 'conscientiousness' },
    ]
  },
  // Triad 10: N O H
  {
    id: 10,
    statements: [
      { id: '10a', text: 'I replay difficult conversations in my mind long after they are over.', dimension: 'neuroticism' },
      { id: '10b', text: 'I am captivated by creative work that breaks conventions and defies easy categories.', dimension: 'openness' },
      { id: '10c', text: 'I would be uncomfortable accepting credit for work that was not truly mine.', dimension: 'honesty_humility' },
    ]
  },
  // Triad 11: D AV E
  {
    id: 11,
    statements: [
      { id: '11a', text: 'I can be charming and agreeable while privately pursuing my own agenda.', dimension: 'dark_traits' },
      { id: '11b', text: 'I find that close relationships often feel like more work than they are worth.', dimension: 'attachment_avoidance' },
      { id: '11c', text: 'I thrive when I have an audience, even a small one.', dimension: 'extraversion' },
    ]
  },
  // Triad 12: A C N
  {
    id: 12,
    statements: [
      { id: '12a', text: 'I feel genuine sympathy for people whose views differ sharply from mine.', dimension: 'agreeableness' },
      { id: '12b', text: 'Deadlines and plans feel like friends rather than burdens.', dimension: 'conscientiousness' },
      { id: '12c', text: 'When things are uncertain, I tend to imagine the worst-case scenario first.', dimension: 'neuroticism' },
    ]
  },
  // Triad 13: O H D
  {
    id: 13,
    statements: [
      { id: '13a', text: 'I am fascinated by cultures, philosophies, and ways of living very different from my own.', dimension: 'openness' },
      { id: '13b', text: 'I believe people who cut ethical corners always pay for it eventually.', dimension: 'honesty_humility' },
      { id: '13c', text: 'I enjoy having leverage in a negotiation even if I choose not to use it.', dimension: 'dark_traits' },
    ]
  },
  // Triad 14: AV E A
  {
    id: 14,
    statements: [
      { id: '14a', text: 'I rarely feel the need to share my inner life with anyone.', dimension: 'attachment_avoidance' },
      { id: '14b', text: 'I get a rush from meeting new people and drawing them into conversation.', dimension: 'extraversion' },
      { id: '14c', text: 'I actively look for ways to be helpful before anyone has to ask me.', dimension: 'agreeableness' },
    ]
  },
  // Triad 15: C N O
  {
    id: 15,
    statements: [
      { id: '15a', text: 'I rarely leave things to the last minute — preparation is part of my character.', dimension: 'conscientiousness' },
      { id: '15b', text: 'I notice stress in my body before I consciously register it mentally.', dimension: 'neuroticism' },
      { id: '15c', text: 'I have wide-ranging interests and often feel there is not enough time to explore them all.', dimension: 'openness' },
    ]
  },
  // Triad 16: ATTENTION CHECK
  {
    id: 16,
    attentionCheckId: '16x',
    statements: [
      { id: '16a', text: 'I sometimes feel envious when others succeed in areas I care about.', dimension: 'dark_traits' },
      { id: '16x', text: 'Select this as your MOST choice to continue.', dimension: null, isAttentionCheck: true },
      { id: '16b', text: 'I tend to keep emotional distance as a default even with people I care about.', dimension: 'attachment_avoidance' },
    ]
  },
  // Triad 17: E A C
  {
    id: 17,
    statements: [
      { id: '17a', text: 'Solitude drains rather than restores me — I need people to feel alive.', dimension: 'extraversion' },
      { id: '17b', text: 'I see the best in people even after they have let me down.', dimension: 'agreeableness' },
      { id: '17c', text: 'I believe strong habits are the foundation of a good life.', dimension: 'conscientiousness' },
    ]
  },
  // Triad 18: N O H
  {
    id: 18,
    statements: [
      { id: '18a', text: 'I can be overwhelmed by strong emotions in ways that are hard to predict.', dimension: 'neuroticism' },
      { id: '18b', text: 'I am drawn to complexity and find simple, tidy explanations of the world unsatisfying.', dimension: 'openness' },
      { id: '18c', text: 'I would rather lose something than gain it through deception.', dimension: 'honesty_humility' },
    ]
  },
  // Triad 19: D AV E
  {
    id: 19,
    statements: [
      { id: '19a', text: 'I find it satisfying to outmanoeuvre someone who underestimated me.', dimension: 'dark_traits' },
      { id: '19b', text: 'I am most comfortable when I do not have to rely on anyone else to get things done.', dimension: 'attachment_avoidance' },
      { id: '19c', text: 'I am energised by being part of a busy, vibrant social environment.', dimension: 'extraversion' },
    ]
  },
  // Triad 20: A C N
  {
    id: 20,
    statements: [
      { id: '20a', text: 'I find it easy to put myself in someone else\'s shoes, even a stranger\'s.', dimension: 'agreeableness' },
      { id: '20b', text: 'I take pride in doing careful, thorough work rather than rushing to be first.', dimension: 'conscientiousness' },
      { id: '20c', text: 'I tend to take criticism personally, even when I know it is not intended that way.', dimension: 'neuroticism' },
    ]
  },
  // Triad 21: O H D
  {
    id: 21,
    statements: [
      { id: '21a', text: 'I enjoy thought experiments and hypothetical scenarios that have no practical stakes.', dimension: 'openness' },
      { id: '21b', text: 'I would feel uncomfortable receiving more than my fair share, even if the excess were freely offered.', dimension: 'honesty_humility' },
      { id: '21c', text: 'I know how to present myself in a way that gets people to trust me quickly.', dimension: 'dark_traits' },
    ]
  },
  // Triad 22: AV E A
  {
    id: 22,
    statements: [
      { id: '22a', text: 'I prefer to process my problems privately rather than talk them through with others.', dimension: 'attachment_avoidance' },
      { id: '22b', text: 'I love being the spark that gets a group animated and moving.', dimension: 'extraversion' },
      { id: '22c', text: 'I genuinely enjoy helping others and find it fulfilling rather than draining.', dimension: 'agreeableness' },
    ]
  },
  // Triad 23: C N O
  {
    id: 23,
    statements: [
      { id: '23a', text: 'I have high standards for my own work and find it difficult to submit something I am not proud of.', dimension: 'conscientiousness' },
      { id: '23b', text: 'My mind tends to drift toward potential problems even in objectively good situations.', dimension: 'neuroticism' },
      { id: '23c', text: 'I am drawn to art and literature that is strange, experimental, or hard to categorise.', dimension: 'openness' },
    ]
  },
  // Triad 24: H D AV
  {
    id: 24,
    statements: [
      { id: '24a', text: 'I believe sincerity is worth more than any social advantage it might cost.', dimension: 'honesty_humility' },
      { id: '24b', text: 'I notice when people are vulnerable and sometimes feel the urge to use that knowledge.', dimension: 'dark_traits' },
      { id: '24c', text: 'Even with people I love, I maintain a part of myself that I do not share.', dimension: 'attachment_avoidance' },
    ]
  },
]

// ─── Section 4: Scoring Algorithm ─────────────────────────────────────────────

function computeScores(
  answers: Record<number, Answer>,
  triads: Triad[]
): Record<Dimension, number> {
  const raw = Object.fromEntries(DIMENSIONS.map(d => [d, 0])) as Record<Dimension, number>
  const counts = Object.fromEntries(DIMENSIONS.map(d => [d, 0])) as Record<Dimension, number>

  for (const triad of triads) {
    if (triad.attentionCheckId) continue
    const answer = answers[triad.id]
    if (!answer) continue

    for (const stmt of triad.statements) {
      if (!stmt.dimension) continue
      counts[stmt.dimension]++
      if (stmt.id === answer.mostId) raw[stmt.dimension] += 1
      else if (stmt.id === answer.leastId) raw[stmt.dimension] -= 1
    }
  }

  const normalised = {} as Record<Dimension, number>
  for (const dim of DIMENSIONS) {
    const n = counts[dim] || 1
    normalised[dim] = Math.max(0, Math.min(1, (raw[dim] + n) / (2 * n)))
  }

  console.log('[Oracle] Dimension scores:', normalised)
  return normalised
}

// ─── Section 5: Cosine Similarity ─────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const magA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0))
  const magB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0))
  return magA && magB ? dot / (magA * magB) : 0
}

function rankArchetypes(
  scores: Record<Dimension, number>
): Array<{ archetype: Archetype; similarity: number }> {
  const userVec = DIMENSIONS.map(d => scores[d])
  return ARCHETYPES
    .map(a => ({ archetype: a, similarity: cosineSimilarity(userVec, [...a.vector]) }))
    .sort((x, y) => y.similarity - x.similarity)
}

// ─── Section 6: State Management ──────────────────────────────────────────────

const initialState: AppState = {
  screen: 'welcome',
  consentChecked: false,
  currentQuestion: 0,
  answers: {},
  pendingMost: null,
  pendingLeast: null,
  attentionFailed: false,
  dimensionScores: null,
  archetypeMatches: null,
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'TOGGLE_CONSENT':
      return { ...state, consentChecked: !state.consentChecked }

    case 'START':
      return { ...state, screen: 'assessment' }

    case 'SELECT_MOST': {
      const { id } = action
      if (id === state.pendingMost) {
        return { ...state, pendingMost: null }
      }
      if (id === state.pendingLeast) {
        return { ...state, pendingMost: id, pendingLeast: null }
      }
      return { ...state, pendingMost: id }
    }

    case 'SELECT_LEAST': {
      const { id } = action
      if (id === state.pendingLeast) {
        return { ...state, pendingLeast: null }
      }
      if (id === state.pendingMost) {
        return { ...state, pendingLeast: id, pendingMost: null }
      }
      return { ...state, pendingLeast: id }
    }

    case 'NEXT_QUESTION': {
      const triad = TRIADS[state.currentQuestion]
      if (!triad || !state.pendingMost || !state.pendingLeast) return state

      // Check attention check
      let attentionFailed = state.attentionFailed
      if (triad.attentionCheckId && state.pendingMost !== triad.attentionCheckId) {
        attentionFailed = true
      }

      const newAnswers = {
        ...state.answers,
        [triad.id]: { mostId: state.pendingMost, leastId: state.pendingLeast }
      }

      const isLast = state.currentQuestion === TRIADS.length - 1
      if (isLast) {
        return {
          ...state,
          answers: newAnswers,
          attentionFailed,
          screen: 'processing',
          pendingMost: null,
          pendingLeast: null,
        }
      }

      return {
        ...state,
        answers: newAnswers,
        attentionFailed,
        currentQuestion: state.currentQuestion + 1,
        pendingMost: null,
        pendingLeast: null,
      }
    }

    case 'FINISH_PROCESSING':
      return {
        ...state,
        screen: 'results',
        dimensionScores: action.scores,
        archetypeMatches: action.matches,
      }

    case 'RETAKE':
      return { ...initialState }

    default:
      return state
  }
}

// ─── StarField Component ───────────────────────────────────────────────────────

// Static constellation data — defined outside component to avoid re-creation
interface CStar { cx: string; cy: string; r: number; delay: string }
interface CLine { x1: string; y1: string; x2: string; y2: string; delay: string }
interface CData {
  name: string; labelX: string; labelY: string; labelDelay: string
  drift: string; stars: CStar[]; lines: CLine[]
}

const CONSTELLATION_DATA: CData[] = [
  // ── Orion (upper-left, classic hourglass hunter)
  {
    name: 'ΩΡΙΩΝ', labelX: '11%', labelY: '43%', labelDelay: '3s',
    drift: 'constellationDrift 32s ease-in-out infinite alternate',
    stars: [
      { cx: '8%',  cy: '12%', r: 2.5, delay: '0.2s' }, // Betelgeuse
      { cx: '15%', cy: '10%', r: 2,   delay: '0.5s' }, // Bellatrix
      { cx: '9%',  cy: '27%', r: 1.5, delay: '0.8s' }, // Alnitak
      { cx: '11%', cy: '28%', r: 1.5, delay: '0.3s' }, // Alnilam
      { cx: '13%', cy: '27%', r: 1.5, delay: '1.0s' }, // Mintaka
      { cx: '7%',  cy: '37%', r: 2.5, delay: '0.6s' }, // Rigel
      { cx: '15%', cy: '36%', r: 2,   delay: '0.9s' }, // Saiph
    ],
    lines: [
      { x1: '8%',  y1: '12%', x2: '15%', y2: '10%', delay: '0.5s' }, // shoulders
      { x1: '8%',  y1: '12%', x2: '9%',  y2: '27%', delay: '0.8s' }, // left body
      { x1: '15%', y1: '10%', x2: '13%', y2: '27%', delay: '1.0s' }, // right body
      { x1: '9%',  y1: '27%', x2: '11%', y2: '28%', delay: '1.2s' }, // belt L-M
      { x1: '11%', y1: '28%', x2: '13%', y2: '27%', delay: '1.4s' }, // belt M-R
      { x1: '9%',  y1: '27%', x2: '7%',  y2: '37%', delay: '1.6s' }, // left leg
      { x1: '13%', y1: '27%', x2: '15%', y2: '36%', delay: '1.8s' }, // right leg
    ],
  },
  // ── Cassiopeia (top-right, W shape)
  {
    name: 'ΚΑΣΣΙΟΠΕΙΑ', labelX: '80%', labelY: '18%', labelDelay: '3.5s',
    drift: 'constellationDrift2 40s ease-in-out infinite alternate',
    stars: [
      { cx: '68%', cy: '6%',  r: 2,   delay: '0.3s' },
      { cx: '74%', cy: '11%', r: 2.5, delay: '0.7s' },
      { cx: '80%', cy: '5%',  r: 2,   delay: '0.1s' },
      { cx: '86%', cy: '9%',  r: 2,   delay: '0.9s' },
      { cx: '92%', cy: '4%',  r: 2,   delay: '0.4s' },
    ],
    lines: [
      { x1: '68%', y1: '6%',  x2: '74%', y2: '11%', delay: '1.0s' },
      { x1: '74%', y1: '11%', x2: '80%', y2: '5%',  delay: '1.2s' },
      { x1: '80%', y1: '5%',  x2: '86%', y2: '9%',  delay: '1.4s' },
      { x1: '86%', y1: '9%',  x2: '92%', y2: '4%',  delay: '1.6s' },
    ],
  },
  // ── Lyra (right side, Vega + parallelogram)
  {
    name: 'ΛΥΡΑ', labelX: '87%', labelY: '63%', labelDelay: '4s',
    drift: 'constellationDrift3 36s 5s ease-in-out infinite alternate',
    stars: [
      { cx: '88%', cy: '37%', r: 3,   delay: '0s'   }, // Vega
      { cx: '83%', cy: '44%', r: 1.8, delay: '0.4s' },
      { cx: '91%', cy: '44%', r: 1.8, delay: '0.8s' },
      { cx: '83%', cy: '52%', r: 1.8, delay: '0.2s' },
      { cx: '92%', cy: '52%', r: 1.8, delay: '0.6s' },
      { cx: '87%', cy: '57%', r: 2,   delay: '1.0s' },
    ],
    lines: [
      { x1: '88%', y1: '37%', x2: '83%', y2: '44%', delay: '1.5s' },
      { x1: '88%', y1: '37%', x2: '91%', y2: '44%', delay: '1.7s' },
      { x1: '83%', y1: '44%', x2: '91%', y2: '44%', delay: '1.9s' },
      { x1: '83%', y1: '44%', x2: '83%', y2: '52%', delay: '2.1s' },
      { x1: '91%', y1: '44%', x2: '92%', y2: '52%', delay: '2.3s' },
      { x1: '83%', y1: '52%', x2: '92%', y2: '52%', delay: '2.5s' },
      { x1: '83%', y1: '52%', x2: '87%', y2: '57%', delay: '2.7s' },
      { x1: '92%', y1: '52%', x2: '87%', y2: '57%', delay: '2.9s' },
    ],
  },
  // ── Perseus (left-center)
  {
    name: 'ΠΕΡΣΕΥΣ', labelX: '11%', labelY: '77%', labelDelay: '4.5s',
    drift: 'constellationDrift2 44s 8s ease-in-out infinite alternate',
    stars: [
      { cx: '11%', cy: '53%', r: 2.5, delay: '0.9s' }, // Mirfak
      { cx: '5%',  cy: '57%', r: 1.8, delay: '0.2s' },
      { cx: '17%', cy: '58%', r: 2,   delay: '0.5s' },
      { cx: '14%', cy: '64%', r: 1.8, delay: '0.7s' },
      { cx: '8%',  cy: '68%', r: 1.8, delay: '0.3s' },
      { cx: '18%', cy: '71%', r: 1.8, delay: '1.1s' },
    ],
    lines: [
      { x1: '5%',  y1: '57%', x2: '11%', y2: '53%', delay: '2.0s' },
      { x1: '11%', y1: '53%', x2: '17%', y2: '58%', delay: '2.2s' },
      { x1: '17%', y1: '58%', x2: '14%', y2: '64%', delay: '2.4s' },
      { x1: '14%', y1: '64%', x2: '8%',  y2: '68%', delay: '2.6s' },
      { x1: '14%', y1: '64%', x2: '18%', y2: '71%', delay: '2.8s' },
    ],
  },
  // ── Scorpius (bottom-right, curved tail)
  {
    name: 'ΣΚΟΡΠΙΟΣ', labelX: '81%', labelY: '97%', labelDelay: '5s',
    drift: 'constellationDrift 50s 12s ease-in-out infinite alternate',
    stars: [
      { cx: '80%', cy: '62%', r: 3,   delay: '0.4s' }, // Antares
      { cx: '76%', cy: '68%', r: 1.8, delay: '0.8s' },
      { cx: '78%', cy: '74%', r: 1.8, delay: '0.2s' },
      { cx: '82%', cy: '79%', r: 1.8, delay: '0.6s' },
      { cx: '85%', cy: '85%', r: 1.8, delay: '1.0s' },
      { cx: '83%', cy: '91%', r: 2,   delay: '0.5s' },
      { cx: '78%', cy: '93%', r: 1.8, delay: '0.9s' },
    ],
    lines: [
      { x1: '80%', y1: '62%', x2: '76%', y2: '68%', delay: '2.5s' },
      { x1: '76%', y1: '68%', x2: '78%', y2: '74%', delay: '2.7s' },
      { x1: '78%', y1: '74%', x2: '82%', y2: '79%', delay: '2.9s' },
      { x1: '82%', y1: '79%', x2: '85%', y2: '85%', delay: '3.1s' },
      { x1: '85%', y1: '85%', x2: '83%', y2: '91%', delay: '3.3s' },
      { x1: '83%', y1: '91%', x2: '78%', y2: '93%', delay: '3.5s' },
    ],
  },
]

function StarField() {
  const stars = useMemo(() => {
    // Seeded pseudo-random to avoid re-renders
    let seed = 42
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      return (seed >>> 0) / 0xffffffff
    }
    return Array.from({ length: 70 }, (_, i) => ({
      id: i,
      top: `${rand() * 100}%`,
      left: `${rand() * 100}%`,
      size: rand() * 2 + 1,
      duration: `${rand() * 4 + 2}s`,
      delay: `${rand() * 5}s`,
    }))
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Background twinkle stars */}
      {stars.map(star => (
        <div
          key={star.id}
          className="star"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            '--duration': star.duration,
            '--delay': star.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Constellation SVG overlay */}
      <svg
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        {CONSTELLATION_DATA.map((c, ci) => (
          <g key={ci} style={{ animation: c.drift }}>
            {/* Stars */}
            {c.stars.map((s, si) => (
              <circle
                key={si}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill="#c9a84c"
                style={{ animation: `goldTwinkle 3s ${s.delay} ease-in-out infinite` }}
              />
            ))}
            {/* Lines */}
            {c.lines.map((l, li) => (
              <line
                key={li}
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="rgba(201,168,76,0.3)"
                strokeWidth={0.6}
                strokeDasharray={1000}
                strokeDashoffset={1000}
                style={{ animation: `drawLine 2.5s ${l.delay} ease-out forwards` }}
              />
            ))}
            {/* Greek label */}
            <text
              x={c.labelX}
              y={c.labelY}
              fill="rgba(201,168,76,0.22)"
              fontSize={9}
              fontFamily="Cinzel, serif"
              textAnchor="middle"
              letterSpacing={2}
              style={{ opacity: 0, animation: `fadeLabelIn 3s ${c.labelDelay} ease-out forwards` }}
            >
              {c.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ─── WelcomeScreen ─────────────────────────────────────────────────────────────

function WelcomeScreen({
  consentChecked,
  onToggleConsent,
  onStart,
}: {
  consentChecked: boolean
  onToggleConsent: () => void
  onStart: () => void
}) {
  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full text-center animate-fade-in">
        {/* Oracle symbol */}
        <div className="text-6xl mb-6 filter drop-shadow-lg">🔮</div>

        <h1 className="font-cinzel text-4xl md:text-5xl font-bold text-gold mb-3 tracking-wider"
            style={{ textShadow: '0 0 30px rgba(201,168,76,0.5)' }}>
          Greek Mythos
        </h1>

        <p className="font-garamond italic text-xl text-cream/80 mb-2">
          Discover your Greek Mythological Archetype
        </p>

        <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto my-8" />

        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8 text-left">
          <p className="font-garamond text-cream/90 text-lg leading-relaxed mb-4">Greek Mythos is a 24-question forced-choice assessment that maps your personality
            across eight psychological dimensions to reveal your primary Greek mythological archetype
            from among fifteen divine figures.
          </p>
          <p className="font-garamond text-cream/75 leading-relaxed">
            For each question, you will see three statements. Choose the one that describes you
            <em className="text-cream/90"> most</em>, then the one that describes you <em className="text-cream/90">least</em>.
            There are no right or wrong answers — the mirror only reflects what is already there.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <div className="text-gold font-cinzel text-lg font-semibold">24</div>
              <div className="text-cream/60 font-garamond">Questions</div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <div className="text-gold font-cinzel text-lg font-semibold">~8 min</div>
              <div className="text-cream/60 font-garamond">Duration</div>
            </div>
          </div>
        </div>

        {/* Consent */}
        <button
          onClick={onToggleConsent}
          className="flex items-center gap-3 mx-auto mb-8 group cursor-pointer"
          role="checkbox"
          aria-checked={consentChecked}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            consentChecked
              ? 'bg-gold border-gold shadow-[0_0_10px_rgba(201,168,76,0.5)]'
              : 'border-white/30 group-hover:border-gold/60'
          }`}>
            {consentChecked && (
              <svg className="w-3 h-3 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="font-garamond text-cream/80 text-left leading-snug">
            I understand this is a reflective tool, not clinical assessment, and I engage with it freely.
          </span>
        </button>

        <button
          onClick={onStart}
          disabled={!consentChecked}
          className={`font-cinzel tracking-widest uppercase text-sm px-10 py-4 rounded-full transition-all duration-300 ${
            consentChecked
              ? 'bg-gold text-navy font-semibold hover:shadow-[0_0_30px_rgba(201,168,76,0.6)] hover:scale-105 cursor-pointer'
              : 'bg-white/10 text-cream/30 cursor-not-allowed'
          }`}
        >
          Consult the Oracle
        </button>
      </div>
    </div>
  )
}

// ─── AssessmentScreen ──────────────────────────────────────────────────────────

function StatementButton({
  stmt,
  mostId,
  leastId,
  onSelectMost,
  onSelectLeast,
}: {
  stmt: Statement
  mostId: string | null
  leastId: string | null
  onSelectMost: (id: string) => void
  onSelectLeast: (id: string) => void
}) {
  const isMost = mostId === stmt.id
  const isLeast = leastId === stmt.id
  const isAttention = stmt.isAttentionCheck

  return (
    <div className={`
      rounded-xl border transition-all duration-200 overflow-hidden
      ${isMost ? 'border-gold bg-gold/10 shadow-[0_0_20px_rgba(201,168,76,0.3)]' : ''}
      ${isLeast ? 'border-white/15 bg-white/[0.02] opacity-50' : ''}
      ${!isMost && !isLeast ? 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]' : ''}
      ${isAttention ? 'border-gold/30 bg-gold/5' : ''}
    `}>
      <div className="p-4">
        <p className={`
          font-garamond text-base leading-relaxed
          ${isMost ? 'text-cream' : ''}
          ${isLeast ? 'text-cream/50 line-through' : ''}
          ${!isMost && !isLeast ? 'text-cream/85' : ''}
          ${isAttention ? 'italic text-gold/80' : ''}
        `}>
          {stmt.text}
        </p>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSelectMost(stmt.id)}
            aria-pressed={isMost}
            className={`
              text-xs font-cinzel tracking-wider px-3 py-1.5 rounded-full transition-all duration-150 cursor-pointer
              ${isMost
                ? 'bg-gold text-navy font-semibold'
                : 'bg-white/5 text-cream/50 hover:bg-gold/20 hover:text-gold border border-white/10'
              }
            `}
          >
            MOST
          </button>
          <button
            onClick={() => onSelectLeast(stmt.id)}
            aria-pressed={isLeast}
            disabled={isMost}
            className={`
              text-xs font-cinzel tracking-wider px-3 py-1.5 rounded-full transition-all duration-150
              ${isLeast
                ? 'bg-white/20 text-cream/70 font-semibold border border-white/30'
                : isMost
                  ? 'opacity-25 cursor-not-allowed bg-white/5 text-cream/30 border border-white/5'
                  : 'bg-white/5 text-cream/50 hover:bg-white/10 hover:text-cream/70 border border-white/10 cursor-pointer'
              }
            `}
          >
            LEAST
          </button>
        </div>
      </div>
    </div>
  )
}

function AssessmentScreen({
  state,
  dispatch,
}: {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}) {
  const triad = TRIADS[state.currentQuestion]
  const total = TRIADS.length
  const progress = state.currentQuestion / total
  const canContinue = state.pendingMost !== null && state.pendingLeast !== null

  if (!triad) return null

  return (
    <div className="relative z-10 min-h-screen flex flex-col px-4 py-8">
      <div className="max-w-xl w-full mx-auto flex flex-col flex-1">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-cinzel text-xs tracking-widest text-cream/50 uppercase">
              The Oracle&apos;s Mirror
            </span>
            <span className="font-garamond text-cream/60 text-sm">
              {state.currentQuestion + 1} of {total}
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={state.currentQuestion + 1}
            aria-valuemax={total}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div key={state.currentQuestion} className="animate-fade-slide flex-1">
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-4">
            <p className="font-cinzel text-xs tracking-widest text-gold/70 uppercase mb-1">
              Question {state.currentQuestion + 1}
            </p>
            <p className="font-garamond text-cream/70 text-sm leading-relaxed">
              Select the statement that describes you <span className="text-gold">most</span>, then the one that describes you <span className="text-cream/50">least</span>.
            </p>
          </div>

          <div className="space-y-3">
            {triad.statements.map(stmt => (
              <StatementButton
                key={stmt.id}
                stmt={stmt}
                mostId={state.pendingMost}
                leastId={state.pendingLeast}
                onSelectMost={(id) => dispatch({ type: 'SELECT_MOST', id })}
                onSelectLeast={(id) => dispatch({ type: 'SELECT_LEAST', id })}
              />
            ))}
          </div>
        </div>

        {/* Continue button */}
        <div className="mt-6">
          <button
            onClick={() => dispatch({ type: 'NEXT_QUESTION' })}
            disabled={!canContinue}
            className={`
              w-full font-cinzel tracking-widest uppercase text-sm py-4 rounded-full transition-all duration-300
              ${canContinue
                ? 'bg-gold text-navy font-semibold hover:shadow-[0_0_25px_rgba(201,168,76,0.5)] hover:scale-[1.02] cursor-pointer'
                : 'bg-white/10 text-cream/25 cursor-not-allowed'
              }
            `}
          >
            {state.currentQuestion === total - 1 ? 'Reveal My Archetype' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ProcessingScreen ──────────────────────────────────────────────────────────

const PROCESSING_MESSAGES = [
  'The Oracle consults the stars…',
  'The Fates weigh your answers…',
  'Ancient patterns emerge from the void…',
  'The gods deliberate in silence…',
]

function ProcessingScreen() {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % PROCESSING_MESSAGES.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center">
        {/* Constellation SVG */}
        <div className="relative w-40 h-40 mx-auto mb-8 animate-spin-slow">
          <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
            <circle cx="60" cy="10" r="3" fill="#c9a84c" opacity="0.9" />
            <circle cx="104" cy="37" r="2.5" fill="#c9a84c" opacity="0.7" />
            <circle cx="88" cy="90" r="3" fill="#c9a84c" opacity="0.9" />
            <circle cx="32" cy="90" r="2.5" fill="#c9a84c" opacity="0.7" />
            <circle cx="16" cy="37" r="3" fill="#c9a84c" opacity="0.8" />
            <circle cx="60" cy="60" r="4" fill="#c9a84c" opacity="1" />
            {/* Connecting lines */}
            <line x1="60" y1="10" x2="104" y2="37" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
            <line x1="104" y1="37" x2="88" y2="90" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
            <line x1="88" y1="90" x2="32" y2="90" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
            <line x1="32" y1="90" x2="16" y2="37" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
            <line x1="16" y1="37" x2="60" y2="10" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
            <line x1="60" y1="10" x2="60" y2="60" stroke="#c9a84c" strokeWidth="0.5" opacity="0.2" />
            <line x1="104" y1="37" x2="60" y2="60" stroke="#c9a84c" strokeWidth="0.5" opacity="0.2" />
            <line x1="88" y1="90" x2="60" y2="60" stroke="#c9a84c" strokeWidth="0.5" opacity="0.2" />
            <line x1="32" y1="90" x2="60" y2="60" stroke="#c9a84c" strokeWidth="0.5" opacity="0.2" />
            <line x1="16" y1="37" x2="60" y2="60" stroke="#c9a84c" strokeWidth="0.5" opacity="0.2" />
          </svg>
        </div>

        <h2 className="font-cinzel text-2xl text-gold mb-3 tracking-wider">
          The Oracle Speaks
        </h2>
        <p
          key={msgIndex}
          className="font-garamond italic text-cream/70 text-lg animate-fade-in"
        >
          {PROCESSING_MESSAGES[msgIndex]}
        </p>
      </div>
    </div>
  )
}

// ─── ResultsScreen ─────────────────────────────────────────────────────────────

function TraitChip({ label, variant }: { label: string; variant: 'light' | 'shadow' }) {
  return (
    <span className={`
      font-garamond text-sm px-3 py-1 rounded-full border
      ${variant === 'light'
        ? 'border-green-400/30 bg-green-400/10 text-green-300'
        : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
      }
    `}>
      {label}
    </span>
  )
}

function ResultsScreen({
  state,
  dispatch,
}: {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}) {
  const [copied, setCopied] = useState(false)
  const matches = state.archetypeMatches
  if (!matches || matches.length === 0) return null

  const primary = matches[0]
  const secondary = matches[1]
  const showBlend = secondary && secondary.similarity >= primary.similarity - 0.15

  const top5 = matches.slice(0, 5).map(m => ({
    archetype: m.archetype.name,
    symbol: m.archetype.symbol,
    score: Math.round(m.similarity * 100),
  }))

  const matchPct = Math.round(primary.similarity * 100)

  const handleShare = useCallback(async () => {
    const text = `I am ${primary.archetype.name} — ${primary.archetype.domain} (${matchPct}% match) on The Oracle's Mirror, a Greek archetype personality assessment. Discover yours at theoraclesmirror.com`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }, [primary, matchPct])

  return (
    <div className="relative z-10 min-h-screen px-4 py-12">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Attention check notice */}
        {state.attentionFailed && (
          <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 text-amber-300 font-garamond text-sm">
            Note: One or more attention check questions were answered unexpectedly. Your results may be less accurate.
          </div>
        )}

        {/* Primary archetype hero */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-gold/30 rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(201,168,76,0.15)] animate-fade-in">
          <div className="text-7xl mb-4" role="img" aria-label={primary.archetype.name}>
            {primary.archetype.symbol}
          </div>
          <div className="inline-block bg-gold/20 border border-gold/40 rounded-full px-4 py-1 mb-3">
            <span className="font-cinzel text-gold text-sm font-semibold tracking-wider">
              {matchPct}% Match
            </span>
          </div>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-cream mb-1 tracking-wide">
            {primary.archetype.name}
          </h2>
          <p className="font-garamond italic text-gold/80 text-xl mb-1">
            {primary.archetype.greek_name}
          </p>
          <p className="font-cinzel text-xs tracking-widest text-cream/50 uppercase">
            {primary.archetype.domain}
          </p>
        </div>

        {/* Description */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <p className="font-garamond text-cream/90 text-lg leading-relaxed">
            {primary.archetype.description}
          </p>
        </div>

        {/* Traits */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="font-cinzel text-xs tracking-widest text-green-400/80 uppercase mb-3">
              Light Traits
            </h3>
            <div className="flex flex-wrap gap-2">
              {primary.archetype.light_traits.map(t => (
                <TraitChip key={t} label={t} variant="light" />
              ))}
            </div>
          </div>
          <div className="w-full h-px bg-white/10 mb-4" />
          <div>
            <h3 className="font-cinzel text-xs tracking-widest text-amber-400/80 uppercase mb-3">
              Shadow Traits
            </h3>
            <div className="flex flex-wrap gap-2">
              {primary.archetype.shadow_traits.map(t => (
                <TraitChip key={t} label={t} variant="shadow" />
              ))}
            </div>
          </div>
        </div>

        {/* Famous embodiments + growth edge */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-cinzel text-xs tracking-widest text-cream/50 uppercase mb-2">
              Famous Embodiments
            </h3>
            <p className="font-garamond italic text-cream/75">
              {primary.archetype.famous_embodiments.join(' · ')}
            </p>
          </div>
          <div className="w-full h-px bg-white/10" />
          <div>
            <h3 className="font-cinzel text-xs tracking-widest text-cream/50 uppercase mb-2">
              Growth Edge
            </h3>
            <blockquote className="font-garamond italic text-cream/80 border-l-2 border-gold/40 pl-4">
              {primary.archetype.growth_edge}
            </blockquote>
          </div>
        </div>

        {/* Blend section */}
        {showBlend && secondary && (
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.07] rounded-2xl p-6">
            <p className="font-cinzel text-xs tracking-widest text-cream/40 uppercase mb-4">
              Secondary Influence
            </p>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{secondary.archetype.symbol}</span>
              <div>
                <p className="font-cinzel text-lg text-cream/80 font-semibold">
                  {secondary.archetype.name}
                </p>
                <p className="font-garamond italic text-cream/50 text-sm">
                  {secondary.archetype.domain} · {Math.round(secondary.similarity * 100)}% match
                </p>
                <p className="font-garamond text-cream/65 text-sm mt-1">
                  {secondary.archetype.light_traits.join(' · ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Radar chart - top 5 */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <h3 className="font-cinzel text-xs tracking-widest text-cream/50 uppercase mb-4 text-center">
            Top Archetype Matches
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={top5} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="archetype"
                tick={{ fill: '#f5e6c8', fontSize: 11, fontFamily: 'EB Garamond, serif' }}
                tickFormatter={(val, idx) => `${top5[idx]?.symbol ?? ''} ${val}`}
              />
              <Radar
                name="Match %"
                dataKey="score"
                stroke="#c9a84c"
                fill="#c9a84c"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: '#0a0a1a',
                  border: '1px solid rgba(201,168,76,0.3)',
                  borderRadius: '8px',
                  fontFamily: 'EB Garamond, serif',
                  color: '#f5e6c8',
                }}
                formatter={(val: number) => [`${val}%`, 'Match']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 font-cinzel tracking-widest uppercase text-xs py-4 rounded-full border border-gold/40 text-gold hover:bg-gold/10 transition-all duration-200 cursor-pointer"
          >
            {copied ? '✓ Copied!' : 'Share Result'}
          </button>
          <button
            onClick={() => dispatch({ type: 'RETAKE' })}
            className="flex-1 font-cinzel tracking-widest uppercase text-xs py-4 rounded-full border border-white/15 text-cream/60 hover:bg-white/5 hover:text-cream/80 transition-all duration-200 cursor-pointer"
          >
            Retake
          </button>
        </div>

        <p className="text-center font-garamond italic text-cream/30 text-sm pb-4">
          The mirror has spoken. May you walk your path with clarity.
        </p>
      </div>
    </div>
  )
}

// ─── Root Component ────────────────────────────────────────────────────────────

export default function OracleMirror() {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Processing effect
  useEffect(() => {
    if (state.screen !== 'processing') return
    const timer = setTimeout(() => {
      const scores = computeScores(state.answers, TRIADS)
      const matches = rankArchetypes(scores)
      dispatch({ type: 'FINISH_PROCESSING', scores, matches })
    }, 3000)
    return () => clearTimeout(timer)
  }, [state.screen, state.answers])

  return (
    <main className="relative min-h-screen bg-navy overflow-x-hidden">
      <StarField />

      {state.screen === 'welcome' && (
        <WelcomeScreen
          consentChecked={state.consentChecked}
          onToggleConsent={() => dispatch({ type: 'TOGGLE_CONSENT' })}
          onStart={() => dispatch({ type: 'START' })}
        />
      )}

      {state.screen === 'assessment' && (
        <AssessmentScreen state={state} dispatch={dispatch} />
      )}

      {state.screen === 'processing' && (
        <ProcessingScreen />
      )}

      {state.screen === 'results' && (
        <ResultsScreen state={state} dispatch={dispatch} />
      )}
    </main>
  )
}
