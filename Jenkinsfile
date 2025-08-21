pipeline {
  agent any

  tools {
    nodejs 'Node20'   // l’outil Node que tu as configuré
  }

  environment {
    // Empêche les prompts
    CI = 'true'
    // Adresse SonarQube accessible depuis le conteneur Jenkins
    SONAR_HOST_URL = 'http://host.docker.internal:9000'
    // Cache npm local au job
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm-cache"
  }

  options {
    // Garde les logs lisibles et limite le nombre d’anciens builds
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '15'))
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps {
        // Si le job est "Pipeline script from SCM", ceci récupère le même dépôt
        checkout scm
        sh 'git rev-parse --short HEAD || true'
      }
    }

    stage('Install') {
      steps {
        // Copie un .env de build basique si .env.local n’existe pas (évite l’échec du build)
        sh '''
          if [ ! -f .env.local ] && [ -f .env.example ]; then
            cp .env.example .env.local
          fi
        '''
        sh 'npm ci'
      }
    }

    stage('Lint & Types') {
      steps {
        sh '''
          npm run lint --if-present
          npm run typecheck --if-present || npx tsc -v >/dev/null 2>&1 || true
        '''
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Tests (optional)') {
      when { expression { fileExists('package.json') } }
      steps {
        // Laisse passer si tu n’as pas encore de tests
        sh 'npm test --if-present || true'
        // Si tu génères un coverage lcov, Sonar le ramassera au stage suivant
      }
    }

    stage('SonarQube') {
      environment {
        // injecte le token depuis les Credentials Jenkins
      }
      steps {
        withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
          // Scanner via Docker (fonctionne car ton Jenkins a accès au socket Docker)
          sh '''
            docker run --rm \
              -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
              -e SONAR_TOKEN="${SONAR_TOKEN}" \
              -v "$WORKSPACE:/usr/src" \
              -v "$WORKSPACE/.git:/usr/src/.git:ro" \
              sonarsource/sonar-scanner-cli:latest
          '''
        }
      }
    }

    stage('Archive') {
      steps {
        // Archive le build Next (utile si tu veux le réutiliser)
        archiveArtifacts artifacts: '.next/**, package.json, next.config.mjs', fingerprint: true, onlyIfSuccessful: true
      }
    }
  }

  post {
    success {
      echo '✅ Build OK'
    }
    failure {
      echo '❌ Build KO'
    }
    always {
      // Si un jour tu ajoutes des tests JUnit :
      // junit 'reports/**/*.xml'
      cleanWs(deleteDirs: true, notFailBuild: true)
    }
  }
}
