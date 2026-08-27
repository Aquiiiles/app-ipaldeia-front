"""Extracao deterministica de sinais a partir do texto da vaga.

Nada aqui usa LLM: senioridade, modalidade, stack, anos exigidos e salario
sao derivados por regras auditaveis e testaveis.
"""
from __future__ import annotations

import re
import unicodedata

from app.models.enums import Modality, Seniority

# --------------------------------------------------------------------------
# Vocabulario de tecnologias. Chave = nome canonico; valores = sinonimos.
# --------------------------------------------------------------------------
TECH_VOCABULARY: dict[str, list[str]] = {
    "java": ["java", "java 8", "java 11", "java 17", "java 21", "jvm"],
    "kotlin": ["kotlin"],
    "spring": ["spring", "spring framework", "spring mvc"],
    "spring boot": ["spring boot", "springboot"],
    "hibernate": ["hibernate", "jpa"],
    "quarkus": ["quarkus"],
    "micronaut": ["micronaut"],
    "liferay": ["liferay", "dxp"],
    "python": ["python"],
    "node.js": ["node.js", "nodejs", "node js"],
    "go": ["golang", "go lang"],
    "c#": ["c#", ".net", "dotnet", "asp.net"],
    "php": ["php", "laravel"],
    "ruby": ["ruby on rails", "rails"],
    "javascript": ["javascript"],
    "typescript": ["typescript"],
    "react": ["react", "reactjs", "react.js"],
    "angular": ["angular", "angularjs"],
    "vue": ["vue", "vuejs", "vue.js"],
    "rest api": ["rest api", "restful", "rest apis", "api rest", "apis rest"],
    "graphql": ["graphql"],
    "grpc": ["grpc"],
    "microservices": ["microservice", "microservices", "microsservico", "microsservicos", "micro servicos"],
    "distributed systems": ["distributed system", "distributed systems", "sistemas distribuidos"],
    "software architecture": ["software architecture", "arquitetura de software", "design patterns", "clean architecture", "ddd", "domain driven"],
    "sql": ["sql", "relational database", "banco relacional", "modelagem de dados"],
    "postgresql": ["postgresql", "postgres"],
    "mysql": ["mysql", "mariadb"],
    "oracle": ["oracle db", "oracle database", "pl/sql"],
    "sql server": ["sql server", "sqlserver", "t-sql"],
    "mongodb": ["mongodb", "mongo"],
    "redis": ["redis"],
    "elasticsearch": ["elasticsearch", "elastic search", "opensearch", "elk"],
    "kafka": ["kafka"],
    "rabbitmq": ["rabbitmq"],
    "sqs": ["amazon sqs", "aws sqs"],
    "messaging": ["message broker", "mensageria", "pub/sub", "event driven", "event-driven", "filas de mensagens"],
    "docker": ["docker", "container", "containers", "containerizacao"],
    "kubernetes": ["kubernetes", "k8s", "eks", "gke", "aks", "openshift"],
    "aws": ["aws", "amazon web services"],
    "azure": ["azure", "microsoft azure"],
    "gcp": ["gcp", "google cloud"],
    "terraform": ["terraform", "infrastructure as code", "iac"],
    "ci/cd": ["ci/cd", "cicd", "continuous integration", "continuous delivery", "jenkins", "github actions", "gitlab ci"],
    "observability": ["observability", "observabilidade", "monitoring", "monitoramento", "prometheus", "grafana", "datadog", "new relic", "opentelemetry"],
    "automated testing": ["unit test", "unit tests", "testes unitarios", "testes automatizados", "automated test", "junit", "tdd", "integration tests", "testes de integracao", "pytest", "mockito"],
    "gradle": ["gradle"],
    "maven": ["maven"],
    "git": ["git", "github", "gitlab", "bitbucket"],
    "linux": ["linux", "unix", "shell script", "bash"],
    "agile": ["scrum", "agile", "kanban", "metodologias ageis"],
    "code review": ["code review", "pull request", "revisao de codigo"],
    "legacy code": ["legacy", "legado", "codigo legado"],
    "migrations": ["migration", "migracao", "migracoes", "upgrade", "upgrades"],
    "debugging": ["debug", "debugging", "troubleshooting", "root cause"],
}

