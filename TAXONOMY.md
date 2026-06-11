# BSDetective — CANONICAL DETECTION TAXONOMY
# ═══════════════════════════════════════════════════════════════
**VERSION: 2.0.0 | DATE: 2026-03-22 | PATTERNS: 195+ to VERSION: 2.1.0 | DATE: 2026-06-02 | PATTERNS: 264**
# ═══════════════════════════════════════════════════════════════
#
# THIS IS THE SINGLE SOURCE OF TRUTH.
# The Edge Function prompt is GENERATED FROM this document.
# NEVER rebuild this file. ONLY append to it.
# Each technique has a permanent ID (e.g., F01, M15, B07).
# IDs are never reused, even if a technique is deprecated.
#
# LAYER RULES:
# Layer 1 (Academic) — technique names used directly, citable
# Layer 2 (US Intelligence/Military) — plain-English detection heuristics only
# Layer 3 (Soviet/KGB) — plain-English detection heuristics only
# Layer 4 (Practitioner) — informs detection logic, NEVER surfaced
# Layer 5 (BSDetective-owned) — names users see in results
#
# ═══════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════
# SECTION A: LOGICAL FALLACIES
# ═══════════════════════════════════════════════════════════════

## A1: FORMAL FALLACIES

F01 | Affirming the Consequent
"If A then B, B is true, therefore A" — reversed conditional logic.

F02 | Denying the Antecedent
"If A then B, not A, therefore not B" — invalid negation.

F03 | False Dilemma / False Dichotomy
Only two options presented when more exist. Enhanced by Layer 2: "Lesser Evil Frame" — both options serve the persuader, genuine alternatives excluded from choice architecture.

F04 | Circular Reasoning / Begging the Question
Conclusion assumed in premise. Evidence is the claim restated.

F05 | Non Sequitur
Conclusion doesn't follow from premises.

F06 | Existential Fallacy
Assuming existence of something without evidence.

F07 | Illicit Major/Minor
Invalid syllogism structure — term distributed in conclusion but not in premise.

F08 | Undistributed Middle
Faulty categorical reasoning — middle term not distributed in either premise.


## A2: AD HOMINEM VARIANTS

F09 | Direct Ad Hominem
Attacking character instead of argument. Enhanced by Layer 3: "The Credibility Kill" — systematic destruction of the messenger to neutralise the message. Detection: personal history weaponised, guilt by association used to dismiss rather than engage.

F10 | Circumstantial Ad Hominem
Attacking motive rather than argument. "You only say that because..."

F11 | Tu Quoque / Whataboutism
"You do it too" — deflecting by pointing to opponent's behaviour. Detection: criticism redirected to opponent's flaws, moral equivalence as escape hatch.

F12 | Guilt by Association
Connecting to disliked group/person to discredit.

F13 | Poisoning the Well
Pre-emptive character attack before argument is even heard. Enhanced by Layer 3: "The Mirror Narrative" — accusing opponent of exactly what you are doing. Detection: pre-emptive accusation, "they're the real manipulators" — said by the manipulator.


## A3: FALLACIES OF RELEVANCE

F14 | Strawman
Misrepresenting opponent's argument to attack a weaker version. Detection: extreme version of moderate position attributed to other side.

F15 | Red Herring
Introducing irrelevant topic to divert attention.

F16 | Appeal to Emotion
Using fear, pity, anger, flattery, or spite instead of evidence. Detection: emotional language where evidence should be.

F17 | Appeal to Force / Ad Baculum
Threat-based persuasion. "Nice business you have there..."

F18 | Appeal to Consequences
Judging truth by desirability of outcomes rather than evidence.


## A4: FALLACIES OF AUTHORITY

F19 | Appeal to Authority
Citing non-experts or experts outside their field. Enhanced by Layer 2: "Testimonial Shield" — credibility borrowed from unrelated authority. Celebrity endorsing science. Military figure endorsing policy.

F20 | Appeal to False Authority
Fake or inflated credentials. Enhanced by Layer 4: "The Authority Stack" — layering credentials + institution + statistics + testimonial + urgency simultaneously. Detection: multiple authority signals in rapid succession suppressing questioning.

F21 | Appeal to Anonymous Authority
"Experts say", "studies show", "sources indicate" — no named source.

F22 | Appeal to Ancient Wisdom
"Known for centuries" — age as evidence of truth.

F23 | Ipse Dixit
"Because I said so" — authority without evidence.


## A5: FALLACIES OF POPULARITY

F24 | Bandwagon / Ad Populum
"Everyone believes" — numbers as evidence of truth. Detection: statistics without methodology, "millions already..."

F25 | Appeal to Tradition
"Always done this way" — tradition as evidence.

F26 | Appeal to Novelty
"New = better" — novelty as evidence. Enhanced by Layer 4: "The Novelty Hook" — surprising information triggers dopamine, reduces critical evaluation. Detection: headlines emphasising shock/revelation, "you won't believe..."

F27 | Appeal to Nature
"Natural = good" — naturalness as evidence of safety/quality.

