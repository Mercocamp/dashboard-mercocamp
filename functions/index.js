const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

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
 * CORRIGIDO para usar onCall com região explícita e paginação.
 */
exports.listUsers = functions
  .region('southamerica-east1') // Define a região explicitamente
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Faça login para continuar.');
    }
    // Verifica a custom claim 'isAdmin' no token do usuário
    if (context.auth.token.isAdmin !== true) {
      throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para executar esta ação.');
    }

    const users = [];
    let nextPageToken = undefined;

    try {
      // Loop para buscar todos os usuários, respeitando o limite de 1000 por chamada
      do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        users.push(...listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);

      // Busca os dados complementares do Firestore
      const firestoreSnap = await admin.firestore().collection('users').get();
      const firestoreDataMap = {};
      firestoreSnap.forEach(doc => {
        firestoreDataMap[doc.id] = doc.data();
      });

      // Combina os dados de Auth e Firestore
      const combinedUsers = users.map(user => {
        const firestoreInfo = firestoreDataMap[user.uid] || {};
        return {
          uid: user.uid,
          email: user.email,
          nome: firestoreInfo.nome || user.displayName || 'Nome não definido',
          isAdmin: firestoreInfo.isAdmin || false,
          permissoes: firestoreInfo.permissoes || {},
        };
      });

      logger.info(`Admin ${context.auth.token.email} listou ${combinedUsers.length} usuários.`);
      return { users: combinedUsers };

    } catch (error) {
      logger.error("Erro ao listar usuários:", error);
      throw new functions.https.HttpsError('internal', 'Ocorreu um erro ao buscar a lista de usuários.');
    }
  });