#: Nomes para EXIBICAO. As chaves canonicas do vocabulario sao minusculas
#: para comparacao; textos enviados a empresas usam a grafia correta.
TECH_DISPLAY_NAMES: dict[str, str] = {
    "java": "Java", "kotlin": "Kotlin", "spring": "Spring",
    "spring boot": "Spring Boot", "hibernate": "Hibernate/JPA",
    "quarkus": "Quarkus", "micronaut": "Micronaut", "liferay": "Liferay",
    "python": "Python", "node.js": "Node.js", "go": "Go", "c#": "C#",
    "php": "PHP", "ruby": "Ruby on Rails", "javascript": "JavaScript",
    "typescript": "TypeScript", "react": "React", "angular": "Angular",
    "vue": "Vue", "rest api": "REST APIs", "graphql": "GraphQL", "grpc": "gRPC",
    "microservices": "microsserviços", "distributed systems": "sistemas distribuídos",
    "software architecture": "arquitetura de software", "sql": "SQL",
    "postgresql": "PostgreSQL", "mysql": "MySQL", "oracle": "Oracle",
    "sql server": "SQL Server", "mongodb": "MongoDB", "redis": "Redis",
    "elasticsearch": "Elasticsearch", "kafka": "Kafka", "rabbitmq": "RabbitMQ",
    "sqs": "Amazon SQS", "messaging": "mensageria", "docker": "Docker",
    "kubernetes": "Kubernetes", "aws": "AWS", "azure": "Azure", "gcp": "GCP",
    "terraform": "Terraform", "ci/cd": "CI/CD", "observability": "observabilidade",
    "automated testing": "testes automatizados", "gradle": "Gradle",
    "maven": "Maven", "git": "Git", "linux": "Linux", "agile": "metodologias ágeis",
    "code review": "code review", "legacy code": "código legado",
    "migrations": "migrações e upgrades", "debugging": "debugging",
}


def display_name(technology: str) -> str:
    """Grafia correta de uma tecnologia para textos enviados a empresas."""
    key = (technology or "").strip().lower()
    return TECH_DISPLAY_NAMES.get(key, technology)


#: Tecnologias que, sozinhas, definem uma vaga como nao-backend.
FRONTEND_ONLY_TECHS = {"react", "angular", "vue"}

#: Tecnologias consideradas core de backend para o gate de "vaga backend".
BACKEND_SIGNALS = {
    "java", "kotlin", "spring", "spring boot", "python", "node.js", "go", "c#",
    "php", "ruby", "rest api", "microservices", "distributed systems", "sql",
    "postgresql", "mysql", "oracle", "sql server", "mongodb", "kafka",
    "rabbitmq", "messaging", "quarkus", "micronaut", "hibernate", "graphql", "grpc",
}

# --------------------------------------------------------------------------
SENIORITY_PATTERNS: list[tuple[Seniority, list[str]]] = [
    # Ordem importa: os niveis mais altos sao testados primeiro para que
    # "senior engineering manager" nao caia em "engineer".
    (Seniority.MANAGER, ["engineering manager", "gerente de engenharia", "head of engineering", "director", "diretor", "vp of engineering"]),
    (Seniority.PRINCIPAL, ["principal engineer", "principal software", "engenheiro principal"]),
    (Seniority.STAFF, ["staff engineer", "staff software", "senior staff"]),
    (Seniority.LEAD, ["tech lead", "technical lead", "team lead", "lead engineer", "lead software", "lider tecnico", "tecnico lider"]),
    (Seniority.SENIOR, ["senior", "senior", "sr.", "sr ", "especialista", "specialist iii"]),
    (Seniority.MID, ["mid-level", "mid level", "midlevel", "pleno", "plena", "intermediate", "level ii", "ii)", "engineer ii", "developer ii"]),
    (Seniority.ASSOCIATE, ["associate", "associado"]),
    (Seniority.JUNIOR, ["junior", "junior", "jr.", "jr ", "entry level", "entry-level", "iniciante", "level i", "engineer i", "developer i"]),
    (Seniority.INTERN, ["intern", "internship", "estagio", "estagiario", "trainee", "aprendiz"]),
]