F28 | Snob Appeal
"Elite people choose this" — status as evidence.

F29 | Common Practice
"Everyone does it" — prevalence as justification.


## A6: CAUSAL FALLACIES

F30 | Post Hoc Ergo Propter Hoc
Sequence treated as causation. "After X, Y happened, therefore X caused Y."

F31 | Cum Hoc Ergo Propter Hoc
Correlation treated as causation.

F32 | Single Cause Fallacy
Oversimplifying causation to one factor when multiple exist.

F33 | Wrong Direction
Reversing cause and effect.

F34 | Regression Fallacy
Ignoring statistical regression to the mean.


## A7: FALLACIES OF GENERALIZATION

F35 | Hasty Generalization
Small sample extrapolated to broad claim.

F36 | Sweeping Generalization
Ignoring legitimate exceptions.

F37 | Cherry Picking
Selecting only supporting evidence, ignoring contradictory data.

F38 | Survivorship Bias
Only visible successes counted, failures invisible.

F39 | Anecdotal Fallacy
Personal story used as proof of general trend.

F40 | Spotlight Fallacy
Media coverage treated as indicator of frequency.


## A8: FALLACIES OF AMBIGUITY

F41 | Equivocation
Same word used with different meanings to create false connection.

F42 | Amphiboly
Grammatical ambiguity exploited.

F43 | Accent Fallacy
Emphasis changes meaning.

F44 | Composition
What's true of parts must be true of whole.

F45 | Division
What's true of whole must be true of parts.


## A9: OTHER INFORMAL FALLACIES

F46 | Slippery Slope
Claiming inevitable extreme consequences from moderate action.

F47 | Moving Goalposts
Changing criteria after they've been met. "Yes but now you also need to..."

F48 | No True Scotsman
Redefining group to exclude counterexamples. "No REAL expert would..."

F49 | False Equivalence
Unequal things treated as comparable. Detection: "both sides" framing giving fringe positions equal weight.

F50 | Genetic Fallacy
Judging argument by its origin rather than its merit.

F51 | Loaded Question
Question with built-in assumption. "When did you stop...?"

F52 | Complex Question
Multiple questions disguised as one, forcing acceptance of hidden premise.

F53 | Middle Ground Fallacy
Assuming compromise position must be correct.

F54 | Argument from Ignorance
Unknown treated as evidence of truth or falsehood. "You can't prove it's NOT true."

F55 | Personal Incredulity
"I can't understand it, therefore it must be false."

F56 | Nirvana Fallacy
Rejecting something for not being perfect.

F57 | Texas Sharpshooter
Fitting pattern after the fact — finding "evidence" in noise.

F58 | Fallacy Fallacy
Assuming that because argument is flawed, conclusion must be false.

F59 | Kafkatrapping
Denial treated as proof of guilt. "Your defensiveness proves it."

F60 | False Simplicity
Oversimplifying complex issues to make them seem resolved.


# ═══════════════════════════════════════════════════════════════
# SECTION B: MANIPULATION TACTICS
# ═══════════════════════════════════════════════════════════════

## B1: EMOTIONAL MANIPULATION

M01 | Emotional Loading
Charged/loaded language designed to trigger emotional response instead of rational evaluation.

M02 | Fear-Mongering
Exaggerated threats to drive behaviour. Detection: threat language disproportionate to evidence.

M03 | Moral Panic Induction
Manufacturing widespread alarm about perceived threat to social values.

M04 | Outrage Bait
Content engineered to provoke sharing through anger. Detection: inflammatory framing of otherwise reportable facts.

M05 | Sympathy Exploitation
Using victim narratives to bypass critical evaluation of claims.

M06 | Guilt Tripping
Inducing guilt to drive compliance. "If you really cared..."

M07 | Flattery Manipulation
Strategic praise to lower defences and increase compliance.

M08 | Calculated Vulnerability
Displaying fake flaws or weakness to seem trustworthy. "I probably shouldn't tell you this, but..."


## B2: URGENCY & SCARCITY

M09 | False Urgency
"Act now" pressure with no genuine time constraint. Detection: urgency language without evidence of actual deadline.

M10 | Artificial Scarcity
"Limited time/supply" when limitation is manufactured.

M11 | FOMO Exploitation
Fear of missing out weaponised. "Everyone else is already..."

M12 | Countdown Pressure
Visual or verbal countdowns creating psychological pressure.

M13 | Limited-Time Framing
Framing permanent offers as temporary to accelerate decision.


## B3: SOCIAL MANIPULATION

M14 | Manufactured Consensus
"Everyone agrees" when they don't. Detection: vague consensus claims without polling data.

M15 | Astroturfing
Fake grassroots language from organised/funded campaigns. Enhanced by Layer 3: "The Front Group Mask" — grassroots-presenting content with undisclosed institutional backing. Detection: "concerned citizens" language from well-funded operations, missing disclosure.

M16 | Social Proof Manipulation
Fake popularity signals. Detection: unverifiable user counts, testimonials without specifics.

M17 | Peer Pressure Rhetoric
"Everyone in your position would..." — social pressure to comply.

