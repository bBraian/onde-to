# Onde Tô? v2 — design

> 2026-11-19. Complementa `2026-11-18-onde-to-design.md`, que continua valendo para tudo o
> que este documento não muda.
>
> Mockups aprovados: canvas https://claude.ai/artifact/T1UWzK7YVCViaNjZL4dbjh, linha "v2"
> (Pin, Avatar, Alternativas, Início, Lobby, Rodada e Resultado).

## Intenção

O dono quer um jogo **diferenciado**. A v2 tem cinco frentes:

1. **Visual cartoon:** contornos grossos, sombras "de adesivo", fontes arredondadas e cores
   vivas.
2. **Avatar personalizável:** o "Alfinete", um alfinete de mapa com rosto. No mapa, o palpite
   de cada jogador é o próprio avatar.
3. **Animações:** o jogo fica mais suave e interativo.
4. **Modo "Neste PC":** de 1 a 8 jogadores no mesmo computador. O dono configura entre dois
   modos de palpite e duas pontuações.
5. **Google Street View como alternativa ao Mapillary**, escolhida por configuração. O
   Mapillary continua sendo o padrão.

## Objetivos

- Todas as telas no estilo cartoon dos mockups v2.
- Um avatar Alfinete por jogador, editável e salvo no navegador. Ele aparece no lobby, nos
  placares, no mapa de palpite e nos pinos do mapa de resultado.
- As animações da lista abaixo, todas desligadas quando o sistema pede "reduzir movimento".
- O modo "Neste PC", que substitui o Treino. Um jogador equivale ao Treino de hoje.
- A pontuação "Rodada" (o mais próximo da rodada faz 1 ponto), no modo local e no Clássico
  online.
- A troca entre Mapillary e Google por configuração, com uma lista de lugares por provedor.

## Não-objetivos (v2)

- Contas, foto como avatar e upload de imagem.
- Sons e música.
- O modo "mesmo mapa" e o modo "turnos" na sala online. A sala segue com todos jogando ao
  mesmo tempo, cada um na sua tela.
- O Google como padrão. Sem a chave do Google, o jogo usa o Mapillary.
- Modo escuro: a v2 usa só o tema claro (veja Decisões).

## Anti-objetivos

O projeto falha, mesmo funcionando, se:

- alguma animação travar o jogo: nada pode bloquear um clique por mais de ~600 ms, e as
  animações longas, como contar pontos e confete, não podem atrasar os botões;
- o visual cartoon prejudicar a leitura: o texto precisa de contraste de pelo menos 4.5:1, e
  de 3:1 em texto grande e negrito;
- o jogo lembrar o GeoGuessr no nome, no logo, nas cores ou no layout;
- quebrar o que já funciona: a sala online, a reconexão e os testes atuais continuam verdes;
- no modo "Neste PC" com turnos, um jogador conseguir ver o palpite do anterior.

## Restrições

- Tudo da spec v1 continua valendo: pt-BR, créditos do Mapillary, tempo controlado pelo
  servidor e resposta escondida até o resultado.
- **Google Maps Platform:**
  - o panorama interativo (Dynamic Street View) é cobrado por instância criada: 5.000 por
    mês grátis, depois US$ 14 a cada 1.000;
  - a consulta Metadata é grátis e sem limite;
  - o logo e os termos do Google ficam visíveis no panorama e não podem ser escondidos;
  - a chave é restrita por domínio.
- **O dono ainda não tem conta no Google Cloud.** A parte do Google precisa ficar pronta e
  testada com simulação, e entra no ar só com `VITE_STREET_PROVIDER=google` mais a chave.
- **Fontes:** Fredoka (títulos) e Nunito (texto), do Google Fonts, ambas sob licença OFL.

## Abordagens

| Frente | Escolhida | Descartada e por quê |
|---|---|---|
| Visual | Reescrever os tokens e o CSS com o estilo v2; animações com **Motion** (`motion/react`) e **canvas-confetti** | Biblioteca de componentes (shadcn, Chakra): briga com o visual "adesivo" |
| Avatar | Componente SVG próprio (o desenho do `Pin.dc.html` do mockup) | DiceBear: o estilo não é nosso e algumas coleções exigem atribuição |
| Neste PC | Generalizar o reducer do Treino para N jogadores | Passar pelo servidor: deixaria de funcionar offline |
| Pontuação "Rodada" | Função única em `packages/shared`, usada no modo local e na sala | — |
| Google | Um visor por provedor e uma lista de lugares por provedor, gerada com a Metadata do Google | Converter os pontos do Mapillary na hora: perderia a cobertura maior do Google e dependeria de lugares em comum |

## Detalhes

### 1. Visual v2

