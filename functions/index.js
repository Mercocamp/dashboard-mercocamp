const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");
const cors = require("cors")({ origin: true });

admin.initializeApp();

exports.setAdminClaim = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const userData = change.after.data();
    if (!userData) {
      return null;
    }
    const isAdmin = userData.isAdmin === true;
    try {
      const user = await admin.auth().getUser(uid);
      const currentClaims = user.customClaims || {};
      if (currentClaims.isAdmin === isAdmin) {
        return null;
      }
      await admin.auth().setCustomUserClaims(uid, { ...currentClaims, isAdmin: isAdmin });
      logger.info(`Claim 'isAdmin' definida como ${isAdmin} para o usuário ${uid}.`);
      return null;
    } catch (error) {
      logger.error(`Erro ao definir custom claim para o usuário ${uid}:`, error);
      return null;
    }
  });

/**
 * Lista todos os usuários.
 * Convertido para onRequest para controle manual de CORS.
 */
exports.listUsers = functions.https.onRequest((request, response) => {
  // Envolve a função com o handler do CORS
  cors(request, response, async () => {
    try {
      // 1. Verifica o token de autenticação do cabeçalho
      const idToken = request.headers.authorization?.split('Bearer ')[1];
      if (!idToken) {
        logger.warn("Chamada não autenticada para listUsers.");
        response.status(403).send({ error: "Não autorizado." });
        return;
      }

      // 2. Verifica se o token é válido e se o usuário é admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      if (!decodedToken.isAdmin) {
        logger.warn(`Usuário ${decodedToken.email} sem permissão de admin tentou listar usuários.`);
        response.status(403).send({ error: "Permissão negada." });
        return;
      }

      // 3. Lógica original para buscar e combinar usuários
      const listUsersResult = await admin.auth().listUsers(1000);
      const authUsers = listUsersResult.users;

      const usersCollection = await admin.firestore().collection('users').get();
      const firestoreUsers = {};
      usersCollection.forEach(doc => {
        firestoreUsers[doc.id] = doc.data();
      });

      const combinedUsers = authUsers.map(authUser => {
        const firestoreData = firestoreUsers[authUser.uid] || {};
        return {
          uid: authUser.uid,
          email: authUser.email,
          nome: firestoreData.nome || authUser.displayName || 'Nome não definido',
          isAdmin: firestoreData.isAdmin || false,
          permissoes: firestoreData.permissoes || {},
        };
      });

      logger.info(`Admin ${decodedToken.email} listou ${combinedUsers.length} usuários.`);
      response.status(200).send(combinedUsers);

    } catch (error) {
      logger.error("Erro em listUsers:", error);
      response.status(500).send({ error: "Erro interno do servidor." });
    }
  });
});
