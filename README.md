# Onde Tô?

Um jogo de navegador em que você adivinha onde uma foto de rua foi tirada. Dá pra jogar
**ao vivo com os amigos** (sala com código, modos Clássico e Duelo em times) ou **neste PC**
(de 1 a 8 jogadores revezando no mesmo computador). Cada jogador tem o seu avatar "Alfinete".

As fotos vêm do **Mapillary** (padrão, grátis) ou do **Google Street View** (opcional, pago
acima da faixa grátis).

---

## Sumário

1. [Estrutura](#estrutura)
2. [Pré-requisitos](#pré-requisitos)
3. [Chaves de API](#chaves-de-api)
4. [Variáveis de ambiente](#variáveis-de-ambiente)
5. [Rodar local (Mapillary)](#rodar-local-mapillary)
6. [Rodar local com Google Street View](#rodar-local-com-google-street-view)
7. [Gerar os mapas (os "seeds" de lugares)](#gerar-os-mapas-os-seeds-de-lugares)
8. [Testes](#testes)
9. [Publicar (Render + Vercel)](#publicar-render--vercel)
10. [Problemas comuns](#problemas-comuns)

---

## Estrutura

```
packages/shared/      regras do jogo (pontuação, duelo, avatar, protocolo) + os mapas em maps/
  maps/*.json         lugares do Mapillary (brasil, capitais-br, capitais-mundo, mundo, teste)
  maps/google/*.json  lugares do Google (gerados quando houver chave)
apps/server/          servidor Node + Socket.IO (salas ao vivo, em memória)
apps/web/             site React + Vite
scripts/build-maps/   script que gera os mapas consultando o Mapillary ou o Google
docs/superpowers/     specs e planos (v1 e v2)
```

## Pré-requisitos

- **Node 22**
- **pnpm 10**: `corepack enable`. Se não funcionar, rode `npm i -g pnpm`.

Instale as dependências na raiz do repositório:

```bash
pnpm install
```

## Chaves de API

### Mapillary (obrigatória)

É gratuita e é o que o jogo usa por padrão.

1. Acesse https://www.mapillary.com/dashboard/developers e clique em **Register an application**.
2. Preencha:
   - **nome:** `Onde Tô?`;
   - **site e redirect URL:** qualquer endereço seu;
   - **escopo:** marque **apenas READ**.
3. Copie o **Client Token**, o que começa com `MLY|`.
   - Esse token é público por natureza: ele vai junto no site.
   - O **Client Secret** é privado. O jogo não usa e ele não deve ser compartilhado.

O mesmo token serve para o **site** (mostrar as fotos) e para o **script de mapas** (achar os
lugares).

### Google Street View (opcional)

1. Abra https://console.cloud.google.com/google/maps-apis, crie um projeto e **ative a
   cobrança** (o Google exige cartão).
2. Em **APIs e serviços → Biblioteca**, ative a **Maps JavaScript API** e a **Street View
   Static API**.
3. Em **Credenciais**, crie **duas chaves**:

   | Chave | Restrição de aplicativo | Restrição de API | Usada por |
   |---|---|---|---|
   | **do site** | Sites: `http://localhost:5180/*` e o domínio publicado | Maps JavaScript API | o site (fica visível no navegador) |
   | **do script** | nenhuma, porque roda no terminal | **só** Street View Static API | `build-maps` (mantenha privada) |

4. **Para não ter surpresa na fatura:**
   - crie um alerta de orçamento em *Faturamento → Orçamentos*, de US$ 1 por exemplo;
   - limite o "Dynamic Street View" por dia em *Cotas*, por exemplo 200/dia.

Preços na data da v2:
- **Panorama interativo:** 5.000 grátis por mês, depois US$ 14 a cada 1.000. O jogo reaproveita
  um único panorama por sessão.
- **Metadata**, usada pelo script de mapas: grátis.

## Variáveis de ambiente

Há um modelo para cada parte, já com os valores não sensíveis preenchidos:

| Modelo | O que fazer |
|---|---|
| `apps/web/env.example` | Copie para `apps/web/.env.local` e preencha o token do Mapillary e, se for usar o Google, a chave do site |
| `apps/server/env.example` | Referência: o servidor recebe as variáveis na linha de comando ou no painel do Render |
| `scripts/build-maps/env.example` | Referência: as chaves são passadas na linha de comando ao gerar os mapas |

### Site (`apps/web`)

O Vite lê essas variáveis do ambiente ou de um arquivo `apps/web/.env.local`, que não vai para
o git.

| Variável | Padrão | O que é |
|---|---|---|
| `VITE_MAPILLARY_TOKEN` | — | Client Token do Mapillary (`MLY|…`) |
| `VITE_SERVER_URL` | `http://localhost:3001` | Endereço do servidor das salas |
| `VITE_STREET_PROVIDER` | `mapillary` | `google` para usar o Street View |
| `VITE_GOOGLE_MAPS_KEY` | — | Chave **do site** do Google (só com `google`) |
| `VITE_FAKE_VIEWER` | — | `1` troca a foto por um quadro falso (testes) |
| `VITE_ENABLE_TEST_MAP` | — | `1` libera o mapa "Teste" (testes) |

### Servidor (`apps/server`)

O servidor **não** lê arquivo de ambiente: passe as variáveis na linha de comando ou com
`export`.

| Variável | Padrão | O que é |
|---|---|---|
| `PORT` | `3001` | Porta HTTP e WebSocket |
| `CORS_ORIGIN` | `http://localhost:5173` | Endereço exato do site (precisa bater com a porta do Vite) |
| `STREET_PROVIDER` | `mapillary` | `google` para sortear lugares dos mapas do Google |
| `ENABLE_TEST_MAP` | — | `1` libera o mapa "Teste" (testes) |

> O **servidor e o site precisam usar o mesmo provedor**. Se forem diferentes, a sala avisa
> "Servidor e site usam provedores diferentes".

### Script de mapas (`scripts/build-maps`)

| Variável | Quando | O que é |
|---|---|---|
| `MAPILLARY_TOKEN` | `--provider mapillary` (padrão) | Client Token do Mapillary |
| `GOOGLE_MAPS_KEY` | `--provider google` | Chave **do script** do Google |

## Rodar local (Mapillary)

Abra dois terminais.

```bash
# 1) servidor das salas (porta 3001)
cd ~/Projects/onde-to
PORT=3001 CORS_ORIGIN=http://localhost:5180 pnpm --filter server dev

# 2) site (porta 5180)
cd ~/Projects/onde-to/apps/web
VITE_MAPILLARY_TOKEN='MLY|SEU_TOKEN' pnpm exec vite --port 5180
```

Depois acesse **http://localhost:5180**.

- A porta 5180 é só uma escolha (a 5173 costuma estar ocupada por outros projetos). Se mudar,
  mude também o `CORS_ORIGIN` do servidor.
- O modo **Neste PC** funciona só com o site. A **sala ao vivo** precisa do servidor.
- Para testar a sala sozinho, abra duas janelas: uma normal e uma anônima. Cada navegador é um
  jogador.

## Rodar local com Google Street View

Antes, é preciso ter os mapas do Google gerados (veja abaixo).

```bash
# servidor
cd ~/Projects/onde-to
PORT=3001 CORS_ORIGIN=http://localhost:5180 STREET_PROVIDER=google pnpm --filter server dev

# site
cd ~/Projects/onde-to/apps/web
VITE_STREET_PROVIDER=google VITE_GOOGLE_MAPS_KEY='CHAVE_DO_SITE' pnpm exec vite --port 5180
```

Para voltar ao Mapillary, suba os dois sem `STREET_PROVIDER`/`VITE_STREET_PROVIDER`.

## Gerar os mapas (os "seeds" de lugares)

Cada mapa é uma lista de lugares onde existe foto 360°. O script sorteia pontos dentro de cada
região (estados do IBGE, países e capitais do Natural Earth), procura uma foto perto de cada
ponto e grava o JSON.

```bash
cd ~/Projects/onde-to

# Mapillary: grava em packages/shared/maps/<id>.json
MAPILLARY_TOKEN='MLY|SEU_TOKEN' pnpm --filter build-maps build-maps
MAPILLARY_TOKEN='MLY|SEU_TOKEN' pnpm --filter build-maps build-maps capitais-br brasil   # só alguns

# Google: grava em packages/shared/maps/google/<id>.json
GOOGLE_MAPS_KEY='CHAVE_DO_SCRIPT' pnpm --filter build-maps build-maps --provider google
```

- **Mapas:** `brasil`, `capitais-br`, `capitais-mundo` e `mundo`. Sem nomes, o script gera os
  quatro.
- **Duração:**
  - com o Mapillary, ~20 minutos para os quatro (o Mundo é o mais demorado);
  - com o Google, deve ser parecido, mas ainda não foi medido.
- **Mínimo de 100 lugares:** um mapa com menos que isso **não é gravado**, e o script termina
  com erro.
- **Relatório:** ao final, o script lista as regiões que ficaram abaixo do alvo. Isso é falta
  de foto 360° no provedor, não bug.
- **Cache:** as geometrias baixadas (IBGE e Natural Earth) ficam em
  `scripts/build-maps/.cache/`.
- **Depois de gerar:** faça commit dos JSON. O site e o servidor leem esses arquivos; o site só
  mostra no seletor os mapas cujo arquivo existe.

Resultado atual com o Mapillary:

| Mapa | Lugares |
|---|---|
| Capitais do Brasil | 271 (20 capitais) |
| Brasil | 250 (22 estados) |
| Capitais do Mundo | 415 (146 capitais) |
| Mundo | 397 (117 países) |

## Testes

```bash
pnpm test                    # unidade (shared, server, web, build-maps)
pnpm typecheck               # tipos
pnpm --filter web build      # build do site

# ponta a ponta (sobe servidor e site sozinho, com foto falsa e mapa de teste)
cd apps/web
pnpm exec playwright install chromium-headless-shell   # só na primeira vez
pnpm exec playwright test
```

## Publicar (Render + Vercel)

**Publique o servidor primeiro**, depois o site.

1. **Servidor no Render**
   - Crie com **New → Blueprint** apontando para o repositório. O `render.yaml` já está
     pronto.
   - Variáveis:
     - `CORS_ORIGIN` = endereço da Vercel (ex.: `https://onde-to.vercel.app`);
     - `STREET_PROVIDER` = `google`, se for usar o Google.
   - No plano grátis o servidor dorme depois de 15 min parado. O primeiro a abrir a sala vê
     "Acordando o servidor…" por até 1 minuto.
2. **Site na Vercel**
   - **Root directory:** `apps/web`. O `vercel.json` já está pronto.
   - Variáveis:
     - `VITE_MAPILLARY_TOKEN`;
     - `VITE_SERVER_URL` = endereço do Render;
     - se for usar o Google, `VITE_STREET_PROVIDER=google` e `VITE_GOOGLE_MAPS_KEY`.
   - Se usar o Google, inclua o domínio da Vercel na restrição da **chave do site**.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Falta configurar o token do Mapillary" | Site sem `VITE_MAPILLARY_TOKEN` |
| "Falta configurar a chave do Google" | `VITE_STREET_PROVIDER=google` sem `VITE_GOOGLE_MAPS_KEY` |
| "Servidor e site usam provedores diferentes" | `STREET_PROVIDER` (servidor) ≠ `VITE_STREET_PROVIDER` (site) |
| Fica em "Conectando…" para sempre | Servidor fora do ar, `VITE_SERVER_URL` errado ou `CORS_ORIGIN` diferente do endereço do site |
| "Nenhum mapa disponível" | Os JSON do provedor escolhido ainda não foram gerados |
| "Imagem indisponível" numa rodada | Foto apagada no provedor. Na sala, o dono usa **Trocar local**; no Neste PC, o lugar é trocado sozinho |
| Porta 5173 ocupada | Use outra porta no Vite (ex.: `--port 5180`) e ajuste o `CORS_ORIGIN` |
