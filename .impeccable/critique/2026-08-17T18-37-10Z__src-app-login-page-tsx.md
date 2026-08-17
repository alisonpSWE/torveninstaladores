---
timestamp: 2026-08-17T18-37-10Z
slug: src-app-login-page-tsx
---
# Design Critique: `/login` (Tela de Autenticação)

**Method:** dual-agent (A: `a60eac6e-331b-45ce-a297-801b6cf92c21` · B: `eeebf368-f6b7-476e-bf39-093f3942f8bc`)  
**Target:** [`src/app/login/page.tsx`](file:///C:/AppSheetNicolas/src/app/login/page.tsx)  
**Platform/Register:** Product UI (Torven Instaladores — Ferramenta mobile-first de campo e despacho operacional).

---

## 1. Design Health Score (Nielsen Heuristics)

| # | Heuristic | Score (0-4) | Key Issue |
|---|---|:---:|---|
| 1 | **Visibility of System Status** | **3 / 4** | Botão exibe loading spinner ("Autenticando..."), mas falta validação inline e aviso de status offline. |
| 2 | **Match System / Real World** | **3 / 4** | Linguagem em PT-BR, porém expõe jargão técnico dispensável ("PWA de campo"). |
| 3 | **User Control and Freedom** | **2 / 4** | Sem alternância para exibir/ocultar senha (Eye/EyeOff) e sem fluxo de recuperação de acesso. |
| 4 | **Consistency and Standards** | **2 / 4** | Viola padrões de formulários web/mobile: faltam atributos `id`, `name`, `autoComplete` e `inputMode`. |
| 5 | **Error Prevention** | **2 / 4** | Validação básica de campos vazios, mas sem visualizador de senha e sem detecção de Caps Lock. |
| 6 | **Recognition Rather than Recall** | **2 / 4** | Força digitação manual sem suporte a gerenciadores de senha e autofill do navegador/SO. |
| 7 | **Flexibility and Efficiency** | **1 / 4** | Sem persistência de e-mail ("Lembrar e-mail"), sem suporte a biometria/passkeys e sem autofill. |
| 8 | **Aesthetic and Minimalist Design** | **3 / 4** | Paleta escura OLED com excelente contraste no botão amarelo (#ffc61e contra preto), foco direto. |
| 9 | **Error Recovery** | **2 / 4** | Traduz credenciais inválidas, mas propaga erros brutos em inglês do Supabase sem link de suporte. |
| 10 | **Help and Documentation** | **1 / 4** | Nenhum link de ajuda, redefinição de senha ou contato com o suporte para técnicos bloqueados. |
| **Total** | | **21 / 40** | **Acceptable (Necessita Melhorias de Campo & A11y)** |

---

## 2. Anti-Patterns Verdict

* **LLM Assessment**:
  - Layout funcional e minimalista, mas com limitações para uso móvel em campo sob luz solar.
  - O input com tamanho de fonte reduzido (`text-xs` = 12px) aciona o zoom automático forçado do iOS Safari/Chrome Mobile, quebrando o enquadramento do PWA.
  - Ausência de botão para mostrar senha obriga técnicos com luvas a redigitar senhas longas às cegas.
* **Deterministic Scan (`detect.mjs`)**:
  - 1 aviso de token: `text-[11px]` na linha 130 fora da rampa tipográfica padrão do `DESIGN.md`.
  - Falta de atributos `autoComplete` (`autoComplete="email"`, `autoComplete="current-password"`) e associação semântica `<label htmlFor="...">`.

---

## 3. Overall Impression

A tela de login é limpa, direta ao ponto e respeita a identidade visual da Torven (alto contraste preto e amarelo). No entanto, peca gravemente na ergonomia móvel e acessibilidade: sem autofill de senhas, sem alternador de visibilidade de senha e com fontes em inputs que causam zoom involuntário em celulares no campo.

---

## 4. What's Working

1. **Contraste e Foco Visual**: O botão principal em amarelo solar `#ffc61e` com tipografia preta sólida em negrito garante legibilidade imediata (contraste > 14:1).
2. **Feedback de Estado no Envio**: Desabilitação do formulário e animação de loading com `Loader2` durante a chamada ao Supabase Auth previne cliques repetidos.
3. **Card Centralizado e Limpo**: Ausência de ruídos ou propagandas desnecessárias, focando 100% no fluxo de autenticação.

---

## 5. Priority Issues (P0–P3)

### 🚨 [P0] Ausência de Autocomplete, Name e Atributos de Teclado Mobile
* **Por que importa:** Impede que o iOS Keychain, Google Autofill, 1Password ou Bitwarden preencham credenciais com 1 toque. Teclados móveis começam com maiúscula no e-mail por falta de `autoCapitalize="none"`.
* **Como corrigir:** Adicionar `id`, `name`, `autoComplete="username email"`, `inputMode="email"`, `autoCapitalize="none"`, `autoCorrect="off"` e ligar com `<label htmlFor="...">`.
* **Comando sugerido:** `/impeccable harden`

### 🚨 [P1] Falta do Alternador de Senha (Eye/EyeOff) & Zoom em Celulares
* **Por que importa:** Técnicos em telhados ou em campo com luvas não conseguem verificar erros de digitação na senha. Inputs menores que 16px disparam zoom abrupto da tela no Safari iOS.
* **Como corrigir:** Adicionar botão interativo com ícones `Eye`/`EyeOff` e ajustar o tamanho do texto do input para `text-base sm:text-sm` (evitando o zoom do iOS).
* **Comando sugerido:** `/impeccable polish`

### ⚠️ [P2] Falta de Link de Suporte / Recuperação de Senha & Tratamento de Erros Supabase
* **Por que importa:** Erros como limite de requisições ou e-mail não confirmado são exibidos em inglês. Técnicos esquecem senhas e não encontram canal para recuperar ou falar com o suporte.
* **Como corrigir:** Mapear erros do Supabase para PT-BR e adicionar link de recuperação/suporte.
* **Comando sugerido:** `/impeccable clarify`

### ⚠️ [P3] Detecção de Conexão Offline e Jargão no Subtítulo
* **Por que importa:** Em áreas rurais ou sem sinal, o login falha silenciosamente ou trava sem explicar que o celular está offline. O texto "PWA de campo" expõe termo técnico irrelevante ao instalador.
* **Como corrigir:** Adicionar aviso contextual de offline e atualizar o texto para "Acesso Operacional & Campo".
* **Comando sugerido:** `/impeccable polish`

---

## 6. Persona Red Flags

* **Alex (Power User / Escritório)**: Tenta usar o 1Password ou preenchimento automático do Chrome no PC. Como os inputs não possuem `name` nem `autoComplete`, o gerenciador não detecta os campos.
* **Jordan (Novo Instalador)**: Digita a senha fornecida no onboarding, erra um caractere mas não pode conferir o que digitou. Recebe um erro e fica bloqueado sem link para recuperar a senha.
* **Casey (Técnico de Campo no Telhado)**: Sob forte luz solar e com luvas, toca no campo de e-mail e a tela dá um salto de zoom (zoom bug do iOS). Precisa deszoomar com dois dedos e redigitar manualmente todo o e-mail longo.

---

## 7. Minor Observations & Questions

* **Observação:** O rodapé usa `text-[11px]` que pode ser padronizado para `text-xs text-zinc-500`.
* **Pergunta Provocativa 1:** Para técnicos em campo usando EPIs, deveríamos habilitar autenticação biométrica rápida (WebAuthn / TouchID / FaceID) ou Magic Link via WhatsApp?
* **Pergunta Provocativa 2:** É necessário solicitar login frequente no PWA, ou a sessão do instalador deve permanecer persistida (ex: 30 a 90 dias)?