| Token | Valor |
|---|---|
| Fundo | creme `#FFF6E5` com bolinhas (`radial-gradient`, 22 px) |
| Tinta (contorno e texto) | `#17231E` |
| Cartão | `#FFFFFF` |
| Primário | verde `#1A7A50` (texto branco) |
| Destaque | laranja `#FF6B35` |
| Amarelo | `#FFC93C` |
| Azul | `#3A86FF` |
| Céu | `#BDE7FF` |
| Perigo / tempo acabando | `#E63946` |
| Time A | cabeçalho `#C2410C`, fundo `#FFE3D6` |
| Time B | cabeçalho `#1D4ED8`, fundo `#DCEBFF` |

- **Contorno:** 3 px de tinta (4 px em mapas).
- **Raios:** de 14 a 28 px.
- **Sombra de cartão:** `6px 6px 0` de tinta.
- **Botão:** sombra `0 5px 0` de tinta. Sobe 3–4 px no hover e afunda (`translateY(4px)`,
  com a sombra encolhendo) quando é clicado.
- **Fontes:** títulos em Fredoka 700 e texto em Nunito 700/800.
- **Telas:** seguem os mockups v2. As telas sem mockup (Treino/Local, Fim e mensagens) usam os
  mesmos tokens e padrões.

### 2. Avatar "Alfinete"

- **Modelo, no pacote shared:**
  ```ts
  type Avatar = { color: string; eyes: 'normal'|'feliz'|'oculos'|'piscando'|'brilho';
                  mouth: 'sorriso'|'risada'|'lingua'|'surpreso';
                  acc: 'nenhum'|'bone'|'explorador'|'fone'|'coroa'|'gorro' };
  ```
- **Cores:** são 8, com nome:
  `#FF6B35` Laranja, `#1A7A50` Verde, `#3A86FF` Azul, `#FFC93C` Amarelo, `#FF8FAB` Rosa,
  `#2EC4B6` Turquesa, `#8D6E63` Marrom e `#E63946` Vermelho.
- **Funções:** `sanitizeAvatar(x): Avatar` (valor inválido vira o padrão) e
  `randomAvatar(rng): Avatar`.
- **Componente:** `<PinAvatar avatar size />` desenha o SVG do mockup (`Pin.dc.html`).
- **Editor:** a rota `/avatar`, com o layout do mockup "Editor de avatar".
  - O apelido também é editado ali, o que resolve o "não dá pra trocar o apelido".
  - Ele é aberto pelo chip "Você · editar" do Início e por um botão "Editar" no lobby, antes
    da partida.
  - No modo "Neste PC", o mesmo editor abre num modal para cada jogador.
- **Persistência:** o avatar fica salvo no `localStorage` (`onde-to:avatar`). Na primeira
  visita, ele é sorteado.
- **Online:**
  - `room:create` e `room:join` levam o `avatar`, que o servidor sanitiza e guarda.
  - `PlayerView` ganha `avatar`.
  - Um evento novo, `room:avatar`, troca o avatar no lobby.
- **No mapa:**
  - o pino do palpite é o meu avatar;
  - no resultado, cada palpite é o avatar do dono;
  - no Duelo, a cor do time aparece como um anel ou etiqueta ao lado do nome, e o avatar
    mantém a cor dele.

### 3. Animações

| Onde | O que |
|---|---|
| Botões e cartões | sobem no hover e afundam ao clicar |
| Lobby | avatar entra com "pop"; avatares balançam enquanto esperam; botão "Começar" pulsa (só para o host) |
| Mapa de palpite | o pino faz "boing" ao ser colocado ou movido |
| Cronômetro | pulsa e fica vermelho nos últimos 10 s |
| Resultado | a bandeira do local certo "pop"; os pinos caem um a um com quique (escalonados 150 ms); os pontos contam de 0 até o valor em ~800 ms |
| Duelo | a barra de vida do time atingido treme e desce animada |
| Fim | confete no pódio; confete curto no 5000 perfeito |
| Troca de tela | deslize ou esmaecimento curto (≤ 250 ms) |
| Modo turnos | a tela "Vez de X" entra com o avatar grande pulando |

- Tudo respeita `prefers-reduced-motion` (`MotionConfig reducedMotion="user"` e uma media
  query no CSS).
- Nenhuma animação bloqueia um botão.

### 4. Modo "Neste PC"

O cartão Treino do Início vira **"Neste PC"**, na rota `/local`.

**Configuração da partida:**
- **Jogadores (1 a 8):** cada um com apelido e avatar. O jogador 1 vem do avatar e do
  apelido salvos.
- **Cores:** únicas na partida. O editor desativa as cores já usadas, e cada jogador novo
  recebe uma cor livre.
- **Regras:** mapa, rodadas, tempo, movimento, modo de palpite e pontuação.
- **Com 1 jogador:** o modo de palpite fica escondido.
- **Recorde:** só vale com 1 jogador e pontuação Distância, como no Treino de hoje.

**Modo de palpite "Turnos"** (padrão):
- Em cada rodada, cada jogador joga na sua vez.
- Antes da vez aparece a tela "Vez de {apelido}", com o avatar grande e o botão "Tô pronto!".
  Só aí a foto aparece.