M18 | Exclusivity Appeals
"Join the few who know" — manufactured scarcity of knowledge.


## B4: GASLIGHTING & DENIAL

M19 | Gaslighting
Making reader doubt their own perception of reality.

M20 | DARVO
Deny, Attack, Reverse Victim and Offender. The accuser becomes the accused.

M21 | Minimization
"It's not that bad" — downplaying legitimate concerns.

M22 | Reality Distortion
Persistent reframing until reader's baseline shifts.


## B5: RHETORICAL TRICKS

M23 | Gish Gallop
Overwhelming with many weak arguments. Each requires more effort to debunk than to make. Detection: rapid-fire claims, volume substituting for quality.

M24 | Sealioning
Bad faith evidence requests disguised as reasonable inquiry. "I'm just asking questions."

M25 | Dog Whistling
Coded language carrying hidden meaning to target audience while appearing innocent to others.

M26 | Firehose of Falsehood
Volume over quality — flood information space with contradictory narratives. Enhanced by Layer 3: "The Firehose" — multiple contradictory explanations until audience gives up. "Nothing is true, everything is possible."

M27 | Strategic Ambiguity
Deliberately vague language maintaining plausible deniability.

M28 | Motte and Bailey
Switching between defensible position (motte) and extreme position (bailey). When challenged, retreat to safe version.


## B6: FRAMING MANIPULATION

M29 | Misleading Framing
Same facts presented to create different conclusions.

M30 | Anchoring Manipulation
First number/claim sets reference point that skews all subsequent judgment.

M31 | Priming
Setting up mental context that shapes interpretation of later content.

M32 | Leading Language
Word choice that steers reader toward predetermined conclusion.

M33 | Presupposition Loading
Embedding unproven claims as assumed facts within larger statements.

M34 | Contrast Manipulation
Extreme comparisons to distort perception of the actual subject.


## B7: INTELLIGENCE/MILITARY-DERIVED TACTICS (Layer 2 + 3)

M35 | Name Poison (Layer 2: PSYOP Name-Calling)
Labels/epithets replacing argument. "The radical left..." "These thugs..." Character reduced to single negative trait. Detection: dehumanising language, group labels substituted for engagement with position.

M36 | Plain Folks Mask (Layer 2: PSYOP Plain Folks Appeal)
Authority figures performing ordinariness. "As a mother..." "Just a regular person who..." Detection: staged authenticity markers — rolled sleeves, informal language from formal actors, "kitchen table" framing from boardroom positions.

M37 | Testimonial Shield (Layer 2: PSYOP Testimonial)
Credibility borrowed from unrelated authority domain. Celebrity endorsing science. Expert in field X cited for field Y. Detection: "Even [respected name] says..." where the name's authority doesn't extend to the claim.

M38 | Self-Interest Bait (Layer 2: PSYOP Appeal to Self-Interest)
Framing compliance as personally beneficial and identity-aligned. "Smart investors are already..." "People who care about their families will..." Detection: desired action linked to audience's self-image.

M39 | Behaviour Lever (Layer 2: Behavioural Modification)
Implied reward for compliance, implied punishment for resistance. Loyalty rewarded with belonging, dissent punished with exclusion. Detection: "Those who understand will..." "If you're still not convinced..."

M40 | The Regression Engine (Layer 2/4: Cumulative Pressure)
Stacking multiple fear/anxiety triggers in sequence without relief. Sustained urgency designed to overwhelm rational defences. Detection: emotional escalation without logical resolution, each paragraph raising stakes further.

M41 | The Source Laundry (Layer 3: Information Laundering)
False story seeded in fringe outlet, laundered through partisan media, cited by mainstream as "reports suggest." Detection: vague sourcing ("sources say", "widely reported"), circular citation, attribution trail leading nowhere.

M42 | The Wedge Driver (Layer 3: Social Fracture Exploitation)
Legitimate social tensions inflamed beyond repair. Detection: both-sides framing making compromise impossible, opponents framed as irredeemably evil rather than disagreeable, language making dialogue feel like betrayal.

M43 | The Forgery Echo (Layer 3: Unverifiable Evidence)
Unverified "leaked" documents/screenshots presented as definitive evidence. Detection: claims persisting after debunking, unverifiable chain of custody, denial never catching up with accusation.

M44 | The Useful Amplifier (Layer 3: Unwitting Proxy)
Emotionally compelling content engineered to trigger sharing before verification. Detection: outrage/inspiration optimised for virality, "share before they take this down!" urgency, content structured to be shared not analysed.

M45 | The Mirror Narrative (Layer 3: Projection)
Accusing opponent of exactly what you are doing. Pre-emptive accusation designed to make counter-accusation sound like "no, you." Detection: pre-emptive accusation pattern, "they're the real manipulators."

M46 | The Compliance Cascade (Layer 4: Sequential Request)
Micro-commitments building to larger compliance. Survey-style agreement sequences. Detection: "You'd agree that..." followed by "So naturally..." chains. Small yeses engineered to make big yes feel inevitable.

