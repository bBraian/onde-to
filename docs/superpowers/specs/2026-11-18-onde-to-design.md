# Onde Tô? — design

> Nome provisório. Data: 2026-11-18.

## Intenção

Um jogo de navegador de adivinhar onde uma foto de rua foi tirada, para jogar com
4–5 amigos numa chamada do Discord, e também sozinho, como treino.

As mecânicas são as do gênero: rodadas, palpite num mapa, pontuação pela
distância e duelo com barras de vida. O nome, o visual e o código são próprios.
Nada do GeoGuessr entra no projeto: nem o nome, a marca, a arte ou o layout, nem
código ou arquivos do site deles. O jogo também não usa engenharia reversa do
GeoGuessr.

## Objetivos

- **Sala ao vivo**: alguém cria a sala e recebe um código. Os amigos entram só com
  um apelido, sem login. Todos jogam a mesma rodada ao mesmo tempo.
- **Dois modos na sala**: Clássico e Duelo em times.
- **Treino**: o mesmo jogo, sozinho, rodando só no navegador.
- **Mapas**: Brasil, Capitais do Brasil, Capitais do Mundo e Mundo. Adicionar um
  mapa novo deve ser fácil.
- **Configurável**: rodadas, tempos, movimento, vida e multiplicador são escolhidos
  no lobby.

## Não-objetivos (v1)

- Contas, login, perfis, histórico no servidor e ranking global.
- Editor de mapas na interface. Um mapa novo é criado rodando o script de mapas.
- Atividade do Discord (o jogo aberto dentro da chamada). Pode vir depois, em cima
  desta arquitetura.
- Outros modos, como battle royale ou sequência de países.
- Anti-trapaça. É um jogo entre amigos.
- Celular como alvo principal. Deve abrir no celular, mas o foco é o desktop.

## Anti-objetivos

O projeto fracassa, mesmo funcionando, se:

- ele lembrar o GeoGuessr no nome, no logo, nas cores ou no layout;
- a partida travar ou atrasar porque alguém trocou de aba para o Discord;
- as rodadas caírem com frequência em foto preta, quebrada ou de baixa qualidade;
- a interface revelar o local certo antes do fim da rodada.

## Restrições

- **Imagens**: Mapillary, com a API v4 (`graph.mapillary.com`) e o visor MapillaryJS
  4.x. O *client token* é público e vai no front-end.
  - Na busca de imagens (`/images`), o `bbox` precisa ter área menor que
    0,01 grau². O `limit` vai até 2000. `is_pano` só funciona junto com `bbox`. A
    chamada precisa listar os `fields` que quer receber.
  - Limites de uso: 10.000 buscas por minuto e 60.000 chamadas de entidade por
    minuto, por app.
  - Créditos: mostrar "© Mapillary" com link para mapillary.com. Os termos de uso
    ainda precisam ser conferidos antes de publicar.
  - A cobertura é desigual. Tem muito mais foto na Europa e nos EUA. No Brasil é
    boa nas capitais e fraca no interior.
- **Hospedagem**: o site vai na Vercel. O servidor vai no Render, plano grátis, que
  aceita WebSocket mas dorme depois de 15 minutos parado e leva cerca de 1 minuto
  para acordar. O site precisa mostrar um estado de "acordando o servidor…".
- **Abas em segundo plano**: os navegadores atrasam os cronômetros dessas abas.
  Todo tempo que decide o jogo é controlado pelo servidor, que envia o prazo como
  horário absoluto (epoch ms). O cliente só mostra a contagem.
- **Salas em memória**: se o servidor reiniciar, as salas abertas se perdem. Isso é
  aceitável.

## Abordagens

| | Abordagem | Resultado |
|---|---|---|
| **A** | Servidor Node + Socket.IO no Render, que manda no jogo, e site React + Vite na Vercel | **Escolhida.** O cronômetro é confiável, o local certo fica guardado no servidor e as salas vivem em memória, sem banco. O custo é a espera de cerca de 1 minuto quando o servidor está dormindo. |
| B | Supabase Realtime, com o navegador de quem criou a sala mandando no jogo | Descartada. Se essa pessoa trocar de aba para o Discord, os cronômetros atrasam e a partida trava para todos. |
| C | Atividade do Discord | Adiada. Exige a abordagem A, mais um app registrado no Discord e um proxy para as imagens. Pode ser feita depois em cima da A. |

## Regras do jogo

### Pontuação (igual em todos os modos e no treino)

- `d` é a distância, pela fórmula de haversine, entre o palpite e o local certo, em km.
- `pontos = round(5000 · e^(−10·d / D))`.
- `D` é o tamanho do mapa: a distância entre os cantos opostos do retângulo que
  envolve todos os pontos do mapa. O script de mapas calcula esse valor e grava no
  arquivo. O mapa Mundo usa `D = 14916,862 km`.