- A foto volta ao ponto inicial e o mapa ao enquadramento inicial a cada vez.
- O tempo, quando houver, conta por vez.
- Ao chutar, aparece a tela "Passa pro {próximo}", sem mostrar o palpite.
- Quem joga primeiro gira a cada rodada.

**Modo de palpite "Mesmo mapa":**
- A foto fica aberta e acima do mapa há os chips dos jogadores.
- O chip selecionado define quem está marcando, e o clique no mapa põe o pino daquele
  jogador.
- O botão "Revelar" só funciona quando todos marcaram.
- O tempo, quando houver, é da rodada. Quando acaba, quem não marcou fica "sem palpite".

**Resultado e fim:**
- O resultado de cada rodada mostra os avatares caindo, a tabela, a pontuação do modo e o
  placar acumulado.
- O fim mostra o pódio com confete e os botões "Jogar de novo" e "Mudar jogadores".

### 5. Pontuação "Rodada"

- `roundPoints(results: { playerId: string; distanceKm: number | null }[]): Record<string, number>`.
- Quem tem a menor distância faz 1 ponto. Todos com distância até 1 m a mais da menor também
  fazem 1, para contar empate. Quem não chutou faz 0. Se ninguém chutou, ninguém pontua.
- **Online:** `RoomSettings.scoring: 'distance' | 'rounds'` (padrão `distance`) só vale no
  Clássico.
  - O `total` do jogador soma os pontos do modo.
  - O resultado continua mostrando a distância e os pontos de distância de cada um, como
    informação.
- **Vencedor:** quem tem o maior total. O empate é permitido, com vários vencedores.

### 6. Google Street View

- **Configuração do site:**
  - `VITE_STREET_PROVIDER = 'mapillary' | 'google'` (padrão `mapillary`);
  - `VITE_GOOGLE_MAPS_KEY`.
- **Configuração do servidor:** `STREET_PROVIDER` (mesmos valores). A `RoomView` envia o
  `provider`. Se o site e o servidor estiverem diferentes, a sala mostra "servidor e site
  usam provedores diferentes".
- **Mapas:**
  - os do Google ficam em `packages/shared/maps/google/<id>.json`, e os do Mapillary seguem
    onde estão;
  - `MapPoint.imageId` passa a ser "o id do lugar no provedor": o `image_id` do Mapillary ou
    o `pano_id` do Google;
  - `GameMap` ganha `provider`.
- **Visor:**
  - `<StreetViewer>` escolhe entre o `MapillaryViewer` atual e o `GoogleViewer`;
  - o `GoogleViewer` carrega a API JS com `@googlemaps/js-api-loader` e usa um
    `StreetViewPanorama` **reaproveitado entre as rodadas** (`setPano`), para economizar
    cobrança;
  - endereço e nomes de rua ficam escondidos (`addressControl:false`,
    `showRoadLabels:false`);
  - sem andar: os links e o click-to-go ficam desligados;
  - visão fixa: além disso, uma camada transparente bloqueia arrastar e dar zoom;
  - o logo e os termos do Google continuam visíveis.
- **Script de mapas:**
  - `pnpm build-maps --provider google <ids>` usa as mesmas regiões e consulta
    `streetview/metadata?location=…&radius=…&source=outdoor&key=…` (grátis);
  - só aceita `status: OK` com `copyright` contendo "Google", para excluir fotos 360°
    enviadas por usuários;
  - grava `pano_id` e a posição do panorama.
- **Sem a chave:** o código e os testes ficam prontos com a API simulada. A geração dos mapas
  e o teste com imagem real ficam pendentes até o dono ter a chave.

## Decisões tomadas por quem constrói (para o dono conferir)

- **Avatar:** Alfinete. O dono aprovou os mockups e o Alfinete era o recomendado.
- **Tema:** só o claro na v2. A paleta cartoon foi feita para fundo creme, e um tema escuro
  exigiria uma segunda paleta inteira.
- **Cores do avatar:** são 8 e precisam ser únicas no modo local. Online podem repetir.
- **Turnos:** o primeiro jogador gira a cada rodada.
- **Empate:** fica empatado quem tem distância até 1 m a mais da menor.
- **Treino:** vira o "Neste PC" com 1 jogador.
- **Google:** o provedor é uma configuração de ambiente, não uma escolha no lobby. Escolher no
  lobby exigiria a chave do Google sempre presente.
- **Lista de jogadores local:** a última lista de jogadores e as regras do modo "Neste PC" ficam
  salvas no navegador. A galera não precisa recadastrar a cada partida.
- **Rota antiga:** `/treino` redireciona para `/local`.

## O que fica para quem constrói

- A estrutura de componentes e hooks e a forma de organizar o CSS, desde que use os tokens
  acima.
- As curvas e durações exatas, dentro dos limites acima.
- Os detalhes de como bloquear arrastar e dar zoom no Google na visão fixa.
- Os nomes de eventos novos e campos internos, respeitando o protocolo existente.