M47 | The Authority Stack (Layer 4: Multi-Source Loading)
Layering credentials + institution + statistics + testimonial + urgency simultaneously. Detection: multiple authority signals in rapid succession designed to suppress questioning.

M48 | The Threat Shadow (Layer 4: Implied Consequence)
Consequences implied darker than stated. Imagination recruited as weapon. Detection: "We can't guarantee what happens if..." Vivid dark futures with the worst left unsaid — reader fills in horrors the author never explicitly states.


# ═══════════════════════════════════════════════════════════════
# SECTION C: COGNITIVE BIAS EXPLOITATION
# ═══════════════════════════════════════════════════════════════

## C1: DECISION-MAKING BIASES

B01 | Anchoring Exploitation
Reference point manipulation — first number skews all subsequent judgment. "Normally $500, now $99."

B02 | Availability Heuristic Abuse
Vivid examples make rare events seem common. One dramatic story extrapolated to represent trend.

B03 | Loss Aversion Manipulation
Framing as loss rather than gain. "Don't miss out" instead of "you could gain."

B04 | Sunk Cost Exploitation
"You've already invested so much" — past costs used to drive future compliance.

B05 | Status Quo Bias Exploitation
"Why change what's working?" — inertia framed as wisdom.

B06 | Default Effect Manipulation
Pre-selecting preferred option. Making desired choice the path of least resistance.

B07 | Decoy Effect
Inferior third option introduced to make preferred option look better.

B08 | Zero-Risk Bias
"Completely eliminate the threat" — exploiting preference for certainty over better expected outcomes.

B09 | Framing Effect Manipulation
Same facts, different presentation to drive different conclusions.

B10 | Paradox of Choice
Deliberate overwhelming with options to drive decision paralysis or default to suggested choice.


## C2: SOCIAL/GROUP BIASES

B11 | In-Group/Out-Group Manipulation
Us vs. them framing. Enhanced by Layer 3: "The Wedge Driver" — exploiting real social fractures.

B12 | Out-Group Homogeneity
"They're all the same" — denying individuality to opposing group.

B13 | Halo Effect Abuse
One positive trait used to imply unrelated positive qualities.

B14 | Horn Effect Abuse
One negative trait used to dismiss everything about a person/group.

B15 | Fundamental Attribution Error Exploitation
Attributing others' actions to character rather than circumstance. "They did it because they're [trait]."

B16 | Just-World Manipulation
"They deserved it" — believing outcomes reflect moral worth.

B17 | Tribalism Triggers
Identity-based appeals bypassing rational evaluation. Enhanced by Layer 5: "Moral Foundation Hijack" — targeting Haidt's moral foundations (care/harm, fairness/cheating, loyalty/betrayal, authority/subversion, sanctity/degradation, liberty/oppression) to trigger moral intuitions that bypass rational analysis.

B18 | Mimetic Desire Manipulation
Creating desire by showing others wanting something. "Everyone wants this."

B19 | Liking/Similarity Exploitation
Fake relatability. "I'm just like you" from someone nothing like you.

B20 | Unity Principle Exploitation
False shared identity. "We" language creating artificial in-group. Tribal markers used to bypass critical evaluation.


## C3: BELIEF & MEMORY BIASES

B21 | Illusory Truth Exploitation
Repetition increases perceived truth. Same claim restated in different forms.

B22 | Mere Exposure Effect
Familiarity manufactured to create trust. Repeated brand/name exposure.

B23 | Confirmation Bias Exploitation
Content structured to feel true to pre-existing beliefs. Cherry-picked evidence matching audience worldview.

B24 | Hindsight Bias Exploitation
"We knew all along" — rewriting past to claim foresight.

B25 | Rosy Retrospection
"Things were better before" — nostalgic distortion of the past.

B26 | Recency Bias Exploitation
Overweighting recent events to distort broader trend assessment.

B27 | Belief Perseverance Reinforcement
Reinforcing existing beliefs without presenting new evidence.

B28 | Backfire Effect Setup
Framing that causes defensive entrenchment when challenged.


## C4: PERCEPTION BIASES

B29 | Negativity Bias Exploitation
Disproportionate focus on threats/problems to drive engagement.

B30 | Clustering Illusion
Presenting random events as meaningful patterns.

B31 | Contrast Effect Manipulation
Extreme comparisons to distort perception of actual subject.

B32 | Salience Manipulation
Making certain information artificially prominent.

B33 | Attentional Bias Exploitation
Directing focus to misleading details.

B34 | Distinction Bias
Exaggerating small differences when comparing side by side.


## C5: SELF-RELATED BIASES

B35 | Dunning-Kruger Exploitation
Flattering reader's expertise. "You already understand this..."

B36 | Overconfidence Encouragement
"Trust your gut" — encouraging certainty without evidence.

B37 | Self-Serving Bias Reinforcement
Validating reader's existing choices without scrutiny.

B38 | Better-Than-Average Flattery
"Smart readers like you" — exploiting above-average self-perception.

B39 | Illusion of Control Manipulation
"You can beat the odds" — overstating reader's ability to control outcomes.

