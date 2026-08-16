# Gerando o APK (Android)

O projeto usa [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/):
as pastas `android/` e `ios/` **não são versionadas** — elas são geradas na hora do build
a partir de `app.json` + `app.config.ts`. Você não precisa do Android Studio para gerar o APK
pela nuvem.

## Caminho rápido: EAS Build (recomendado)

Pré-requisitos: uma conta gratuita em [expo.dev](https://expo.dev) e Node 20+.

### 1. Linkar o projeto ao EAS (uma vez só)

```bash
npm ci
npx eas-cli@latest login
npx eas-cli@latest init
```

O `init` cria o projeto no servidor da Expo. Como este repo usa config dinâmica
(`app.config.ts`), a CLI **não consegue escrever sozinha** o id — ela vai imprimir
algo assim:

```
Cannot automatically write to dynamic config at: app.config.ts
Add the following to your Expo config:
{ "extra": { "eas": { "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" } } }
```

Copie esse bloco para o **`app.json`**, dentro de `"expo"` (o `app.config.ts` repassa
tudo do `app.json`, então basta colar lá):

```jsonc
{
  "expo": {
    "name": "IP Aldeia",
    // ...
    "extra": {
      "eas": {
        "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      }
    }
  }
}
```

### 2. Gerar o APK

```bash
npm run build:apk
```

(equivale a `eas build --platform android --profile preview`)

Na primeira execução a CLI pergunta sobre a **keystore de assinatura**. Responda
`Yes` para o EAS gerar e guardar uma para você — é o caminho mais simples e a
keystore fica salva na sua conta para os próximos builds.

O build roda na nuvem (~10–20 min). Ao terminar a CLI imprime um link de download
do `.apk`, que também fica em https://expo.dev/accounts/<sua-conta>/projects/ip-aldeia/builds.

### 3. Instalar no aparelho

Baixe o `.apk` pelo link (ou pelo QR Code que a CLI mostra) e instale.
Como não vem da Play Store, o Android vai pedir para permitir "instalar apps
de fontes desconhecidas".

## Perfis de build disponíveis

| Perfil           | Saída       | Uso                                          |
| ---------------- | ----------- | -------------------------------------------- |
| `development`    | APK         | Dev client, para rodar com `expo start`       |
| `preview`        | APK         | **Teste interno / distribuição direta**       |
| `production`     | AAB         | Upload na Google Play                         |
| `production-apk` | APK         | Release assinado de produção, sem passar pela Play |

Comandos: `npm run build:apk` (preview) e `npm run build:aab` (production).

## Versionamento

`eas.json` usa `"appVersionSource": "remote"` — o `versionCode` do Android é
gerenciado e incrementado automaticamente pelo EAS a cada build. Você só precisa
mexer no `version` (`1.0.0`) do `app.json` quando quiser mudar a versão visível
para o usuário.

## Build pelo GitHub Actions (opcional)

Existe o workflow `.github/workflows/build-android.yml`, disparado manualmente
em Actions → "Build Android (EAS)". Para usá-lo, crie um
[Access Token](https://expo.dev/settings/access-tokens) na Expo e adicione como
secret do repositório chamado `EXPO_TOKEN`.

## Build local (alternativa, exige Android SDK)

Se você tiver Android Studio / SDK e JDK 17 instalados:

```bash
npm run prebuild:android
cd android && ./gradlew assembleRelease
```

O APK sai em `android/app/build/outputs/apk/release/`. Note que esse build usa a
keystore de debug a menos que você configure a sua — para distribuir de verdade,
prefira o EAS.

## Checagens antes de buildar

```bash
npm run typecheck
npm run lint
```

## Pontos conhecidos (não bloqueiam o APK)

- **Login com Google não funciona no nativo.** `app/(auth)/login.tsx` usa
  `signInWithPopup`, que é uma API só de web. No APK apenas o login por e-mail/senha
  funciona. Corrigir exige `expo-auth-session` ou `@react-native-google-signin`.
- **Bundle grande.** Os três JSONs da Bíblia (~12 MB) entram direto no bundle JS.
  O app abre, mas o startup é lento e o consumo de memória é alto em aparelhos
  fracos. Vale mover para asset baixado sob demanda ou API remota.
