import jenkins.model.*
import hudson.security.*

// Crée un utilisateur admin2/Admin123! et bascule sur le realm interne si besoin
def j = Jenkins.get()
def realm = j.getSecurityRealm()
if (!(realm instanceof HudsonPrivateSecurityRealm)) {
  realm = new HudsonPrivateSecurityRealm(false) // base d’utilisateurs interne
  j.setSecurityRealm(realm)
}

// crée admin2 si absent (ne touche pas à 'admin')
def username = "admin2"
def password = "Admin123!"
if (realm.getAllUsers().find { it.id == username } == null) {
  realm.createAccount(username, password)
}

// autorisation simple : plein accès une fois connecté
j.setAuthorizationStrategy(new FullControlOnceLoggedInAuthorizationStrategy())
j.save()
