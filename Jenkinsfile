pipeline {
  agent any

  tools {
    nodejs 'Node20'   // le nom exact que tu as configuré dans "Gérer Jenkins" > "Outils"
  }

  environment {
    // Récupère les secrets depuis les Credentials Jenkins
    NEXT_PUBLIC_SUPABASE_URL      = credentials('supabase-url')
    NEXT_PUBLIC_SUPABASE_ANON_KEY = credentials('supabase-anon')

    // Optionnel : évite l’invite interactive de Next lint si tu gardes le stage Lint
    CI = 'true'
  }

  options {
    timestamps()
    ansiColor('xterm')
  }

  stages {
    stage('Hello') {
      steps {
        echo 'Hello World!'
      }
    }

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    // Optionnel : si ton repo n’a pas encore de config ESLint,
    // ce stage peut afficher une invite. Tu peux le commenter pour l’instant.
    stage('Lint') {
      steps {
        sh 'npm run -s lint || true'
      }
    }

    stage('Build') {
      steps {
        // Next.js lira les variables ci-dessus depuis process.env
        sh 'npm run -s build'
      }
    }

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