B40 | Endowment Effect Exploitation
Ownership/possession increases perceived value. Free trials, "your account."

B41 | IKEA Effect Exploitation
Effort invested = value perceived. "You built this, so it must be worth it."


## C6: TEMPORAL BIASES

B42 | Present Bias Exploitation
Immediate rewards framed over long-term consequences.

B43 | Hyperbolic Discounting
"Why wait?" — future costs minimised, immediate benefits amplified.

B44 | Planning Fallacy Exploitation
Understating effort/time/cost required.

B45 | Normalcy Bias Exploitation
"It can't happen here" — exploiting belief that things will continue as normal.

B46 | Optimism Bias Exploitation
Downplaying genuine risks. "It'll work out."

B47 | Pessimism Bias Exploitation
Catastrophising for engagement. "It's worse than you think."

B48 | Spotlight Effect Exploitation
"Everyone is watching/judging you" — exaggerating social visibility.


## C7: BEHAVIOURAL BIASES

B49 | Goal-Gradient Exploitation
Fake progress indicators. "You're almost there!" when barely started.

B50 | Zeigarnik Effect Exploitation
Open loops, incomplete tasks creating compulsion to continue. "Find out what happens..."

B51 | Mental Accounting Manipulation
Framing costs in different mental categories to seem smaller. "$3/day" instead of "$1,095/year."

B52 | Regret Aversion Exploitation
"Don't miss out or you'll regret it" — future regret as compliance lever.


# ═══════════════════════════════════════════════════════════════
# SECTION D: CREDIBILITY RED FLAGS
# ═══════════════════════════════════════════════════════════════

R01 | Weasel Words
"Some say", "many believe", "studies show" — vague attribution avoiding specifics.

R02 | Anonymous Authority
"Experts agree" — unnamed authorities.

R03 | Missing Citations
Statistics presented without source, methodology, or context.

R04 | Unverifiable Claims
Claims presented as fact that cannot be independently checked.

R05 | False Precision
Oddly specific unsourced numbers. "73.6% of people..." with no source.

R06 | Hedge Words
"Potentially", "arguably", "some might say" — avoiding accountability while making the claim.

R07 | Absolute Language
"Always", "never", "everyone", "no one" — sweeping claims with no exceptions.

R08 | Thought-Terminating Clichés
"It is what it is", "that's just how it works", "everyone knows that" — phrases that shut down inquiry.

R09 | Outdated Sources
Old research/data presented as current truth.

R10 | Misrepresented Quotes
Quotes altered, truncated, or recontextualised to change meaning.

R11 | Out-of-Context Quotes
Genuine quotes stripped of original context to support different argument.

R12 | Self-Citation Circles
Source A cites Source B which cites Source A. Enhanced by Layer 3: "The Source Laundry" — circular citation chains across media tiers.

R13 | Unfalsifiable Claims
Claims structured so they cannot possibly be proven wrong.

R14 | Deepity
Seemingly profound but actually meaningless statements. True on one reading, false but impressive-sounding on another.

R15 | False Simplicity
Oversimplifying genuinely complex issues to make them seem resolved.


# ═══════════════════════════════════════════════════════════════
# SECTION E: STRUCTURAL MANIPULATION
# ═══════════════════════════════════════════════════════════════

S01 | Headline/Body Mismatch
Clickbait — headline promises something body doesn't deliver.

S02 | Buried Lede
Key information hidden deep in content where most readers won't reach it.

S03 | Strategic Omission
What's NOT said is as important as what is. Key context, counterarguments, or qualifying data systematically absent. Enhanced by Layer 5: "Framing by Omission" — the frame is built by what's excluded.

S04 | False Balance
Fringe views given equal weight to mainstream/expert consensus.

S05 | Missing Opposing Viewpoints
One-sided presentation with no acknowledgment of legitimate counter-positions.

S06 | Selective Emphasis
Disproportionate space/weight given to certain facts to distort overall picture.

S07 | Narrative Manipulation
Story structure itself deceives — emotional arc replaces logical argument.


# ═══════════════════════════════════════════════════════════════
# SECTION F: PERSUASION TECHNIQUE EXPLOITATION (CIALDINI+)
# ═══════════════════════════════════════════════════════════════

P01 | Reciprocity Manipulation
Fake generosity to create obligation. "We've given you X, now..."

P02 | Commitment/Consistency Exploitation
Past statements or identity used to lock current behaviour. "You said you cared about X, so you must support Y."

P03 | Foot-in-the-Door
Small request accepted, followed by larger request. Enhanced by Layer 4: "The Compliance Cascade" — micro-commitment chains where small yeses make big yes feel inevitable.

P04 | Door-in-the-Face
Extreme ask rejected, then "reasonable" ask presented (which was the goal all along).

P05 | Authority Exploitation
Fake expertise or inflated credentials used to bypass questioning.

P06 | Social Proof Exploitation (Cialdini)
Manufactured popularity signals. "Millions already..." "Join the movement."

P07 | Scarcity/Urgency Exploitation (Cialdini)
Artificial limits to accelerate decision-making before critical evaluation.


