pipeline {
  agent any

  // Doit correspondre au nom défini dans Manage Jenkins > Tools
  tools { nodejs 'Node20' }

  // Une variable d'env safe (évite le bloc environment vide)
  environment { NEXT_TELEMETRY_DISABLED = '1' }

  options { timestamps() } // Ajoute l’horodatage dans la console

  stages {
    stage('Hello') {
      steps {
        echo 'Hello World!'
      }
    }

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps { sh 'npm ci' }
    }

    stage('Lint') {
      steps { sh 'npm run -s lint || true' }
    }

    stage('Build') {
      steps { sh 'npm run -s build' }
    }

    stage('Archive build (optionnel)') {
      when { expression { fileExists('.next') } }
      steps {
        archiveArtifacts artifacts: '.next/**', allowEmptyArchive: true, fingerprint: true
      }
    }
  }

  post {
    success { echo '✅ Build OK' }
    failure { echo '🚨 Build failed' }
  }
}
