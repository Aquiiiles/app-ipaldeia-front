# job_agent — AI Career Agent local

Agente local para **pesquisar, avaliar, priorizar e preparar candidaturas** de
emprego. Roda inteiramente no seu PC (Windows ou Linux).

> **Este agente NUNCA envia uma candidatura sozinho.**
> Ele pesquisa, analisa, ranqueia e prepara o material. O clique de "enviar" é
> sempre seu. Três portões de aprovação humana ficam entre uma vaga encontrada
> e uma candidatura registrada — e o modo `DRY_RUN=true` (padrão) bloqueia
> qualquer envio, independentemente de tudo o mais.

---

## Índice

1. [O que ele faz](#1-o-que-ele-faz)
2. [Princípios de segurança](#2-princípios-de-segurança)
3. [Setup passo a passo](#3-setup-passo-a-passo)
4. [Uso diário](#4-uso-diário)
5. [Fontes de vagas](#5-fontes-de-vagas)
6. [Como o fit score funciona](#6-como-o-fit-score-funciona)
7. [O fluxo de aprovação](#7-o-fluxo-de-aprovação)
8. [Arquitetura](#8-arquitetura)
9. [Testes](#9-testes)
10. [Solução de problemas](#10-solução-de-problemas)

---

## 1. O que ele faz

```
PESQUISAR → FILTRAR → VERIFICAR RECÊNCIA → DEDUPLICAR → ANALISAR FIT → RANKEAR
    ↓
MOSTRAR PARA VOCÊ  →  VOCÊ APROVA  →  PERSONALIZAR CV  →  PREPARAR CANDIDATURA
    ↓
VOCÊ CONFIRMA  →  VOCÊ APLICA (no navegador)  →  ACOMPANHAR  →  ANALISAR RESULTADOS
```

- Busca em APIs públicas de job boards e nos job board APIs oficiais de ATSs
  (Greenhouse, Lever, Ashby) — nunca por scraping proibido.
- Classifica a **recência** de cada vaga e descarta as antigas sem evidência de
  atualização. **A data de publicação nunca é inventada:** se a fonte não
  informa, o registro diz `desconhecida`.
- **Deduplica** a mesma vaga vinda de fontes diferentes, mantendo uma entrada
  principal — para você nunca aplicar duas vezes.
- Calcula um **fit score 0–100 determinístico** com explicação: o que você já
  tem, o que falta, o que é crítico, o que é *nice to have*.
- Sugere personalização do CV, gera cover letter e respostas — **sempre e
  somente com base nos seus dados reais**.
- Dashboard web local com métricas, pipeline e relatório semanal.

---

## 2. Princípios de segurança

Estas regras são implementadas em código e cobertas por testes, não são só
promessas de documentação:

| Princípio | Como é garantido |
|---|---|
| Nunca envia sem sua aprovação | 3 portões em `app/applications/service.py`; `DRY_RUN` bloqueia o envio |
| Nunca inventa informação sobre você | `app/llm/guard.py` valida todo texto gerado contra seu perfil/CV |
| Nunca chuta resposta de formulário | `app/applications/questions.py` marca `needs_confirmation` |
| Nunca responde perguntas sensíveis | Salário, visto, diversidade e dados pessoais são bloqueados |
| Nunca burla CAPTCHA/MFA/anti-bot | Detecta e **para**, devolvendo o controle a você |
| Respeita robots.txt e rate limits | `app/crawler/fetcher.py`: robots.txt, `Crawl-delay`, `Retry-After` |
| Nunca loga segredos | `app/logging_setup.py` mascara chaves, tokens, senhas e cookies |
| Nunca aplica duas vezes | Guarda anti-duplicata que cobre também as duplicatas ligadas |
| Nunca altera seu CV original | Versões adaptadas vão para `data/generated/resumes/` |

---

## 3. Setup passo a passo

### 3.1. Instalar Python

Você precisa de **Python 3.11 ou superior**.

**Windows** — baixe em <https://www.python.org/downloads/> e marque
*"Add Python to PATH"* durante a instalação. Verifique:

```powershell
python --version
```

**Linux (Ubuntu/Debian)**:

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip
python3 --version
```

### 3.2. Criar o ambiente virtual

Entre na pasta do projeto:

```bash
cd job_agent
```

**Linux / macOS:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell):**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> Se o PowerShell recusar o script, rode uma vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Com o venv ativo, o prompt mostra `(.venv)`.

### 3.3. Instalar as dependências

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Opcionais (só se você quiser LLM ou automação de navegador):

```bash
pip install -r requirements-optional.txt
python -m playwright install chromium
```

### 3.4. Configurar o `.env`

```bash
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Abra o `.env` e ajuste. O mínimo é o seu e-mail de contato:

```ini
DRY_RUN=true
CONTACT_EMAIL=seu.email@exemplo.com
USER_AGENT=job-agent/0.1 (+contato: seu.email@exemplo.com)
```

**LLM é opcional.** Sem chave, o sistema usa templates determinísticos e
funciona completamente. Se quiser texto mais fluido:

```ini
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sua-chave-aqui
```

> O `.env` está no `.gitignore`. Nunca comite esse arquivo.

### 3.5. Colocar o seu currículo

Coloque **um** arquivo em `resumes/` (PDF, DOCX, MD ou TXT):

```bash
cp ~/Documentos/meu-cv.pdf resumes/
```

O sistema lê o **mais recente** da pasta e extrai experiência, tecnologias,
formação, certificações, idiomas, projetos e conquistas. **O original nunca é
alterado.**

### 3.6. Configurar o seu perfil

```bash
# Linux / macOS
cp config/profile.example.yaml config/profile.yaml

# Windows (PowerShell)
Copy-Item config/profile.example.yaml config/profile.yaml
```

Edite `config/profile.yaml`. O arquivo vem **pré-preenchido com o seu perfil**
(Associate Software Engineer na Liferay, Java/Liferay/Elasticsearch, remoto,
Brasil, objetivos de carreira em Spring/cloud/mensageria).

Preencha em especial:

| Campo | Por quê |
|---|---|
| `identity.full_name`, `email` | Vão nas cover letters e respostas |
| `identity.languages[].level` | **Seu nível de inglês está vazio.** Sem ele o agente pede confirmação em toda pergunta sobre idioma |
| `experience.years_by_technology` | Base para responder *"quantos anos de X?"* sem chutar |
| `preferences.target_salary_brl_month` | Usado no score de compensação |

> **Regra de ouro:** só escreva aqui o que for verdade. Este arquivo é a única
> fonte de fatos sobre você, e o agente se recusa a afirmar qualquer coisa que
> não esteja nele ou no seu CV.

### 3.7. Iniciar o banco de dados

```bash
python -m app.cli init
```

Saída esperada:

```
[ok] Banco de dados criado/verificado: sqlite:////.../data/job_agent.db
[ok] Perfil carregado: /.../config/profile.yaml
     Curriculo: meu-cv.pdf
     Tecnologias: docker, elasticsearch, git, gradle, java, liferay, sql, ...
[ok] Fontes configuradas: /.../config/sources.yaml
```

### 3.8. Configurar as fontes

```bash
# Linux / macOS
cp config/sources.example.yaml config/sources.yaml

# Windows (PowerShell)
Copy-Item config/sources.example.yaml config/sources.yaml
```

Os job boards remotos já vêm habilitados. Para acompanhar empresas
específicas, adicione os *board tokens* delas:

```yaml
  - id: greenhouse
    enabled: true
    companies: ["nubank", "stone"]      # de boards.greenhouse.io/<token>

  - id: lever
    enabled: true
    companies: ["quintoandar"]          # de jobs.lever.co/<company>
```

Confira o que está ativo:

```bash
python -m app.cli sources
```

### 3.9. Executar a primeira busca

```bash
python -m app.cli search
```

A busca é deliberadamente lenta: respeita `robots.txt`, o `Crawl-delay` de cada
site e um intervalo mínimo entre requisições. Alguns minutos é normal.

### 3.10. Abrir o dashboard

```bash
python -m app.cli serve
```

Abra <http://127.0.0.1:8765> no navegador.

---

## 4. Uso diário

### Pelo dashboard (recomendado)

```bash
python -m app.cli serve
```

No dashboard você tem: **[Ver vaga]**, **[Analisar]**, **[Aprovar candidatura]**,
**[Preparar candidatura]**, **[Marcar como aplicada]**, **[Ignorar]**,
**[Adicionar nota]**, além de métricas, relatório e o importador manual.

### Pela linha de comando

```bash
python -m app.cli search                    # busca vagas
python -m app.cli list --min-score 70       # lista as vagas rankeadas
python -m app.cli show 12                   # análise completa da vaga 12
python -m app.cli approve 12                # portão 1: aprova a vaga
python -m app.cli prepare 12 \
    --question "How many years of experience do you have with Java?"
python -m app.cli ask "What is your English level?"   # testa uma pergunta
python -m app.cli report --days 7           # relatório
python -m app.cli sources                   # fontes + links manuais
python -m app.cli profile                   # o que o agente sabe sobre você
```

### Automatizar a busca diária (opcional)

**Linux (cron)** — todos os dias às 8h:

```bash
crontab -e
# adicione:
0 8 * * * cd /caminho/para/job_agent && .venv/bin/python -m app.cli search
```

**Windows (Agendador de Tarefas):**

```powershell
schtasks /create /tn "job_agent" /tr "C:\caminho\job_agent\.venv\Scripts\python.exe -m app.cli search" /sc daily /st 08:00
```

---

## 5. Fontes de vagas

### Usadas automaticamente (API pública / feed oficial)

| Fonte | Por que é permitida |
|---|---|
| Remotive | API JSON pública documentada |
| RemoteOK | API JSON pública (exige User-Agent e atribuição — ambos respeitados) |
| Arbeitnow | API JSON pública documentada |
| Himalayas | API JSON pública documentada |
| We Work Remotely | Feeds RSS oficiais |
| Greenhouse | Job Board API oficial, por empresa |
| Lever | Postings API oficial, por empresa |
| Ashby | Posting API oficial, por empresa |

As fontes de ATS são as mais valiosas: trazem a **data de publicação real** e
vêm direto da empresa.

### **NÃO** raspadas — por decisão de compliance

**LinkedIn, Indeed, Glassdoor, Gupy e Vagas.com** proíbem scraping automatizado
nos Termos de Uso. O agente **não faz nenhuma requisição a esses sites**.

Em vez disso ele oferece duas coisas:

1. **Links de busca prontos** (já filtrados por remoto e últimos 7 dias) na aba
   *Fontes* do dashboard, ou via `python -m app.cli sources`.
2. **Importação manual:** cole título, empresa, URL e descrição no dashboard. A
   vaga passa pelo **mesmo** pipeline — recência, dedupe, fit, ranking.

> Se você não sabe a data de publicação, **deixe o campo vazio**. O sistema
> registra `desconhecida` em vez de fingir recência.

---

## 6. Como o fit score funciona

O score é **100% determinístico**: o mesmo perfil e a mesma vaga sempre
produzem o mesmo número. Nenhum LLM participa do cálculo. Os pesos ficam em
`config/profile.yaml` e podem ser alterados.

| Dimensão | Peso | O que mede |
|---|---:|---|
| Compatibilidade de experiência | 25 | Anos exigidos × seus anos |
| Stack técnica | 25 | Cobertura da stack, com bônus para a linguagem central |
| Nível da vaga | 20 | Nível anunciado × níveis desejados |
| Modalidade/localização | 10 | Remoto e aceitação de contratação no Brasil |
| Senioridade exigida | 10 | Exigência real no corpo do anúncio |
| Potencial de crescimento | 5 | Tecnologias novas alinhadas aos seus objetivos |
| Salário/compensação | 5 | Faixa × seu alvo (desconhecido = neutro) |

A **recência é um multiplicador** aplicado ao final, não uma dimensão: uma vaga
perfeita mas velha não compete de igual para igual com uma perfeita e nova.

| Score | Classificação |
|---|---|
| 90–100 | **EXCELENTE** |
| 80–89 | **MUITO BOA** |
| 70–79 | **BOA / AVALIAR** |
| 60–69 | **STRETCH** |
| < 60 | **NÃO PRIORITÁRIA** |

### Filtros: sinalizar, não apagar

Apenas **três** motivos descartam uma vaga de verdade: recência expirada
(>60 dias sem atualização), vaga encerrada e exclusão explícita do Brasil.

Todo o resto — senioridade acima, experiência acima, presencial, híbrida,
frontend-only, suporte-sem-dev — apenas **reduz a prioridade** e vira uma flag
visível, com o motivo escrito. Vagas *stretch* aparecem de propósito, para
você decidir.

---

## 7. O fluxo de aprovação

Três portões independentes, todos seus:

```
        [vaga encontrada: FOUND]
                  │
   PORTÃO 1 ──────┤  você aprova a VAGA          → APPROVED
                  │
                  ├─ o agente prepara o material (CV, cover letter, respostas)
                  │  ↳ funciona em DRY_RUN; nada é enviado
                  │
   PORTÃO 2 ──────┤  você aprova o MATERIAL      → approved_by_user
                  │  ↳ bloqueado se houver resposta pendente de confirmação
                  │
   PORTÃO 3 ──────┤  você confirma o ENVIO       → exige DRY_RUN=false
                  │
                  ├─ VOCÊ aplica, no navegador. O agente não clica em "enviar".
                  │
                  └─ você registra: [Marcar como aplicada] → APPLIED
```

Além disso: preparar novamente **reseta** as aprovações anteriores (material
novo exige aprovação nova), e não existe transição de `FOUND` direto para
`APPLIED`.

### Modo DRY_RUN

Com `DRY_RUN=true` (padrão) o sistema **pode** pesquisar, analisar, preparar
candidatura, gerar CV e gerar respostas; e **não pode** enviar nada. Nem o
portão 3 abre. Para habilitar envio, `DRY_RUN=false` no `.env` — e ainda assim
os três portões continuam obrigatórios.

### Perguntas de candidatura

Quando o agente encontra uma pergunta, ele busca a resposta no seu perfil:

```
PERGUNTA: How many years of experience do you have with Java?
RESPOSTA SUGERIDA: 2
Base: profile.yaml → experience.years_by_technology.java = 2
✓ pode ser usada
```

Se não houver base factual, ele **não chuta**:

```
PERGUNTA: How many years of experience do you have with Kubernetes?
RESPOSTA SUGERIDA: (nenhuma)
Motivo: 'kubernetes' não tem anos declarados em profile.yaml.
        Não vou chutar um número.
[CONFIRMAR] [EDITAR]
```

Perguntas sobre **salário, visto/imigração, diversidade, dados pessoais,
referências e data de início nunca são respondidas automaticamente**.

### Automação de navegador

`app/browser/assist.py` abre um navegador **visível** com perfil persistente
(você faz login uma vez, à mão) e devolve o controle. Ele:

- **não** resolve nem contorna CAPTCHA, Cloudflare, MFA ou anti-bot;
- **não** simula comportamento humano para escapar de detecção;
- **não** preenche nem envia formulários;
- detecta CAPTCHA/MFA/login e **para**, avisando você.

---

## 8. Arquitetura

```
job_agent/
├── app/
│   ├── settings.py            # .env, DRY_RUN, caminhos
│   ├── formatting.py          # formatação pt-BR
│   ├── logging_setup.py       # logging com redação de segredos
│   ├── models/                # enums, perfil (Pydantic), vaga, fit
│   ├── database/              # schema SQLAlchemy, engine, repositório
│   ├── sources/               # uma classe por fonte + registro
│   │   ├── boards.py          #   APIs públicas de job boards
│   │   ├── ats.py             #   Greenhouse / Lever / Ashby
│   │   ├── rss.py             #   feeds RSS oficiais
│   │   └── manual.py          #   links + importação manual
│   ├── crawler/
│   │   ├── fetcher.py         # robots.txt, rate limit, detecção anti-bot
│   │   ├── extract.py         # senioridade, modalidade, stack, anos
│   │   ├── recency.py         # classificação de recência
│   │   ├── salary.py          # parsing conservador de salário
│   │   ├── dedupe.py          # deduplicação em 3 níveis
│   │   ├── normalize.py       # RawJob → NormalizedJob
│   │   └── pipeline.py        # orquestração da busca
│   ├── ranking/
│   │   ├── filters.py         # filtros (sinalizam, não apagam)
│   │   └── fit.py             # score determinístico + explicação
│   ├── llm/
│   │   ├── client.py          # provedor opcional (Anthropic/OpenAI/nenhum)
│   │   └── guard.py           # GUARD ANTI-INVENÇÃO
│   ├── resume/parser.py       # leitura de PDF/DOCX/MD/TXT
│   ├── applications/
│   │   ├── service.py         # OS TRÊS PORTÕES DE APROVAÇÃO
│   │   ├── questions.py       # respostas fundamentadas
│   │   ├── cover_letter.py    # cover letter e mensagem
│   │   └── resume_tailor.py   # personalização do CV
│   ├── browser/assist.py      # navegador assistido (sem bypass)
│   ├── reports/metrics.py     # métricas e relatório
│   ├── services/              # carregamento do perfil + CV
│   ├── api/                   # rotas FastAPI
│   ├── dashboard/             # HTML/CSS/JS do dashboard
│   └── cli.py                 # linha de comando
├── config/                    # profile.yaml, sources.yaml (seus dados)
├── data/                      # SQLite + arquivos gerados (ignorado no git)
├── resumes/                   # SEU CV ORIGINAL (ignorado no git)
├── logs/                      # logs com segredos mascarados
└── tests/                     # 317 testes
```

### Decisões de arquitetura

**O fit score é determinístico, não é LLM.** O LLM só redige texto. Isso torna
o ranking testável, auditável e reproduzível — e o sistema funciona sem
nenhuma API key.

**Filtros sinalizam em vez de apagar.** Só 3 motivos descartam de verdade. O
resto é flag com motivo, para você decidir.

**A data de publicação nunca é preenchida por inferência.** `posted_at` é
`NULL` quando desconhecido; `discovered_at` é um campo separado.

**A camada de rede tem uma única saída para bloqueio: parar.** Não há
retentativa agressiva, rotação de user-agent, nem qualquer tentativa de
evasão.

### Banco de dados

| Tabela | Papel |
|---|---|
| `jobs` | Vagas: dados, recência, score, recomendação, status, flags |
| `job_duplicates` | Liga cada duplicata à sua entrada canônica |
| `applications` | Candidaturas + a trilha de aprovação dos 3 portões |
| `application_answers` | Respostas, com base factual e flag de confirmação |
| `interviews` | Entrevistas: data, tipo, perguntas, notas, resultado |
| `notes` | Suas anotações por vaga |
| `source_runs` | Auditoria de cada execução de busca, por fonte |

Estados: `FOUND → REVIEW → APPROVED → READY_TO_APPLY → APPLIED → SCREENING →
INTERVIEW → TECHNICAL_INTERVIEW → OFFER`, mais `REJECTED`, `WITHDRAWN`,
`IGNORED`, `DUPLICATE`. As transições válidas são declaradas em
`app/models/enums.py` e checadas no repositório.

---

## 9. Testes

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

Cobertura por área:

| Arquivo | O que verifica |
|---|---|
| `test_recency.py` | Cortes de recência; data desconhecida nunca inventada |
| `test_parsing.py` | Senioridade, modalidade, stack, anos, salário |
| `test_dedupe.py` | Duplicatas entre fontes; escolha da entrada canônica |
| `test_fit.py` | Score determinístico, limitado, pesos, classificação |
| `test_filters.py` | Filtros duros × suaves; vagas *stretch* preservadas |
| `test_storage.py` | Upsert, duplicatas, transições de status inválidas |
| `test_no_fabrication.py` | **Guard anti-invenção**; perguntas sem base |
| `test_approval_flow.py` | **Os 3 portões e o DRY_RUN** |
| `test_sources.py` | Payloads das APIs; datas honestas; compliance |
| `test_recommendations.py` | Análise, métricas, relatório |
| `test_resume_and_security.py` | Leitura de CV; redação de segredos; anti-bot |
| `test_api.py` | Fluxo completo end-to-end via HTTP |

Rodar um grupo específico:

```bash
python -m pytest tests/test_approval_flow.py -v
python -m pytest tests/test_no_fabrication.py -v
```

---

## 10. Solução de problemas

**`Perfil nao encontrado em .../config/profile.yaml`**
→ `cp config/profile.example.yaml config/profile.yaml` e edite.

**`Nenhum curriculo encontrado em resumes/`**
→ Coloque um PDF/DOCX/MD/TXT em `resumes/`. O sistema funciona sem CV, mas o
perfil fica mais pobre.

**Uma fonte retorna `status=error` ou `403`**
→ Normal e isolado: uma fonte com problema não derruba as outras. Veja o motivo
em *Status → Últimas execuções* no dashboard. Se persistir, desabilite a fonte
em `config/sources.yaml`. Se você estiver atrás de proxy corporativo ou VPN, ele
pode estar bloqueando o acesso.

**`INTERVENCAO HUMANA NECESSARIA`**
→ O site apresentou CAPTCHA, bloqueio anti-bot ou exige login. **Isso é o
comportamento correto:** o agente não contorna esses mecanismos. Abra a URL
manualmente, ou desabilite a fonte.

**A busca está lenta**
→ De propósito. Para acelerar com responsabilidade, ajuste
`MIN_SECONDS_BETWEEN_REQUESTS` no `.env` — mas nunca abaixo do `Crawl-delay`
pedido pelos sites, que continua sendo respeitado de qualquer forma.

**`Texto bloqueado pelo guard anti-invencao`**
→ O texto gerado afirmava algo que não está no seu perfil/CV. Ou o dado é
verdade e falta em `config/profile.yaml` (adicione), ou não é verdade (e o
guard fez exatamente o seu trabalho).

**Muitas perguntas pedindo confirmação**
→ Preencha `experience.years_by_technology` e
`identity.languages[].level` em `config/profile.yaml`. Depois:
`python -m app.cli profile` para conferir, ou o botão *Recarregar perfil* no
dashboard.

**A porta 8765 está em uso**
→ `python -m app.cli serve --port 9000`

---

## Próximos passos (fora do MVP)

Deliberadamente **não** implementados nesta versão:

- Preenchimento automático de formulários (mesmo com aprovação) — exige lidar
  caso a caso com cada ATS e aumenta muito o risco de erro.
- Envio de e-mail em seu nome.
- Geração de PDF do CV adaptado (hoje sai em Markdown, para você revisar e
  exportar).
- Detecção automática de vaga encerrada por re-verificação periódica.

O caminho natural de evolução é: **PDF do CV adaptado** → **re-verificação de
vagas abertas** → **preenchimento assistido de formulário com você olhando**.