REMOTE_TERMS = ["remote", "remoto", "100% remoto", "fully remote", "work from home", "home office", "anywhere", "teletrabalho", "trabalho remoto"]
HYBRID_TERMS = ["hybrid", "hibrido", "semi-presencial", "semipresencial", "flexible location"]
ONSITE_TERMS = ["on-site", "onsite", "presencial", "in office", "in-office", "no escritorio"]

BRAZIL_TERMS = ["brazil", "brasil", "br)", "sao paulo", "rio de janeiro", "belo horizonte", "curitiba", "porto alegre", "recife", "florianopolis", "campinas"]
LATAM_TERMS = ["latam", "latin america", "america latina", "south america", "america do sul"]
GLOBAL_TERMS = ["worldwide", "anywhere", "global", "any location", "remote - global", "emea/latam"]

#: Regioes que explicitamente EXCLUEM o Brasil.
EXCLUSIVE_REGION_TERMS = [
    "us only", "usa only", "united states only", "us-based only", "must be located in the us",
    "eu only", "europe only", "uk only", "canada only", "authorized to work in the united states",
    "us citizens only", "must reside in the united states", "emea only", "apac only", "india only",
]


def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def normalize_text(text: str) -> str:
    """Minusculas, sem acento, espacos colapsados. Base de toda comparacao."""
    if not text:
        return ""
    text = strip_accents(text.lower())
    text = re.sub(r"<[^>]+>", " ", text)          # remove HTML
    text = re.sub(r"&[a-z]+;|&#\d+;", " ", text)  # entidades HTML
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def detect_technologies(*texts: str) -> list[str]:
    """Tecnologias mencionadas, em nomes canonicos e ordem estavel."""
    blob = " " + normalize_text(" ".join(t for t in texts if t)) + " "
    found: list[str] = []
    for canonical, synonyms in TECH_VOCABULARY.items():
        for syn in synonyms:
            token = normalize_text(syn)
            if not token:
                continue
            # Fronteira de palavra quando o termo e alfanumerico; substring
            # simples quando contem simbolos (ex.: "c#", "ci/cd", "node.js").
            if re.fullmatch(r"[a-z0-9 ]+", token):
                pattern = r"(?<![a-z0-9])" + re.escape(token) + r"(?![a-z0-9])"
                hit = re.search(pattern, blob) is not None
            else:
                hit = token in blob
            if hit:
                found.append(canonical)
                break
    return found


def detect_seniority(title: str, description: str = "") -> Seniority:
    """Nivel da vaga. O titulo tem precedencia sobre a descricao."""
    for source in (normalize_text(title), normalize_text(description)):
        if not source:
            continue
        padded = f" {source} "
        for level, terms in SENIORITY_PATTERNS:
            for term in terms:
                if normalize_text(term) in padded:
                    return level
    return Seniority.UNKNOWN


def detect_modality(*texts: str) -> Modality:
    """Modalidade. 'Remote' explicito vence 'hibrido' mencionado de passagem."""
    blob = normalize_text(" ".join(t for t in texts if t))
    if not blob:
        return Modality.UNKNOWN
    has_remote = any(normalize_text(t) in blob for t in REMOTE_TERMS)
    has_hybrid = any(normalize_text(t) in blob for t in HYBRID_TERMS)
    has_onsite = any(normalize_text(t) in blob for t in ONSITE_TERMS)
    if has_hybrid:
        return Modality.HYBRID
    if has_remote:
        return Modality.REMOTE
    if has_onsite:
        return Modality.ONSITE
    return Modality.UNKNOWN