# ═══════════════════════════════════════════════════════════════
# SECTION G: AI DETECTION INDICATORS
# ═══════════════════════════════════════════════════════════════

A01 | Repetitive Phrasing Patterns
Same structures/phrases recurring across paragraphs.

A02 | Generic Conclusions
Lacking specificity — could apply to almost anything.

A03 | Lack of Personal Voice
No genuine experience, anecdote, or individual perspective.

A04 | Perfect Grammar With No Personality
Mechanically correct but lacking human rhythm/quirk.

A05 | Cookie-Cutter Structure
Predictable intro/body/conclusion template regardless of topic.

A06 | Overuse of Transitional Phrases
"Furthermore", "moreover", "additionally" — excessive connective tissue.

A07 | Unnaturally Balanced Arguments
False-feeling "on the other hand" balance that no human with an opinion would write.

A08 | Generated-Feeling Lists
Lists that feel enumerated rather than curated from experience.

A09 | Absence of Original Insight
No unique perspective, personal observation, or novel connection.

A10 | LLM Hedging Patterns
"It's important to note that", "it's worth considering", "one might argue" — characteristic AI caution patterns.


# ═══════════════════════════════════════════════════════════════
# SECTION H: LAYER 5 — BSDETECTIVE-OWNED TECHNIQUE NAMES
# ═══════════════════════════════════════════════════════════════
#
# These are the DISPLAY NAMES users see in results.
# They map to techniques above. The source layer is NEVER shown.
#
# BSDetective Name          → Canonical ID(s)    → Source Layer
# ─────────────────────────────────────────────────────────────
# Name Poison               → M35                → Layer 2
# Plain Folks Mask          → M36                → Layer 2
# Testimonial Shield        → M37                → Layer 2
# Self-Interest Bait        → M38                → Layer 2
# Behaviour Lever           → M39                → Layer 2
# Lesser Evil Frame         → F03 (enhanced)     → Layer 2
# The Regression Engine     → M40                → Layer 2/4
# The Source Laundry        → M41                → Layer 3
# The Wedge Driver          → M42                → Layer 3
# The Forgery Echo          → M43                → Layer 3
# The Front Group Mask      → M15 (enhanced)     → Layer 3
# The Credibility Kill      → F09 (enhanced)     → Layer 3
# The Firehose              → M26 (enhanced)     → Layer 3
# The Useful Amplifier      → M44                → Layer 3
# The Mirror Narrative      → M45                → Layer 3
# The Compliance Cascade    → M46                → Layer 4
# The Authority Stack       → M47                → Layer 4
# The Novelty Hook          → F26 (enhanced)     → Layer 4
# The Threat Shadow         → M48                → Layer 4
# Moral Foundation Hijack   → B17 (enhanced)     → Layer 1/5
# Framing by Omission       → S03 (enhanced)     → Layer 5
#
# ═══════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════
# TOTALS
# ═══════════════════════════════════════════════════════════════
#
# Formal Fallacies:              8   (F01–F08)
# Informal Fallacies:           52   (F09–F60)
# Manipulation Tactics:         48   (M01–M48)
# Cognitive Bias Exploits:      52   (B01–B52)
# Credibility Red Flags:        15   (R01–R15)
# Structural Manipulation:       7   (S01–S07)
# Persuasion Techniques:         7   (P01–P07)
# AI Detection Indicators:      10   (A01–A10)
# ─────────────────────────────────────────────────────────────
# TOTAL:                       199   detection patterns
#
# Layer 5 Display Names:        21   (BSDetective-owned technique names)
# Enhanced existing (Layer 2-4): 8   (existing patterns with deeper detection rules)
# ═══════════════════════════════════════════════════════════════

# ============================================================
# TAXONOMY APPEND — v2.1.0
# DATE: 2026-06-02
# PATTERNS ADDED: 65 (A11–A20, C01–C25, I01–I15, O01–O15)
# NEW TOTAL: 264
# ============================================================
# APPEND INSTRUCTIONS:
# Add this entire block to the end of TAXONOMY.md.
# Update the header line to: VERSION: 2.1.0 | DATE: 2026-06-02 | PATTERNS: 264
# Do NOT renumber or modify any existing entries.
# ============================================================

# ============================================================
# SECTION D: SYNTHETIC / AI DETECTION (EXPANDED)
# ============================================================

## D1: AI COORDINATION & AMPLIFICATION SIGNALS
# (Expands existing A01–A10. New patterns: A11–A20.)
# Layer notes: A11–A13, A18 = data product / media ratings.
# A16–A17, A20 = consumer extension (surfaced to user).
# A14–A15, A19 = compliance / procurement.

A11 | Coordinated Inauthenticity Signal
Multiple accounts posting near-identical framing within tight time windows; unnatural engagement velocity suggesting orchestrated rather than organic spread.

A12 | Bot Amplification Pattern
Disproportionate sharing-to-reading ratio; engagement from accounts with no organic history or consistent human activity.