- Palpite a até 25 m do local vale 5000. Quem não chutou faz 0.
- A mesma função roda no servidor e no treino, num pacote compartilhado.

### Clássico

- Cada jogador soma os próprios pontos ao longo de N rodadas.
- A rodada termina quando todos chutaram ou quando o tempo acaba. O host tem um
  botão "encerrar rodada", útil quando não há limite de tempo.
- O jogador pode mover o pin à vontade até clicar em **Chutar**. Depois disso o
  palpite fica travado.
- Na tela de resultado da rodada aparecem o local certo, os pins de todos, uma
  linha de cada pin até o local, a distância e os pontos de cada um e o placar
  acumulado.
- A próxima rodada começa quando o host clica em "Próxima" ou, sem clique, depois
  de um tempo de avanço automático.
- No fim aparece o pódio, com o total e o resumo por rodada, e um botão "jogar de
  novo" que leva de volta ao lobby, na mesma sala.

### Duelo em times

- No lobby, cada jogador escolhe o Time A ou o Time B, e o host pode trocar
  jogadores de time. É preciso ter pelo menos uma pessoa em cada time. Um 1 contra
  1 são simplesmente dois times de uma pessoa.
- Cada time tem uma barra de vida (padrão 6000).
- Quando alguém chuta, começa uma contagem de X segundos (padrão 15) para todos os
  outros. A contagem só vale se o tempo restante da rodada for maior que X. A rodada
  termina quando todos chutaram ou quando o tempo acaba.
- Os pontos de um time na rodada são os do melhor palpite entre os seus jogadores,
  ou 0 se ninguém do time chutou.
- O time com menos pontos perde de vida `(pontos do maior − pontos do menor) ×
  multiplicador`. Em caso de empate, ninguém perde vida.
- O multiplicador fica em 1,0 até a rodada 4 e sobe 0,5 a cada rodada a partir da
  5ª (1,5, depois 2,0, …). As duas coisas são configuráveis: a rodada em que ele
  começa a subir e o quanto sobe.
- O duelo acaba quando um time chega a 0 de vida. Como não há número fixo de
  rodadas, os pontos são sorteados sem repetição dentro da partida.
- Na tela de resultado da rodada aparecem os pins com a cor de cada time, os pontos
  de cada time, o dano e as barras de vida.

### Movimento

O movimento é uma opção da sala, e também do treino:

| Opção | Comportamento |
|---|---|
| Pode andar (padrão) | A navegação do MapillaryJS fica ligada, e um botão "voltar ao início" leva de volta ao ponto de partida. |
| Sem andar | A navegação fica desligada. Dá para girar e dar zoom. |
| Sem andar, girar ou dar zoom | A visão fica fixa. |

### Configurações da sala

| Configuração | Padrão | Faixa |
|---|---|---|
| Mapa | Brasil | mapas disponíveis |
| Modo | Clássico | Clássico / Duelo |
| Rodadas (Clássico) | 5 | 1–20 |
| Tempo por rodada | 120 s | 10–600 s ou sem limite |
| Movimento | Pode andar | 3 opções |
| Vida inicial (Duelo) | 6000 | 1000–20000 |
| Tempo após o primeiro chute (Duelo) | 15 s | 5–60 s |
| Multiplicador (Duelo) | sobe a partir da rodada 5, +0,5 | rodada 2–10, +0,1–1,0 |
| Avanço automático após o resultado | 30 s | 10–120 s ou desligado |

Só o host muda as configurações e inicia a partida.

### Sala e conexão

- O código tem 4 caracteres, sem os ambíguos (0/O, 1/I). O link é `/sala/K7QX`.
- Ao entrar, a pessoa digita um apelido, que fica salvo no `localStorage`. Não há
  login.
- O host é quem criou a sala. Se ele sair, o papel passa para o jogador há mais
  tempo na sala.
- **Reconexão**: o cliente guarda um token de sessão no `localStorage`. Quem volta
  com o mesmo token recupera o lugar, os pontos, o time e o palpite da rodada. Se a
  pessoa não voltar até o fim da rodada, conta como "não chutou".
- Quem entra com a partida em andamento fica assistindo até a próxima partida.
- O limite é de 8 jogadores por sala. Uma sala vazia some depois de 10 minutos.
- O servidor só envia as coordenadas do local certo quando a rodada termina.
  Durante a rodada o cliente recebe apenas o `imageId`. Esse id permite descobrir o
  local consultando a API, e isso é aceito porque anti-trapaça não é objetivo. O
  que importa é que a interface não mostre o local. O link de créditos aponta para
  a página inicial do Mapillary, e o autor da foto só aparece no resultado da
  rodada.