def accepts_brazil(location: str, description: str = "") -> bool | None:
    """A vaga aceita alguem no Brasil? None = nao foi possivel determinar."""
    blob = normalize_text(f"{location} {description}")
    if not blob:
        return None
    if any(normalize_text(t) in blob for t in BRAZIL_TERMS + LATAM_TERMS):
        return True
    if any(normalize_text(t) in blob for t in EXCLUSIVE_REGION_TERMS):
        return False
    if any(normalize_text(t) in blob for t in GLOBAL_TERMS):
        return True
    return None


# --- anos de experiencia exigidos -----------------------------------------
_YEARS_PATTERNS = [
    r"(\d{1,2})\s*\+?\s*(?:a|to|-|ate)\s*(\d{1,2})\s*(?:\+)?\s*(?:years?|anos?)",
    r"(?:at least|minimo de|no minimo|pelo menos|minimum of)\s*(\d{1,2})\s*(?:\+)?\s*(?:years?|anos?)",
    r"(\d{1,2})\s*\+\s*(?:years?|anos?)",
    r"(\d{1,2})\s*(?:years?|anos?)\s*(?:\+)?\s*(?:of\s+)?(?:experience|experiencia|de experiencia)",
]


def extract_years_required(description: str) -> float | None:
    """Menor numero de anos exigido mencionado, ou None se nao houver.

    Pegamos o MENOR valor de proposito: descricoes costumam listar varios
    requisitos ("3+ anos de Java, 5+ anos de cloud") e o piso de entrada e o
    que realmente define se a vaga esta fora de alcance.
    """
    blob = normalize_text(description)
    if not blob:
        return None
    candidates: list[float] = []
    for pattern in _YEARS_PATTERNS:
        for match in re.finditer(pattern, blob):
            groups = [g for g in match.groups() if g]
            if groups:
                candidates.append(float(groups[0]))
    # Descarta valores implausiveis (ex.: "2024 anos" de um parse ruim).
    candidates = [c for c in candidates if 0 < c <= 25]
    return min(candidates) if candidates else None


def extract_requirements(description: str, max_items: int = 25) -> list[str]:
    """Bullets da secao de requisitos. Heuristica, mas conservadora."""
    if not description:
        return []
    text = re.sub(r"<li[^>]*>", "\n- ", description, flags=re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</?(p|div|ul|ol|h\d)[^>]*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    lines = [re.sub(r"\s+", " ", ln).strip(" \t-•*·–—") for ln in text.split("\n")]
    bullets = [ln for ln in lines if 15 <= len(ln) <= 300]
    seen: set[str] = set()
    out: list[str] = []
    for b in bullets:
        key = normalize_text(b)
        if key not in seen:
            seen.add(key)
            out.append(b)
    return out[:max_items]


def is_backend_relevant(title: str, description: str, technologies: list[str]) -> bool:
    """A vaga tem desenvolvimento backend significativo?

    Usado como filtro suave: vagas so-frontend ou so-infra/suporte perdem
    prioridade, mas nunca desaparecem sem registro do motivo.
    """
    techs = set(technologies)
    if techs & BACKEND_SIGNALS:
        return True
    blob = normalize_text(f"{title} {description}")
    backend_words = ["backend", "back-end", "back end", "server-side", "server side", "api", "software engineer", "desenvolvedor", "developer", "engenheiro de software"]
    return any(w in blob for w in backend_words)


def is_support_or_infra_only(title: str, description: str, technologies: list[str]) -> bool:
    """Vaga de suporte/infra SEM desenvolvimento de software relevante."""
    blob = normalize_text(f"{title} {description}")
    support_titles = ["technical support", "suporte tecnico", "help desk", "helpdesk", "service desk", "analista de suporte", "sysadmin", "system administrator", "administrador de sistemas", "noc analyst", "operador de"]
    if not any(t in blob for t in support_titles):
        return False
    dev_words = ["develop", "desenvolv", "coding", "programa", "software engineer", "backend", "api"]
    strong_dev = any(w in blob for w in dev_words) and bool(set(technologies) & BACKEND_SIGNALS)
    return not strong_dev