A13 | Algorithmic Engagement Optimisation
Content structured for maximum platform algorithm reward (rage bait, cliffhanger hooks, engagement farming) rather than informational value.

A14 | Synthetic Consensus Manufacturing
AI-generated comments or reviews creating false impression of agreement; repetitive semantic patterns across ostensibly independent voices.

A15 | Template-Driven Persuasion
Detectable fill-in-the-blank structure suggesting mass-produced persuasion campaigns (e.g., outreach emails, astroturf petitions).

A16 | AI Sycophancy Loop
AI response reinforcing user's existing belief rather than providing balanced information; escalating agreement pattern regardless of accuracy.

A17 | Echo Chamber Amplification
Content algorithmically served to reinforce existing viewpoint with no counterpoint exposure signal.

A18 | Provenance Void
Content with no verifiable origin, no author attribution, no editorial chain; provenance metadata stripped or absent.

A19 | Synthetic Urgency Injection
AI-generated time-pressure language inserted into otherwise factual content to drive immediate action.

A20 | Model Confidence Mimicry
AI-generated text presenting speculative claims with high-certainty linguistic markers ("clearly", "undeniably", "the evidence is overwhelming") without supporting evidence.

# ============================================================
# SECTION E: COMMERCIAL / UX MANIPULATION
# ============================================================

## E1: DARK PATTERNS & COMMERCIAL MANIPULATION
# New category: C01–C25.
# Layer notes: Feeds Manipulation Index and brand scoring.
# NOT for consumer popup alerts — aggregate/B2B use.
# C03, C04, C06, C09, C10, C14, C21, C22 = regulatory compliance triggers.

C01 | False Scarcity Display
"Only X left" / "Y people viewing" with no verifiable inventory data; artificial scarcity manufactured to drive purchase urgency.

C02 | Artificial Urgency Timer
Countdown timers on offers that reset or persist beyond their stated deadline; urgency with no genuine external constraint.

C03 | Drip Pricing
Core price displayed prominently; mandatory fees (booking fees, service charges, delivery) revealed incrementally through checkout flow.

C04 | Subscription Trap Architecture
Easy sign-up flow paired with deliberately complex cancellation path; asymmetric friction by design.

C05 | Confirmshaming
Opt-out option worded to make user feel guilty or foolish for declining ("No, I don't want to save money").

C06 | Forced Continuity
Free trial converts to paid subscription with minimal, buried, or delayed notification before charge occurs.

C07 | Hidden Cost Reveal
Material costs (shipping, service fees, taxes) withheld until final checkout step after user has invested time in the purchase flow.

C08 | Decoy Pricing Architecture
Third pricing option exists solely to make the target option appear as best value by comparison.

C09 | Dark Consent Pattern
Pre-checked consent boxes; consent buried in terms; asymmetric accept/reject design making refusal harder than agreement.

C10 | Roach Motel Design
Easy data entry or account creation; deliberately obstructed data deletion or account closure path.

C11 | Social Proof Fabrication
Testimonials, reviews, or usage counts that cannot be independently verified or are structurally unverifiable.

C12 | Manufactured Consensus Display
"Most popular" / "Editor's Choice" / "Recommended" labels with no transparent, auditable selection criteria.

C13 | Loyalty Lock-in Friction
Points or rewards programmes designed to create switching costs rather than deliver genuine user value.

C14 | Personalised Price Discrimination
Different prices shown to different users based on behavioural profiling without disclosure of the practice.

C15 | Bait and Switch Listing
Advertised product, price, or feature materially differs from what is available at the point of purchase.

C16 | Nagging / Repeated Prompt
Persistent re-prompts after user has declined (cookie consent banners, newsletter popups, app rating requests).

C17 | Interface Interference
Visual hierarchy deliberately designed to make company-preferred option appear as default or the only option.

C18 | Trick Wording
Double negatives or deliberately confusing language in consent and opt-out flows designed to produce unintended agreement.

C19 | Artificial Bundle Lock
Useful feature gated behind unnecessary bundle to inflate perceived value of the bundle.

C20 | Gamification Pressure
Streaks, badges, or loss-aversion mechanics designed to drive compulsive engagement rather than deliver user value.

C21 | Addictive Design Pattern
Infinite scroll, autoplay, variable reward schedules engineered for compulsive use beyond user intent.

C22 | Virtual Currency Obfuscation
In-app currencies that obscure the real-money cost of transactions through abstraction and conversion friction.

C23 | Emotional Checkout Manipulation
Charity donation requests, guilt messaging, or fear appeals injected at point of purchase to increase spend.

C24 | Review Gating
Selectively soliciting reviews only from satisfied customers; structurally suppressing negative feedback from reaching public record.

C25 | Anchoring Price Display
Original price inflated or fabricated to make discounted current price appear as a genuine deal.

# ============================================================
# SECTION F: INSTITUTIONAL / STATE MANIPULATION
# ============================================================

## F1: COORDINATED NARRATIVE OPERATIONS
# New category: I01–I15.
# Layer notes: Detects operational-level campaigns, not individual techniques.
# I01–I15 = government/defence, data product, media ratings.
# Complements existing Layer 2/3 technique-level patterns in M-series.