### Treino

- Roda só no navegador, sem servidor.
- O jogador escolhe o mapa, as rodadas, o tempo (ou sem limite) e o movimento.
- O fluxo é o mesmo do Clássico, com um jogador: rodada, resultado, resumo final.
- O recorde de cada combinação de mapa e configuração fica salvo no `localStorage`.

## Mapas

Cada mapa é um arquivo JSON estático, lido pelo site e pelo servidor:

```json
{ "id": "brasil", "nome": "Brasil", "tamanhoKm": 4890.2,
  "pontos": [{ "imageId": "…", "lat": -23.5, "lng": -46.6, "regiao": "SP" }] }
```

O script `build-maps` é rodado à mão, com o token, e faz o seguinte para cada mapa:

1. Divide o mapa em regiões com pesos: estados (limites do IBGE), países (Natural
   Earth, domínio público) ou um raio de cerca de 10 km em volta de cada capital.
2. Sorteia um ponto dentro de uma região e busca imagens 360° (`is_pano=true`) num
   `bbox` de cerca de 0,09° × 0,09° em volta dele. Para a posição usa
   `computed_geometry`, com `geometry` como reserva.
3. Fica com uma imagem que tenha `quality_score ≥ 0,5`, quando esse valor existe.
4. Descarta pontos muito próximos de outros já escolhidos no mesmo mapa.
5. Repete até chegar à quantidade alvo e no fim mostra quantos pontos cada região
   recebeu.

| Mapa | Alvo | Distribuição |
|---|---|---|
| Brasil | 500 | por estado, com peso pela área e um mínimo por estado |
| Capitais do Brasil | ~400 | cerca de 15 por capital, dentro de 10 km do centro |
| Capitais do Mundo | ~500 | cerca de 3 por capital que tenha cobertura |
| Mundo | 1000 | por país, com peso pela área e um teto por país para não encher de Europa e EUA |

Só entram fotos 360°. Se um mapa não atingir o alvo, ele sai menor, com o mínimo de
100 pontos, e o script avisa.

## Telas

```
Início ─► Criar sala / Entrar com código ─► Lobby ─► Rodada ⇄ Resultado da rodada ─► Fim
      └─► Treino (escolhe mapa e regras) ──────────► Rodada ⇄ Resultado da rodada ─► Resumo
```

- **Início**: três botões: Criar sala, Entrar com código e Treino.
- **Lobby**: o código da sala com um botão de copiar o link, a lista de jogadores
  (separada em dois times no Duelo), as configurações (que só o host edita) e o
  botão Iniciar.
- **Rodada**: o visor do Mapillary em tela cheia, um minimapa no canto que aumenta
  ao passar o mouse, o cronômetro, o botão Chutar e a indicação de quem já chutou.
  No Duelo aparecem também as barras de vida.
- **Resultado da rodada**: um mapa grande com os pins, as linhas até o local certo e
  a tabela da rodada.
- **Fim / Resumo**: o pódio ou o time vencedor, o resumo por rodada e o botão de
  jogar de novo.

## Tecnologia (decisões tomadas)

- Monorepo com pnpm, em quatro partes:
  - `apps/web`: React + Vite + TypeScript;
  - `apps/server`: Node + TypeScript + Socket.IO;
  - `packages/shared`: tipos dos eventos, pontuação e regras do duelo;
  - `scripts/build-maps`: o script de mapas.
- O mapa de palpite e de resultado usa MapLibre GL JS com o mapa base do
  OpenFreeMap, que é grátis e não pede chave.
- Testes:
  - Vitest para as regras do pacote compartilhado (pontuação, dano e fim de rodada)
    e para o servidor, simulando uma sala com vários clientes Socket.IO;
  - Playwright para um fluxo de sala ponta a ponta, com dois navegadores.
- Variáveis de ambiente: `VITE_MAPILLARY_TOKEN` e `VITE_SERVER_URL` no site, e a
  origem permitida no CORS do servidor.

## O que fica para o builder

- O protocolo exato dos eventos do Socket.IO e a máquina de estados da sala.
- A estrutura dos componentes e a forma de estilizar.
- Os parâmetros finos do script de mapas, como o tamanho do bbox, a distância
  mínima entre pontos e os pesos.
- Quais componentes do MapillaryJS desligar em cada opção de movimento.
- O visual: identidade própria, longe do roxo com amarelo e do layout do GeoGuessr.
  Antes de montar as telas, o builder mostra mockups para o dono aprovar.
