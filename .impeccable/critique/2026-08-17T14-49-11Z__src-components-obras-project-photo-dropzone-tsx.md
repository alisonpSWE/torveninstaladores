---
target: workspace de fotos do projeto
total_score: 21
p0_count: 1
p1_count: 1
timestamp: 2026-08-17T14-49-11Z
slug: src-components-obras-project-photo-dropzone-tsx
---
Method: dual-agent (A: ade97f3b-5092-49b9-9def-3a3513cb6c17 · B: ab987127-1643-4841-85b1-de3239f7c134)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Batch upload errors show aggregate counts without listing failed file names or retry triggers |
| 2 | Match System / Real World | 3/4 | Rigid separation between field logs and engineering drawings creates confusion for field teams |
| 3 | User Control and Freedom | 2/4 | No cancel button for active batch upload queue; non-admins blocked from project uploads |
| 4 | Consistency and Standards | 2/4 | Redirects users away to desktop-only route; uses browser-native window.confirm() for deletions |
| 5 | Error Prevention | 2/4 | Lacks pre-flight file count/size warnings; native confirmation easy to mis-click |
| 6 | Recognition Rather Than Recall | 2/4 | Photos uploaded via dropzone with null subcategory become invisible in PhotoGallery |
| 7 | Flexibility and Efficiency | 2/4 | Lack of inline batch categorizer or multi-select photo actions in main gallery |
| 8 | Aesthetic and Minimalist Design | 2/4 | 3-level nested cards, invalid Tailwind classes (py-0.2, bg-zinc-850), and noisy overlays |
| 9 | Error Recovery | 2/4 | Failed batch uploads drop files without single-click retry options |
| 10 | Help and Documentation | 1/4 | Missing inline tooltips on supported MIME types, max file sizes, or category definitions |
| **Total** | | **21/40** | **Acceptable** |

#### Anti-Patterns Verdict

**LLM assessment**: Identified 3-level nested cards (Card -> container -> thumbnail), pill badge with accent outline (border-[#ffc61e]/30), invalid Tailwind classes (py-0.2, bg-zinc-850, backdrop-blur-xs), and icon-stuffed thumbnail headers without hierarchy.

**Deterministic scan**: Automated detector found 12 font-size deviations (text-[11px], text-[10px], text-[9px]) outside documented DESIGN.md type steps across project-photo-dropzone.tsx and photo-gallery.tsx.

#### Overall Impression
Solid domain alignment and dark-theme foundation, but workflow fragmentation (redirecting to /obra/[id]/projeto), a critical data-rendering bug (photos without subcategory uploaded via dropzone disappear from PhotoGallery), and native browser dialogs (window.confirm) create friction for both back-office managers and mobile field installers.

#### What's Working
1. **Sequential Queue Compression**: WebWorker compression prevents main-thread CPU spikes on large batch uploads.
2. **Solar Domain Categorization**: Specific subcategories (Inversor, Módulos, Estrutura, Padrão/Trafo) closely fit photovoltaic installation needs.
3. **High-Contrast Dark Aesthetic**: #ffc61e solar yellow on dark zinc background supports high visibility.

#### Priority Issues

- **[P0] Data Disappearance Bug (Missing Subcategory Photos Hidden)**
  - **Why it matters**: ProjectPhotoDropzone uploads photos with subcategory: null. PhotoGallery.tsx only renders items matching PROJECT_SUBCATEGORIES, making uncategorized photos completely invisible.
  - **Fix**: Set default subcategory to 'geral' in ProjectPhotoDropzone and add an 'Outros / Sem Categoria' fallback group in PhotoGallery.tsx.
  - **Suggested command**: /impeccable polish

- **[P1] Workflow Fragmentation & Native Browser Dialogs**
  - **Why it matters**: PhotoGallery redirects users to a separate desktop route (/obra/[id]/projeto) rather than providing an integrated inline dropzone. Destructive deletions rely on browser window.confirm().
  - **Fix**: Embed ProjectPhotoDropzone directly into PhotoGallery 'Projeto' tab and replace window.confirm() with a custom Radix/shadcn AlertDialog.
  - **Suggested command**: /impeccable layout

- **[P2] Queue Control & Granular Batch Error Handling**
  - **Why it matters**: Sequential upload queue lacks a batch cancel button and fails silently with aggregate counts ('X enviadas, Y falharam') without naming failed files or offering 1-click retry.
  - **Fix**: Add AbortController cancellation signal and render an actionable failed-files list with individual retry buttons.
  - **Suggested command**: /impeccable harden

- **[P3] Invalid Utility Classes & Undersized Touch Targets**
  - **Why it matters**: Usage of invalid Tailwind classes (py-0.2, bg-zinc-850, backdrop-blur-xs) and thumbnail action targets (<44px).
  - **Fix**: Replace invalid classes with standard Tailwind tokens (py-0.5, bg-zinc-900, backdrop-blur-sm) and increase overlay touch targets to >=44px.
  - **Suggested command**: /impeccable polish

#### Persona Red Flags

- **Alex (Power User)**: Uploads 40 photos; 2 fail with no file names shown or retry button. Wants to re-tag 10 photos but is forced to navigate away and drag tags one by one.
- **Jordan (First-Timer)**: Confused by strict separation between field photo log ('Registro') and engineering drawings ('Projeto').
- **Riley (Stress Tester)**: Drops 100 RAW photos (400MB); cannot cancel queue. Discovers uploaded photos with subcategory: null disappear from PhotoGallery.
- **Casey (Mobile Field Installer)**: Tries to open engineering drawings on mobile; receives desktop redirect link to /obra/[id]/projeto that is unusable on phone.

#### Minor Observations
- OS Emojis (☀️, 🔌, ⚡) render inconsistently across iOS, Android, and Windows; replace with Lucide icons.
- Accented Portuguese characters are stripped during file sanitization (Módulo.jpg -> M_dulo.jpg).

#### Questions to Consider
- Why force office staff to navigate away to /obra/[id]/projeto when an inline collapsible dropzone can live directly in the Obra Detail workspace?
- Why not allow field installers to assign subcategories right from their mobile phones during camera capture?