I01 | Narrative Seeding Operation
Same novel framing appearing simultaneously across multiple unconnected sources with no identifiable originator; coordinated narrative launch.

I02 | Controlled Opposition Signal
Apparently critical voice that consistently fails to challenge core claims; criticism structured to reinforce rather than genuinely threaten the target position.

I03 | Strategic Ambiguity in Official Communication
Diplomatic or corporate language deliberately crafted to be interpreted multiple ways; plausible deniability architecturally built into wording.

I04 | Information Flooding Operation
Coordinated release of high-volume, low-quality information to bury a specific story or finding beneath noise.

I05 | Legitimacy Laundering Chain
Claims originating from an unreliable source, cited by progressively more credible outlets without independent verification at each step.

I06 | Proxy Voice Deployment
Institutional message delivered through an apparently independent commentator, academic, or NGO without disclosure of relationship.

I07 | Grievance Exploitation Campaign
Real social tension systematically amplified beyond proportion to destabilise rather than resolve the underlying issue.

I08 | False Flag Attribution
Content designed to appear as if produced by a different group in order to discredit that group.

I09 | Temporal Coordination Signal
Multiple sources publishing aligned narratives within an unusually narrow time window suggesting pre-coordination rather than independent reporting.

I10 | Platform Migration Trail
Narrative tested on fringe platform, refined, then deployed on mainstream platform — detectable via consistent language or framing evolution across platforms.

I11 | Sanctions / Policy Narrative Engineering
Coordinated media framing that precedes or immediately follows a policy action, suggesting the narrative was prepared in advance of the decision.

I12 | Election Interference Pattern
Targeted content surge in specific geographic or demographic segments timed to election windows.

I13 | Economic Destabilisation Narrative
Coordinated amplification of economic fear signals disproportionate to underlying data; designed to erode confidence rather than inform.

I14 | Institutional Capture Signal
Regulatory or academic body consistently producing output aligned with a single funder or interest group without disclosure of that relationship.

I15 | Strategic Leak Pattern
"Leaked" information that serves the apparent leaker's interests; leak timing aligned with political or commercial calendar events.

# ============================================================
# SECTION G: FINANCIAL / LEGAL / PROFESSIONAL OBFUSCATION
# ============================================================

## G1: COMPLIANCE & PROFESSIONAL COMMUNICATION MANIPULATION
# New category: O01–O15.
# Layer notes: Primary compliance scanning layer.
# Directly serves FCA/FINRA/FSCA compliance and procurement scanning use cases.
# O01–O07 = financial services / regulatory compliance.
# O08–O11 = procurement scanning.
# O12–O15 = compliance, media ratings, securities regulation.

O01 | Jargon Shield
Technical or legal language used to obscure rather than clarify; plain-English equivalent would materially change the reader's assessment of the content.

O02 | Risk Burial
Material risk disclosures placed in locations or formats designed to minimise reader attention: footnotes, dense paragraphs, end of document, fine print.

O03 | Performance Cherry-Picking
Selective time windows, metrics, or benchmarks chosen to present a favourable picture; unfavourable periods or comparators omitted without disclosure.

O04 | Greenwashing Signal
Environmental claims without verifiable data, specific measurable commitments, or independent third-party certification.

O05 | ESG-Washing Pattern
Social or governance claims that are aspirational statements or intentions presented as current established practice.

O06 | Earnings Call Language Manipulation
Euphemistic language applied to negative results ("headwinds", "challenging environment", "transitional period"); certainty language applied to projections presented as likely outcomes.

O07 | Prospectus Obfuscation
Material terms buried in document structure; key exclusions or conditions placed in appendices or cross-referenced sections requiring active navigation to find.

O08 | Contract Asymmetry
Terms creating disproportionate obligation on one party; penalty clauses or unilateral modification rights buried in boilerplate.

O09 | Vendor Proposal Inflation
Unsubstantiated capability claims, vague deliverable definitions, or manufactured urgency in sales proposals and RFP responses.

O10 | Artificial Deadline in Negotiation
"This offer expires" / "Board approval window closing" framing with no verifiable external constraint driving the deadline.

O11 | Manufactured Social Proof in B2B
"Industry-leading" / "Trusted by X companies" claims without named references or independently verifiable data.

O12 | Regulatory Capture Language
Industry body or standard presented as independent authority when the body is funded or controlled by the entities it regulates.

O13 | Selective Disclosure Pattern
Material information shared with some stakeholders and withheld from others; asymmetric information distribution creating unfair advantage.

O14 | Fee Obfuscation Architecture
Fee structures deliberately designed to be incomparable across providers; fees bundled or unbundled selectively to appear competitive in isolation.

O15 | Qualification Stripping
Caveats, conditions, and limitations present in source material removed in derivative communications (press releases, marketing, social posts), changing the meaning of the original claim.

# ============================================================
# END OF APPEND — v2.1.0
# Total patterns: 264
# Next append should begin at A21, C26, I16, O16 or new prefix
# ============================================================
