pipeline {
  agent any

  tools {
    nodejs 'Node20'
  }

  environment {
    NEXT_PUBLIC_SUPABASE_URL      = credentials('supabase-url')
    NEXT_PUBLIC_SUPABASE_ANON_KEY = credentials('supabase-anon')
    CI = 'true'
  }

  options {
    timestamps()
    // ansiColor('xterm') // <- à remettre après installation du plugin AnsiColor
  }

  stages {
    stage('Hello') {
      steps { echo 'Hello World!' }
    }
    stage('Checkout') { steps { checkout scm } }
    stage('Install')  { steps { sh 'npm ci' } }
    stage('Lint')     { steps { sh 'npm run -s lint || true' } }
    stage('Build')    { steps { sh 'npm run -s build' } }
    stage('Archive build (optionnel)') {
      when { expression { fileExists('out') || fileExists('.next') } }
      steps {
        sh 'tar -czf build-artifacts.tgz .next || true'
        archiveArtifacts artifacts: 'build-artifacts.tgz', fingerprint: true, onlyIfSuccessful: true
      }
    }
  }

  post {
    success { echo '✅ Build OK' }
    failure { echo '🚨 Build failed' }
    always  { echo '🧹 Fin du pipeline' }
  }
}
