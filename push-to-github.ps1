<#
  push-to-github.ps1
  Script PowerShell para inicializar git, commitar e dar push para um repositório remoto.

  Uso recomendado:
  - Configure um PAT como variável de ambiente `GITHUB_TOKEN` (recomendado) OU autentique via `gh auth login`.
  - Execute no diretório do projeto:

    $env:GITHUB_TOKEN = "seu_novo_token_aqui"
    .\push-to-github.ps1 -RepoUrl "https://github.com/viniciusjardel/pix-victor-farma.git"

  Observação: nunca cole tokens em chats ou serviços públicos.
#>

param(
  [string]$RepoUrl = "https://github.com/viniciusjardel/pix-victor-farma.git"
)

function Fail($msg) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail 'Git não encontrado no PATH. Instale Git antes de continuar.'
}

Write-Host 'Trabalhando no diretório:' (Get-Location)

try {
  if (-not (Test-Path .git)) {
    Write-Host 'Inicializando repositório git...'
    git init
  } else {
    Write-Host 'Repositório git já inicializado.'
  }

  # configura remote
  $remoteExists = $false
  try { git remote get-url origin > $null 2>&1; $remoteExists = $true } catch {}

  if (-not $remoteExists) {
    Write-Host "Adicionando remote origin -> $RepoUrl"
    git remote add origin $RepoUrl
  } else {
    Write-Host 'Remote origin já existe; atualizando URL para o destino fornecido.'
    git remote set-url origin $RepoUrl
  }

  # stage e commit apenas se houver mudanças
  $status = git status --porcelain
  if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host 'Nenhuma alteração para commitar.'
  } else {
    Write-Host 'Adicionando arquivos e criando commit...'
    git add .
    git commit -m "Initial commit: API PIX Mercado Pago"
  }

  # garantir branch main
  try {
    $current = git rev-parse --abbrev-ref HEAD
    if ($current -ne 'main') {
      Write-Host 'Definindo branch principal como main'
      git branch -M main
    }
  } catch {
    # se não houver commit, criar branch main
    Write-Host 'Criando branch main (primeiro commit)'
    git checkout -b main
  }

  # Autenticação via GitHub CLI com token (se variável estiver setada)
  if ($env:GITHUB_TOKEN) {
    if (Get-Command gh -ErrorAction SilentlyContinue) {
      Write-Host 'Autenticando via GitHub CLI usando variável GITHUB_TOKEN (não expondo token)'
      $secureToken = $env:GITHUB_TOKEN
      try {
        $secureToken | gh auth login --with-token
      } catch {
        Write-Host 'Falha ao autenticar via gh -- tente `gh auth login` manualmente.' -ForegroundColor Yellow
      }
    } else {
      Write-Host 'GitHub CLI (gh) não encontrado; pule a autenticação via CLI e use um helper de credenciais do Git.' -ForegroundColor Yellow
    }
  } else {
    Write-Host 'Variável GITHUB_TOKEN não definida. Certifique-se de executar `gh auth login` antes de dar push, se necessário.' -ForegroundColor Yellow
  }

  Write-Host 'Enviando para o repositório remoto...'
  git push -u origin main

  Write-Host 'Push concluído. Verifique o repositório remoto.' -ForegroundColor Green

} catch {
  Write-Host "Ocorreu um erro: $_" -ForegroundColor Red
  exit 1
}
